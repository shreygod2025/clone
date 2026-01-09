import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Filter, Eye, Edit2, Phone, Mail, MapPin, Calendar, Clock } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-100 text-purple-700' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-100 text-slate-600' },
];

const AdminStudentCRM = () => {
  const { getAuthHeaders } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ status: '', notes: '', demo_date: '', demo_time: '' });

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await axios.get(`${API}/students/inquiries${params}`, {
        headers: getAuthHeaders()
      });
      setInquiries(response.data);
    } catch (error) {
      toast.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await axios.patch(`${API}/students/inquiry/${selectedInquiry.id}`, editData, {
        headers: getAuthHeaders()
      });
      toast.success('Updated successfully');
      setEditMode(false);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const filteredInquiries = inquiries.filter(inq =>
    inq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inq.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inq.phone.includes(searchQuery)
  );

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  return (
    <AdminLayout title="Student CRM">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="student-search"
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

      {/* Table */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500">No student inquiries found</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-medium text-slate-600">Name</th>
                  <th className="text-left p-4 font-medium text-slate-600">Contact</th>
                  <th className="text-left p-4 font-medium text-slate-600">Skill</th>
                  <th className="text-left p-4 font-medium text-slate-600">Mode</th>
                  <th className="text-left p-4 font-medium text-slate-600">Status</th>
                  <th className="text-left p-4 font-medium text-slate-600">Demo</th>
                  <th className="text-left p-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInquiries.map((inquiry) => (
                  <tr key={inquiry.id} className="hover:bg-slate-50" data-testid={`inquiry-row-${inquiry.id}`}>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-[#1E3A5F]">{inquiry.name}</p>
                        <p className="text-sm text-slate-500">{inquiry.learner_type === 'self' ? 'Self' : 'Parent'}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="flex items-center gap-1 text-slate-600">
                          <Mail className="w-3 h-3" /> {inquiry.email}
                        </p>
                        <p className="flex items-center gap-1 text-slate-600">
                          <Phone className="w-3 h-3" /> {inquiry.phone}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="capitalize">{inquiry.skill}</span>
                    </td>
                    <td className="p-4">
                      <span className="capitalize">{inquiry.learning_mode}</span>
                    </td>
                    <td className="p-4">{getStatusBadge(inquiry.status)}</td>
                    <td className="p-4">
                      {inquiry.demo_date ? (
                        <div className="text-sm">
                          <p className="flex items-center gap-1 text-slate-600">
                            <Calendar className="w-3 h-3" /> {inquiry.demo_date}
                          </p>
                          <p className="flex items-center gap-1 text-slate-600">
                            <Clock className="w-3 h-3" /> {inquiry.demo_time}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">Not scheduled</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setEditMode(false);
                          }}
                          data-testid={`view-inquiry-${inquiry.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedInquiry(inquiry);
                            setEditData({
                              status: inquiry.status,
                              notes: inquiry.notes || '',
                              demo_date: inquiry.demo_date || '',
                              demo_time: inquiry.demo_time || ''
                            });
                            setEditMode(true);
                          }}
                          data-testid={`edit-inquiry-${inquiry.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
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

      {/* Detail/Edit Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit Inquiry' : 'Inquiry Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">Name</label>
                      <p className="font-medium text-[#1E3A5F]">{selectedInquiry.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Status</label>
                      <p>{getStatusBadge(selectedInquiry.status)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Email</label>
                      <p className="text-slate-600">{selectedInquiry.email}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Phone</label>
                      <p className="text-slate-600">{selectedInquiry.phone}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Skill</label>
                      <p className="text-slate-600 capitalize">{selectedInquiry.skill}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Mode</label>
                      <p className="text-slate-600 capitalize">{selectedInquiry.learning_mode}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">City</label>
                      <p className="text-slate-600">{selectedInquiry.city}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Goal</label>
                      <p className="text-slate-600 capitalize">{selectedInquiry.learning_goal}</p>
                    </div>
                  </div>
                  {selectedInquiry.notes && (
                    <div>
                      <label className="text-sm text-slate-500">Notes</label>
                      <p className="text-slate-600">{selectedInquiry.notes}</p>
                    </div>
                  )}
                  <Button 
                    onClick={() => {
                      setEditData({
                        status: selectedInquiry.status,
                        notes: selectedInquiry.notes || '',
                        demo_date: selectedInquiry.demo_date || '',
                        demo_time: selectedInquiry.demo_time || ''
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
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Demo Date</label>
                      <Input
                        type="date"
                        value={editData.demo_date}
                        onChange={(e) => setEditData({...editData, demo_date: e.target.value})}
                        data-testid="edit-demo-date"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Demo Time</label>
                      <Input
                        type="time"
                        value={editData.demo_time}
                        onChange={(e) => setEditData({...editData, demo_time: e.target.value})}
                        data-testid="edit-demo-time"
                      />
                    </div>
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

export default AdminStudentCRM;
