import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Edit2, User, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'reviewed', label: 'Reviewed', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'interview_scheduled', label: 'Interview Scheduled', color: 'bg-purple-100 text-purple-700' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
];

const AdminEducators = () => {
  const { getAuthHeaders } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedApp, setSelectedApp] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ status: '', notes: '' });

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await axios.get(`${API}/educators/applications${params}`, {
        headers: getAuthHeaders()
      });
      setApplications(response.data);
    } catch (error) {
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.patch(`${API}/educators/application/${selectedApp.id}`, editData, {
        headers: getAuthHeaders()
      });
      toast.success('Updated successfully');
      setEditMode(false);
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const filteredApplications = applications.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  return (
    <AdminLayout title="Educator Applications">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, email, or skill..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="educator-search"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="status-filter"
        >
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No educator applications found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApplications.map((app) => (
            <div 
              key={app.id} 
              className="pipeline-card"
              data-testid={`educator-card-${app.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center text-white font-semibold">
                    {app.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1E3A5F]">{app.name}</h3>
                    <p className="text-sm text-slate-500">{app.city}</p>
                  </div>
                </div>
                {getStatusBadge(app.status)}
              </div>
              
              <div className="space-y-1 text-sm text-slate-500 mb-3">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {app.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {app.phone}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {app.skills.map((skill, idx) => (
                  <span key={idx} className="px-2 py-1 bg-[#D63031]/10 rounded text-xs text-[#D63031]">
                    {skill}
                  </span>
                ))}
              </div>

              {app.demo_ready && (
                <p className="text-sm text-green-600 flex items-center gap-1 mb-3">
                  <CheckCircle className="w-4 h-4" /> Demo Ready
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedApp(app);
                    setEditMode(false);
                  }}
                  data-testid={`view-educator-${app.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedApp(app);
                    setEditData({
                      status: app.status,
                      notes: app.notes || ''
                    });
                    setEditMode(true);
                  }}
                  data-testid={`edit-educator-${app.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail/Edit Dialog */}
      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit Application' : 'Application Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">Name</label>
                      <p className="font-medium text-[#1E3A5F]">{selectedApp.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Status</label>
                      <p>{getStatusBadge(selectedApp.status)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Email</label>
                      <p className="text-slate-600">{selectedApp.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Phone</label>
                      <p className="text-slate-600">{selectedApp.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">City</label>
                      <p className="text-slate-600">{selectedApp.city}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Availability</label>
                      <p className="text-slate-600">{selectedApp.availability}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Skills</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApp.skills.map((skill, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#D63031]/10 rounded text-xs text-[#D63031]">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Grades Comfortable With</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedApp.grades_comfortable.map((grade, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F]">
                          {grade}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Experience</label>
                    <p className="text-slate-600">{selectedApp.experience || 'Not provided'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-500">Demo Ready:</label>
                    {selectedApp.demo_ready ? (
                      <span className="text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" /> Yes
                      </span>
                    ) : (
                      <span className="text-slate-400">No</span>
                    )}
                  </div>
                  {selectedApp.notes && (
                    <div>
                      <label className="text-sm text-slate-500">Notes</label>
                      <p className="text-slate-600">{selectedApp.notes}</p>
                    </div>
                  )}
                  <Button 
                    onClick={() => {
                      setEditData({
                        status: selectedApp.status,
                        notes: selectedApp.notes || ''
                      });
                      setEditMode(true);
                    }}
                    className="btn-primary w-full"
                    data-testid="switch-to-edit"
                  >
                    Edit
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({...editData, status: e.target.value})}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                      data-testid="edit-status"
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      placeholder="Add notes..."
                      className="min-h-[100px]"
                      data-testid="edit-notes"
                    />
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => setEditMode(false)} 
                      className="flex-1"
                      data-testid="cancel-edit"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleUpdate} 
                      className="btn-primary flex-1"
                      data-testid="save-edit"
                    >
                      Save Changes
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEducators;
