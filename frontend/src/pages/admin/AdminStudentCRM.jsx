import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Calendar, Clock, Plus, ChevronRight, MessageSquare, Archive, CalendarClock, CheckCircle2, X, User, Mail, MapPin, Target, BookOpen } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
const AGE_GROUPS = ['6-8 years', '9-12 years', '13-16 years', '17+ years'];
const LEARNING_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline_home', label: 'Offline at Home' },
  { value: 'offline_center', label: 'Offline at Center' },
];
const LEARNING_GOALS = [
  { value: 'career', label: 'Career Preparation' },
  { value: 'skill_building', label: 'Skill Building' },
  { value: 'competition', label: 'Competition Prep' },
  { value: 'fun', label: 'Fun Learning' },
];

const AdminStudentCRM = () => {
  const { getAuthHeaders } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  
  // Modal states
  const [viewInquiry, setViewInquiry] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', reason: '' });
  const [convertData, setConvertData] = useState({ amount: '', sessions: '' });
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    email: '',
    skill: '',
    city: '',
    age_group: '',
    learning_mode: 'online',
    learning_goal: '',
    demo_date: null,
    demo_time: '',
    address: '',
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

  const handleStatusChange = async (inquiry, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/students/inquiry/${inquiry.id}`, { 
        status: newStatus,
        ...additionalData
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Status updated successfully`);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDemoCompleted = async (inquiry) => {
    await handleStatusChange(inquiry, 'demo_completed');
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showRescheduleModal.id}`, {
        demo_date: format(rescheduleData.date, 'yyyy-MM-dd'),
        demo_time: rescheduleData.time,
        notes: showRescheduleModal.notes 
          ? `${showRescheduleModal.notes}\n\nRescheduled: ${rescheduleData.reason}` 
          : `Rescheduled: ${rescheduleData.reason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Demo rescheduled successfully');
      setShowRescheduleModal(null);
      setRescheduleData({ date: null, time: '', reason: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  const handleConvert = async () => {
    if (!convertData.amount || !convertData.sessions) {
      toast.error('Please enter amount and number of sessions');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showConvertModal.id}`, {
        status: 'converted',
        conversion_amount: convertData.amount,
        sessions_count: convertData.sessions,
        notes: showConvertModal.notes 
          ? `${showConvertModal.notes}\n\nConverted: ₹${convertData.amount} for ${convertData.sessions} sessions` 
          : `Converted: ₹${convertData.amount} for ${convertData.sessions} sessions`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead converted successfully!');
      setShowConvertModal(null);
      setConvertData({ amount: '', sessions: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to convert');
    }
  };

  const handleArchive = async (inquiry) => {
    await handleStatusChange(inquiry, 'archived');
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
        demo_date: newLead.demo_date ? format(newLead.demo_date, 'yyyy-MM-dd') : null,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({
        name: '',
        phone: '',
        email: '',
        skill: '',
        city: '',
        age_group: '',
        learning_mode: 'online',
        learning_goal: '',
        demo_date: null,
        demo_time: '',
        address: '',
        source: 'manual',
        notes: ''
      });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };
      setNewLead({ name: '', phone: '', email: '', skill: '', city: '', learning_mode: 'online', source: 'manual', notes: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone?.includes(searchQuery);
    const matchesSection = inq.status === activeSection;
    return matchesSearch && matchesSection;
  });

  const getCount = (status) => inquiries.filter(i => i.status === status).length;

  // Render action buttons based on status
  const renderActionButtons = (inquiry) => {
    switch (inquiry.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleDemoCompleted(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`demo-completed-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Demo Completed
            </button>
            <button
              onClick={() => {
                setShowRescheduleModal(inquiry);
                setRescheduleData({ date: null, time: '', reason: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${inquiry.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule Demo
            </button>
            <button
              onClick={() => handleArchive(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${inquiry.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'demo_completed':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => {
                setShowConvertModal(inquiry);
                setConvertData({ amount: '', sessions: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Converted
            </button>
            <button
              onClick={() => handleArchive(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${inquiry.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'converted':
      case 'archived':
        return null; // No action buttons for converted/archived
      
      default:
        return null;
    }
  };

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

              <div className="space-y-1 text-sm text-slate-600 mb-3">
                {inquiry.skill && (
                  <p><span className="text-slate-400">Skill:</span> {inquiry.skill}</p>
                )}
                {inquiry.learning_mode && (
                  <p>
                    <span className="text-slate-400">Mode:</span>{' '}
                    <span className={`font-medium ${inquiry.learning_mode === 'offline' ? 'text-[#D63031]' : 'text-[#1E3A5F]'}`}>
                      {inquiry.learning_mode === 'offline' ? 'Offline' : 'Online'}
                    </span>
                    {inquiry.learning_mode === 'offline' && inquiry.city && (
                      <span className="text-slate-500"> • {inquiry.city}</span>
                    )}
                  </p>
                )}
                {inquiry.demo_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Demo: {inquiry.demo_date} {inquiry.demo_time && `at ${inquiry.demo_time}`}
                  </p>
                )}
                {inquiry.conversion_amount && (
                  <p className="text-green-600 font-medium">
                    ₹{inquiry.conversion_amount} • {inquiry.sessions_count} sessions
                  </p>
                )}
              </div>

              {/* Comments shown outside */}
              {inquiry.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Comments
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-line">{inquiry.notes}</p>
                </div>
              )}

              {/* View Button */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewInquiry(inquiry)}
                  data-testid={`view-inquiry-${inquiry.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
              </div>

              {/* Action Buttons based on status */}
              {renderActionButtons(inquiry)}
            </div>
          ))}
        </div>
      )}

      {/* View Details Dialog */}
      <Dialog open={!!viewInquiry} onOpenChange={() => setViewInquiry(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#1E3A5F]" />
              {viewInquiry?.name}
            </DialogTitle>
          </DialogHeader>
          {viewInquiry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Phone</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                    <Phone className="w-4 h-4" /> {viewInquiry.phone}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Email</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                    <Mail className="w-4 h-4" /> {viewInquiry.email || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Skill Interest</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                    <BookOpen className="w-4 h-4" /> {viewInquiry.skill || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Learning Mode</p>
                  <p className={`font-medium flex items-center gap-1 ${viewInquiry.learning_mode === 'offline' ? 'text-[#D63031]' : 'text-[#1E3A5F]'}`}>
                    <MapPin className="w-4 h-4" /> 
                    {viewInquiry.learning_mode === 'offline' ? `Offline - ${viewInquiry.city}` : 'Online'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Learner Type</p>
                  <p className="font-medium text-[#1E3A5F]">{viewInquiry.learner_type || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Age Group</p>
                  <p className="font-medium text-[#1E3A5F]">{viewInquiry.age_group || 'N/A'}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Learning Goal</p>
                  <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                    <Target className="w-4 h-4" /> {viewInquiry.learning_goal || 'N/A'}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 mb-1">Source</p>
                  <p className="font-medium text-[#1E3A5F]">{viewInquiry.source || 'website'}</p>
                </div>
              </div>

              {viewInquiry.demo_date && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs text-blue-500 mb-1">Demo Scheduled</p>
                  <p className="font-medium text-blue-700 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> 
                    {viewInquiry.demo_date} {viewInquiry.demo_time && `at ${viewInquiry.demo_time}`}
                  </p>
                </div>
              )}

              {viewInquiry.conversion_amount && (
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-xs text-green-500 mb-1">Conversion Details</p>
                  <p className="font-medium text-green-700">
                    ₹{viewInquiry.conversion_amount} for {viewInquiry.sessions_count} sessions
                  </p>
                </div>
              )}

              {viewInquiry.notes && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <p className="text-xs text-amber-500 mb-1">Notes / Comments</p>
                  <p className="text-amber-900 whitespace-pre-line">{viewInquiry.notes}</p>
                </div>
              )}

              <div className="pt-4 border-t">
                <p className="text-xs text-slate-400">
                  Status: <span className="font-medium text-[#1E3A5F] capitalize">{viewInquiry.status?.replace('_', ' ')}</span>
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Demo Modal */}
      <Dialog open={!!showRescheduleModal} onOpenChange={() => setShowRescheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Demo - {showRescheduleModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select New Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={rescheduleData.date}
                  onSelect={(date) => setRescheduleData({...rescheduleData, date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                  className="rounded-xl border border-slate-200"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      rescheduleData.time === time 
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setRescheduleData({...rescheduleData, time})}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Rescheduling</label>
              <Textarea
                placeholder="Enter reason..."
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRescheduleModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleReschedule} className="btn-primary flex-1">
                Reschedule Demo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={!!showConvertModal} onOpenChange={() => setShowConvertModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert Lead - {showConvertModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={convertData.amount}
                onChange={(e) => setConvertData({...convertData, amount: e.target.value})}
                data-testid="convert-amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Number of Sessions</label>
              <Input
                type="number"
                placeholder="Enter number of sessions"
                value={convertData.sessions}
                onChange={(e) => setConvertData({...convertData, sessions: e.target.value})}
                data-testid="convert-sessions"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowConvertModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConvert} className="btn-primary flex-1">
                Convert Lead
              </Button>
            </div>
          </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Learning Mode</label>
                <select
                  value={newLead.learning_mode}
                  onChange={(e) => setNewLead({...newLead, learning_mode: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-mode"
                >
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
            {newLead.learning_mode === 'offline' && (
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
            )}
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
