import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Edit2, Building2, Mail, Phone, MapPin } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-700' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'meeting_scheduled', label: 'Meeting Scheduled', color: 'bg-purple-100 text-purple-700' },
  { value: 'proposal_sent', label: 'Proposal Sent', color: 'bg-orange-100 text-orange-700' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Closed', color: 'bg-slate-100 text-slate-600' },
];

const AdminSchoolCRM = () => {
  const { getAuthHeaders } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ status: '', notes: '', meeting_date: '' });

  useEffect(() => {
    fetchInquiries();
  }, [statusFilter]);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? `?status=${statusFilter}` : '';
      const response = await axios.get(`${API}/schools/inquiries${params}`, {
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
      await axios.patch(`${API}/schools/inquiry/${selectedInquiry.id}`, editData, {
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
    inq.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inq.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inq.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const statusObj = STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
    return <span className={`badge-status ${statusObj.color}`}>{statusObj.label}</span>;
  };

  return (
    <AdminLayout title="School CRM">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by school name, contact, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="school-search"
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
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No school inquiries found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className="pipeline-card"
              data-testid={`school-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1E3A5F] line-clamp-1">{inquiry.school_name}</h3>
                    <p className="text-sm text-slate-500">{inquiry.contact_name}</p>
                  </div>
                </div>
                {getStatusBadge(inquiry.status)}
              </div>
              
              <div className="space-y-1 text-sm text-slate-500 mb-4">
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" /> {inquiry.email}
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4" /> {inquiry.phone}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> {inquiry.location}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {inquiry.programs_interested?.map((program, idx) => (
                  <span key={idx} className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600 capitalize">
                    {program}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedInquiry(inquiry);
                    setEditMode(false);
                  }}
                  data-testid={`view-school-${inquiry.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setSelectedInquiry(inquiry);
                    setEditData({
                      status: inquiry.status,
                      notes: inquiry.notes || '',
                      meeting_date: inquiry.meeting_date || ''
                    });
                    setEditMode(true);
                  }}
                  data-testid={`edit-school-${inquiry.id}`}
                >
                  <Edit2 className="w-4 h-4 mr-1" /> Edit
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail/Edit Dialog */}
      <Dialog open={!!selectedInquiry} onOpenChange={() => setSelectedInquiry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit School Inquiry' : 'School Inquiry Details'}
            </DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-500">School Name</label>
                      <p className="font-medium text-[#1E3A5F]">{selectedInquiry.school_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Status</label>
                      <p>{getStatusBadge(selectedInquiry.status)}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Contact Person</label>
                      <p className="text-slate-600">{selectedInquiry.contact_name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">School Size</label>
                      <p className="text-slate-600">{selectedInquiry.school_size}</p>
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
                      <label className="text-sm text-slate-500">Location</label>
                      <p className="text-slate-600">{selectedInquiry.location}</p>
                    </div>
                    <div>
                      <label className="text-sm text-slate-500">Fee Range</label>
                      <p className="text-slate-600">{selectedInquiry.fee_range}</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Programs Interested</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedInquiry.programs_interested?.map((p, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-500">Support Needed</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedInquiry.support_needed?.map((s, idx) => (
                        <span key={idx} className="px-2 py-1 bg-[#D63031]/10 rounded text-xs text-[#D63031] capitalize">
                          {s}
                        </span>
                      ))}
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
                        meeting_date: selectedInquiry.meeting_date || ''
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Date</label>
                    <Input
                      type="date"
                      value={editData.meeting_date}
                      onChange={(e) => setEditData({...editData, meeting_date: e.target.value})}
                      data-testid="edit-meeting-date"
                    />
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

export default AdminSchoolCRM;
