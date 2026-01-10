import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Edit2, Building2, Phone, MapPin, Plus, ChevronRight, MessageSquare, Calendar } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'meeting_done', label: 'Meeting Done', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'State Board', 'IB'];

const AdminSchoolCRM = () => {
  const { getAuthHeaders } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState({ status: '', notes: '', meeting_date: '' });
  const [newLead, setNewLead] = useState({
    school_name: '',
    contact_name: '',
    phone: '',
    location: '',
    board: '',
    source: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/schools/inquiries`, {
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
      setSelectedInquiry(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleStatusChange = async (inquiry, newStatus) => {
    try {
      await axios.patch(`${API}/schools/inquiry/${inquiry.id}`, { status: newStatus }, {
        headers: getAuthHeaders()
      });
      toast.success(`Moved to ${STATUS_SECTIONS.find(s => s.value === newStatus)?.label}`);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddLead = async () => {
    if (!newLead.school_name || !newLead.contact_name || !newLead.phone) {
      toast.error('School name, contact name and phone are required');
      return;
    }
    try {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: newLead.school_name,
        contact_name: newLead.contact_name,
        email: `${newLead.phone}@school.oll`,
        phone: newLead.phone,
        location: newLead.location,
        school_size: '',
        fee_range: '',
        board: newLead.board,
        programs_interested: [],
        support_needed: [],
        source: newLead.source,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({ school_name: '', contact_name: '', phone: '', location: '', board: '', source: 'manual', notes: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.school_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone.includes(searchQuery);
    const matchesSection = inq.status === activeSection;
    return matchesSearch && matchesSection;
  });

  const getCount = (status) => inquiries.filter(i => i.status === status).length;

  return (
    <AdminLayout title="School CRM">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by school name, contact or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="school-search"
          />
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
          data-testid="add-school-lead-btn"
        >
          <Plus className="w-4 h-4" /> Add Lead
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_SECTIONS.map(section => (
          <button
            key={section.value}
            onClick={() => setActiveSection(section.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSection === section.value
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`section-${section.value}`}
          >
            <span className={`w-2 h-2 rounded-full ${section.color}`} />
            {section.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeSection === section.value ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {getCount(section.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Lead Cards */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No leads in this section</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`school-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{inquiry.school_name}</h3>
                  <p className="text-sm text-slate-500">{inquiry.contact_name}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  inquiry.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {inquiry.source || 'website'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-4">
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {inquiry.phone}
                </p>
                {inquiry.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {inquiry.location}
                  </p>
                )}
                {inquiry.board && (
                  <p><span className="text-slate-400">Board:</span> {inquiry.board}</p>
                )}
                {inquiry.meeting_date && (
                  <p className="flex items-center gap-1 text-[#D63031] font-medium">
                    <Calendar className="w-3 h-3" />
                    Meeting: {inquiry.meeting_date}
                  </p>
                )}
              </div>

              {inquiry.programs_interested?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {inquiry.programs_interested.map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {inquiry.notes && (
                <div className="bg-slate-50 rounded-lg p-2 mb-4 text-sm text-slate-600">
                  <MessageSquare className="w-3 h-3 inline mr-1" />
                  {inquiry.notes.substring(0, 100)}{inquiry.notes.length > 100 ? '...' : ''}
                </div>
              )}

              <div className="flex gap-2 mb-3">
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

              {/* Move to Section Buttons */}
              <div className="flex gap-1 flex-wrap">
                {STATUS_SECTIONS.filter(s => s.value !== inquiry.status).map(section => (
                  <button
                    key={section.value}
                    onClick={() => handleStatusChange(inquiry, section.value)}
                    className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1"
                    data-testid={`move-school-to-${section.value}-${inquiry.id}`}
                  >
                    <ChevronRight className="w-3 h-3" />
                    {section.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editMode && selectedInquiry} onOpenChange={() => { setEditMode(false); setSelectedInquiry(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit - {selectedInquiry?.school_name}</DialogTitle>
          </DialogHeader>
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({...editData, status: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="edit-status"
                >
                  {STATUS_SECTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                  <option value="closed">Closed</option>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes / Comments</label>
                <Textarea
                  value={editData.notes}
                  onChange={(e) => setEditData({...editData, notes: e.target.value})}
                  placeholder="Add notes..."
                  className="min-h-[120px]"
                  data-testid="edit-notes"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => { setEditMode(false); setSelectedInquiry(null); }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button onClick={handleUpdate} className="btn-primary flex-1" data-testid="save-edit">
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New School Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Name *</label>
              <Input
                placeholder="School name"
                value={newLead.school_name}
                onChange={(e) => setNewLead({...newLead, school_name: e.target.value})}
                data-testid="new-school-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name *</label>
                <Input
                  placeholder="Contact person"
                  value={newLead.contact_name}
                  onChange={(e) => setNewLead({...newLead, contact_name: e.target.value})}
                  data-testid="new-school-contact"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  data-testid="new-school-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <select
                  value={newLead.location}
                  onChange={(e) => setNewLead({...newLead, location: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-school-city"
                >
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Board</label>
                <select
                  value={newLead.board}
                  onChange={(e) => setNewLead({...newLead, board: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-school-board"
                >
                  <option value="">Select board</option>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
              <select
                value={newLead.source}
                onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                data-testid="new-school-source"
              >
                <option value="manual">Manual Entry</option>
                <option value="referral">Referral</option>
                <option value="event">Event / Conference</option>
                <option value="cold_call">Cold Call</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <Textarea
                placeholder="Additional notes..."
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                className="min-h-[80px]"
                data-testid="new-school-notes"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLead} className="btn-primary flex-1" data-testid="save-new-school">
                Add Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSchoolCRM;
