import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Edit2, Phone, Mail, MapPin, Calendar, Clock, Plus, ChevronRight, MessageSquare } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
];

const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];

const AdminStudentCRM = () => {
  const { getAuthHeaders } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editData, setEditData] = useState({ status: '', notes: '', followup_date: '' });
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    skill: '',
    city: '',
    source: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/students/inquiries`, {
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
      setSelectedInquiry(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const handleStatusChange = async (inquiry, newStatus) => {
    try {
      await axios.patch(`${API}/students/inquiry/${inquiry.id}`, { status: newStatus }, {
        headers: getAuthHeaders()
      });
      toast.success(`Moved to ${STATUS_SECTIONS.find(s => s.value === newStatus)?.label}`);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await axios.post(`${API}/students/inquiry`, {
        ...newLead,
        email: newLead.email || `${newLead.phone}@manual.oll`,
        learner_type: 'self',
        age_group: '',
        learning_mode: '',
        learning_goal: '',
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({ name: '', phone: '', email: '', skill: '', city: '', source: 'manual', notes: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone.includes(searchQuery);
    const matchesSection = inq.status === activeSection;
    return matchesSearch && matchesSection;
  });

  const getCount = (status) => inquiries.filter(i => i.status === status).length;

  return (
    <AdminLayout title="Student CRM">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="student-search"
          />
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
          data-testid="add-lead-btn"
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
          <p className="text-slate-500">No leads in this section</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`inquiry-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{inquiry.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {inquiry.phone}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  inquiry.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {inquiry.source || 'website'}
                </span>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-4">
                {inquiry.skill && (
                  <p><span className="text-slate-400">Skill:</span> {inquiry.skill}</p>
                )}
                {inquiry.city && (
                  <p><span className="text-slate-400">City:</span> {inquiry.city}</p>
                )}
                {inquiry.demo_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Demo: {inquiry.demo_date} {inquiry.demo_time && `at ${inquiry.demo_time}`}
                  </p>
                )}
                {inquiry.followup_date && (
                  <p className="text-[#D63031] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Follow-up: {inquiry.followup_date}
                  </p>
                )}
              </div>

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
                      followup_date: inquiry.followup_date || ''
                    });
                    setEditMode(true);
                  }}
                  data-testid={`edit-inquiry-${inquiry.id}`}
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
                    data-testid={`move-to-${section.value}-${inquiry.id}`}
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
            <DialogTitle>Edit Lead - {selectedInquiry?.name}</DialogTitle>
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
              
              {editData.status === 'demo_completed' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Follow-up Date</label>
                  <Input
                    type="date"
                    value={editData.followup_date}
                    onChange={(e) => setEditData({...editData, followup_date: e.target.value})}
                    data-testid="edit-followup-date"
                  />
                </div>
              )}

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
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <Input
                  placeholder="Lead name"
                  value={newLead.name}
                  onChange={(e) => setNewLead({...newLead, name: e.target.value})}
                  data-testid="new-lead-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newLead.phone}
                  onChange={(e) => setNewLead({...newLead, phone: e.target.value})}
                  data-testid="new-lead-phone"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skill Interest</label>
                <select
                  value={newLead.skill}
                  onChange={(e) => setNewLead({...newLead, skill: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-skill"
                >
                  <option value="">Select skill</option>
                  {SKILLS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <select
                  value={newLead.city}
                  onChange={(e) => setNewLead({...newLead, city: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-city"
                >
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
              <select
                value={newLead.source}
                onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                data-testid="new-lead-source"
              >
                <option value="manual">Manual Entry</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="event">Event</option>
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
                data-testid="new-lead-notes"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLead} className="btn-primary flex-1" data-testid="save-new-lead">
                Add Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudentCRM;
