import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Building2, Phone, MapPin, Plus, MessageSquare, Calendar, Archive, CalendarClock, CheckCircle2, Video, Users, User, Mail, Layers, DollarSign, UserPlus, Send, Clock, Edit, Save, RefreshCw, X } from 'lucide-react';
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
  { value: 'meeting_done', label: 'Meeting Done', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-orange-500' },
  { value: 'active', label: 'Active Schools', color: 'bg-green-500' },
  { value: 'renewed', label: 'Renewed', color: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'State Board', 'IB'];
const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const AdminSchoolCRM = () => {
  const { getAuthHeaders, user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Modal states
  const [viewInquiry, setViewInquiry] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showFollowupModal, setShowFollowupModal] = useState(null);
  const [showOnboardModal, setShowOnboardModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ school_name: '', contact_name: '', phone: '', email: '', meeting_date: '', meeting_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', meeting_type: 'offline', reason: '' });
  const [convertData, setConvertData] = useState({ amount: '' });
  const [followupData, setFollowupData] = useState({ date: null, comment: '' });
  const [onboardData, setOnboardData] = useState({
    model: '',
    grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
    total_students: 0,
    total_amount: 0,
    school_contacts: [{ name: '', phone: '', email: '', role: '' }],
    payment_mode: 'monthly',
    contract_start: '',
    contract_end: '',
  });
  const [newLead, setNewLead] = useState({
    school_name: '',
    contact_name: '',
    phone: '',
    email: '',
    location: '',
    board: '',
    student_count: '',
    meeting_type: 'offline',
    meeting_date: null,
    meeting_time: '',
    source: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchInquiries();
    fetchTeamUsers();
  }, []);

  const fetchTeamUsers = async () => {
    try {
      const response = await axios.get(`${API}/team-users`, {
        headers: getAuthHeaders()
      });
      setTeamUsers(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team users:', error);
    }
  };

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

  const handleStatusChange = async (inquiry, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/schools/inquiry/${inquiry.id}`, { 
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

  const handleMeetingDone = async (inquiry) => {
    await handleStatusChange(inquiry, 'meeting_done');
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showRescheduleModal.id}`, {
        meeting_date: format(rescheduleData.date, 'yyyy-MM-dd'),
        meeting_time: rescheduleData.time,
        meeting_type: rescheduleData.meeting_type,
        notes: showRescheduleModal.notes 
          ? `${showRescheduleModal.notes}\n\nMeeting Rescheduled (${rescheduleData.meeting_type}): ${rescheduleData.reason}` 
          : `Meeting Rescheduled (${rescheduleData.meeting_type}): ${rescheduleData.reason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Meeting rescheduled successfully');
      setShowRescheduleModal(null);
      setRescheduleData({ date: null, time: '', meeting_type: 'offline', reason: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  const handleConvert = async () => {
    if (!convertData.amount) {
      toast.error('Please enter the deal amount');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showConvertModal.id}`, {
        status: 'converted',
        conversion_amount: convertData.amount,
        notes: showConvertModal.notes 
          ? `${showConvertModal.notes}\n\nConverted: ₹${convertData.amount}` 
          : `Converted: ₹${convertData.amount}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('School converted successfully!');
      setShowConvertModal(null);
      setConvertData({ amount: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to convert');
    }
  };

  const handleArchive = async (inquiry) => {
    await handleStatusChange(inquiry, 'archived');
  };

  const handleOnboardSchool = async () => {
    if (!showOnboardModal) return;
    
    try {
      // Calculate totals
      const totalStudents = onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
      const totalAmount = onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
      
      await axios.post(`${API}/schools/onboard`, {
        school_id: showOnboardModal.id,
        model: onboardData.model,
        grade_pricing: onboardData.grade_pricing.filter(g => g.grade && g.students),
        total_students: totalStudents,
        total_amount: totalAmount,
        school_contacts: onboardData.school_contacts.filter(c => c.name && c.phone),
        payment_mode: onboardData.payment_mode,
        contract_start: onboardData.contract_start,
        contract_end: onboardData.contract_end,
      }, { headers: getAuthHeaders() });
      
      // Update school status to 'active' after onboarding
      await axios.patch(`${API}/schools/inquiry/${showOnboardModal.id}`, {
        status: 'active'
      }, { headers: getAuthHeaders() });
      
      toast.success('School onboarded and moved to Active!');
      setShowOnboardModal(null);
      setOnboardData({
        model: '', grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
        total_students: 0, total_amount: 0, school_contacts: [{ name: '', phone: '', email: '', role: '' }],
        payment_mode: 'monthly', contract_start: '', contract_end: ''
      });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to onboard school');
      console.error(error);
    }
  };

  const addGradePricing = () => {
    setOnboardData(prev => ({
      ...prev,
      grade_pricing: [...prev.grade_pricing, { grade: '', students: '', price_per_student: '' }]
    }));
  };

  const updateGradePricing = (index, field, value) => {
    setOnboardData(prev => ({
      ...prev,
      grade_pricing: prev.grade_pricing.map((g, i) => i === index ? { ...g, [field]: value } : g)
    }));
  };

  const addSchoolContact = () => {
    setOnboardData(prev => ({
      ...prev,
      school_contacts: [...prev.school_contacts, { name: '', phone: '', email: '', role: '' }]
    }));
  };

  const updateSchoolContact = (index, field, value) => {
    setOnboardData(prev => ({
      ...prev,
      school_contacts: prev.school_contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
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
        email: newLead.email || `${newLead.phone}@school.oll`,
        phone: newLead.phone,
        location: newLead.location,
        school_size: newLead.student_count || '',
        fee_range: '',
        board: newLead.board,
        meeting_type: newLead.meeting_type,
        meeting_date: newLead.meeting_date ? format(newLead.meeting_date, 'yyyy-MM-dd') : null,
        meeting_time: newLead.meeting_time,
        programs_interested: [],
        support_needed: [],
        source: newLead.source,
        notes: newLead.notes,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({ 
        school_name: '', 
        contact_name: '', 
        phone: '', 
        email: '',
        location: '', 
        board: '', 
        student_count: '',
        meeting_type: 'offline', 
        meeting_date: null,
        meeting_time: '',
        source: 'manual', 
        notes: '' 
      });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add lead');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/schools/comment/${showCommentModal.id}`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      setShowCommentModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleSaveEdit = async () => {
    if (!viewInquiry) return;
    try {
      await axios.patch(`${API}/schools/inquiry/${viewInquiry.id}`, {
        school_name: editData.school_name,
        contact_name: editData.contact_name,
        phone: editData.phone,
        email: editData.email,
        meeting_date: editData.meeting_date || null,
        meeting_time: editData.meeting_time || null,
        notes: editData.notes
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead updated successfully');
      setEditMode(false);
      setViewInquiry(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleAddViewComment = async () => {
    if (!viewComment.trim() || !viewInquiry) return;
    try {
      await axios.post(`${API}/schools/comment/${viewInquiry.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewInquiry data
      const response = await axios.get(`${API}/schools/inquiries`, { headers: getAuthHeaders() });
      const updatedInquiry = response.data.find(i => i.id === viewInquiry.id);
      if (updatedInquiry) setViewInquiry(updatedInquiry);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleAddFollowup = async () => {
    if (!followupData.date) {
      toast.error('Please select a followup date');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showFollowupModal.id}`, {
        followup_date: format(followupData.date, 'yyyy-MM-dd'),
        followup_comment: followupData.comment
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Followup scheduled');
      setShowFollowupModal(null);
      setFollowupData({ date: null, comment: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add followup');
    }
  };

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/schools/inquiry/${showAssignModal.id}`, {
        assigned_to: userId
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead assigned successfully');
      setShowAssignModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.phone?.includes(searchQuery);
    const matchesSection = inq.status === activeSection;
    
    // Assignee filter
    let matchesAssignee = true;
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        matchesAssignee = !inq.assigned_to;
      } else {
        matchesAssignee = inq.assigned_to === assigneeFilter;
      }
    }
    
    return matchesSearch && matchesSection && matchesAssignee;
  });

  const getCount = (status) => inquiries.filter(i => i.status === status).length;

  // Render action buttons based on status
  const renderActionButtons = (inquiry) => {
    const baseButtons = (
      <>
        <button
          onClick={() => setShowAssignModal(inquiry)}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
          data-testid={`assign-${inquiry.id}`}
        >
          <UserPlus className="w-3 h-3" />
          Assign
        </button>
        <button
          onClick={() => setShowCommentModal(inquiry)}
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
      </>
    );

    // Followup button - shown in all sections except converted
    const followupButton = inquiry.status !== 'converted' && (
      <button
        onClick={() => {
          setShowFollowupModal(inquiry);
          setFollowupData({ 
            date: inquiry.followup_date ? new Date(inquiry.followup_date) : null, 
            comment: inquiry.followup_comment || '' 
          });
        }}
        className="text-xs px-3 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 flex items-center gap-1 font-medium"
        data-testid={`followup-${inquiry.id}`}
      >
        <Clock className="w-3 h-3" />
        Followup
      </button>
    );

    switch (inquiry.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleMeetingDone(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`meeting-done-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Meeting Done
            </button>
            <button
              onClick={() => {
                setShowRescheduleModal(inquiry);
                setRescheduleData({ date: null, time: '', meeting_type: inquiry.meeting_type || 'offline', reason: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${inquiry.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule
            </button>
            {followupButton}
            {baseButtons}
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
      
      case 'meeting_done':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleStatusChange(inquiry, 'converted')}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark Converted
            </button>
            {followupButton}
            {baseButtons}
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
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setShowOnboardModal(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`onboard-${inquiry.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Onboard School
            </button>
            {baseButtons}
          </div>
        );
      
      case 'active':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleStatusChange(inquiry, 'renewed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center gap-1 font-medium"
              data-testid={`renew-${inquiry.id}`}
            >
              <RefreshCw className="w-3 h-3" />
              Renewed
            </button>
            <button
              onClick={() => handleStatusChange(inquiry, 'lost')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`lost-${inquiry.id}`}
            >
              <X className="w-3 h-3" />
              Lost
            </button>
            {baseButtons}
          </div>
        );
      
      case 'renewed':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleStatusChange(inquiry, 'lost')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`lost-${inquiry.id}`}
            >
              <X className="w-3 h-3" />
              Lost
            </button>
            {baseButtons}
          </div>
        );
      
      case 'lost':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleStatusChange(inquiry, 'active')}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`reactivate-${inquiry.id}`}
            >
              <RefreshCw className="w-3 h-3" />
              Reactivate
            </button>
            {baseButtons}
          </div>
        );
      
      case 'archived':
        return <div className="flex gap-1 flex-wrap">{followupButton}{baseButtons}</div>;
      
      default:
        return null;
    }
  };

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
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
          data-testid="school-assignee-filter"
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {teamUsers.filter(u => u.is_active).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
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
                  {inquiry.assigned_to && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Assigned: {getAssignedUserName(inquiry.assigned_to) || 'Team Member'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    inquiry.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {inquiry.source || 'website'}
                  </span>
                  {inquiry.meeting_type && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                      inquiry.meeting_type === 'online' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {inquiry.meeting_type === 'online' ? <Video className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {inquiry.meeting_type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-3">
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
                    Meeting: {inquiry.meeting_date} {inquiry.meeting_time && `at ${inquiry.meeting_time}`}
                  </p>
                )}
                {inquiry.conversion_amount && (
                  <p className="text-green-600 font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ₹{inquiry.conversion_amount}
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

              {/* Comments shown outside */}
              {inquiry.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Comments
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-line">{inquiry.notes}</p>
                </div>
              )}

              {/* Followup shown outside - only for non-converted */}
              {inquiry.status !== 'converted' && inquiry.followup_date && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-cyan-700 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Followup: {inquiry.followup_date}
                  </p>
                  {inquiry.followup_comment && (
                    <p className="text-sm text-cyan-900">{inquiry.followup_comment}</p>
                  )}
                </div>
              )}

              {/* View Button */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewInquiry(inquiry)}
                  data-testid={`view-school-${inquiry.id}`}
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

      {/* View/Edit Details Dialog */}
      <Dialog open={!!viewInquiry} onOpenChange={() => { setViewInquiry(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1E3A5F]" />
                {editMode ? 'Edit Lead' : viewInquiry?.school_name}
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(true);
                  setEditData({
                    school_name: viewInquiry?.school_name || '',
                    contact_name: viewInquiry?.contact_name || '',
                    phone: viewInquiry?.phone || '',
                    email: viewInquiry?.email || '',
                    meeting_date: viewInquiry?.meeting_date || '',
                    meeting_time: viewInquiry?.meeting_time || '',
                    notes: viewInquiry?.notes || ''
                  });
                }}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewInquiry && (
            <div className="space-y-4">
              {editMode ? (
                /* Edit Mode */
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                      <Input
                        value={editData.school_name}
                        onChange={(e) => setEditData({...editData, school_name: e.target.value})}
                        placeholder="School name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                      <Input
                        value={editData.contact_name}
                        onChange={(e) => setEditData({...editData, contact_name: e.target.value})}
                        placeholder="Contact person"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData({...editData, phone: e.target.value})}
                        placeholder="Phone number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <Input
                        value={editData.email}
                        onChange={(e) => setEditData({...editData, email: e.target.value})}
                        placeholder="Email"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Date</label>
                      <Input
                        type="date"
                        value={editData.meeting_date}
                        onChange={(e) => setEditData({...editData, meeting_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Time</label>
                      <select
                        value={editData.meeting_time}
                        onChange={(e) => setEditData({...editData, meeting_time: e.target.value})}
                        className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                      >
                        <option value="">Select time</option>
                        {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      placeholder="Internal notes..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setEditMode(false)} className="flex-1">Cancel</Button>
                    <Button onClick={handleSaveEdit} className="flex-1 bg-[#1E3A5F] hover:bg-[#152c4a]">
                      <Save className="w-4 h-4 mr-1" /> Save Changes
                    </Button>
                  </div>
                </div>
              ) : (
                /* View Mode */
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Contact Person</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <User className="w-4 h-4" /> {viewInquiry.contact_name}
                      </p>
                    </div>
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
                      <p className="text-xs text-slate-500 mb-1">Location</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {viewInquiry.location || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Board</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.board || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">School Size</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.school_size || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Fee Range</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.fee_range || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Meeting Type</p>
                      <p className={`font-medium flex items-center gap-1 ${viewInquiry.meeting_type === 'online' ? 'text-green-600' : 'text-orange-600'}`}>
                        {viewInquiry.meeting_type === 'online' ? <Video className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {viewInquiry.meeting_type === 'online' ? 'Online Meeting' : 'Offline Meeting'}
                      </p>
                    </div>
                  </div>

                  {viewInquiry.programs_interested?.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">Programs Interested</p>
                      <div className="flex flex-wrap gap-1">
                        {viewInquiry.programs_interested.map((p, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewInquiry.meeting_date && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-500 mb-1">Meeting Scheduled</p>
                      <p className="font-medium text-blue-700 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> 
                        {viewInquiry.meeting_date} {viewInquiry.meeting_time && `at ${viewInquiry.meeting_time}`}
                      </p>
                    </div>
                  )}

                  {viewInquiry.conversion_amount && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-500 mb-1">Conversion Details</p>
                      <p className="font-medium text-green-700">
                        Deal Amount: ₹{viewInquiry.conversion_amount}
                      </p>
                    </div>
                  )}

                  {viewInquiry.notes && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-500 mb-1">Notes</p>
                      <p className="text-amber-900 whitespace-pre-line">{viewInquiry.notes}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comments ({viewInquiry.comments?.length || 0})
                    </h4>
                    
                    {viewInquiry.comments?.length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto mb-3">
                        {viewInquiry.comments.map((comment, idx) => (
                          <div key={idx} className="bg-slate-50 rounded-lg p-3">
                            <p className="text-sm text-slate-700">{comment.text}</p>
                            <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                              <User className="w-3 h-3" />
                              <span>{comment.author}</span>
                              <span>•</span>
                              <span>{comment.created_at ? new Date(comment.created_at).toLocaleString() : '-'}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Comment */}
                    <div className="flex gap-2">
                      <Input
                        value={viewComment}
                        onChange={(e) => setViewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddViewComment()}
                      />
                      <Button onClick={handleAddViewComment} size="sm" className="bg-[#1E3A5F]">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-xs text-slate-400">
                      Status: <span className="font-medium text-[#1E3A5F] capitalize">{viewInquiry.status?.replace('_', ' ')}</span>
                      {viewInquiry.assigned_to && (
                        <span className="ml-2">| Assigned: {getAssignedUserName(viewInquiry.assigned_to)}</span>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reschedule Meeting Modal */}
      <Dialog open={!!showRescheduleModal} onOpenChange={() => setShowRescheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting - {showRescheduleModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Meeting Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    rescheduleData.meeting_type === 'offline' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setRescheduleData({...rescheduleData, meeting_type: 'offline'})}
                >
                  <Users className="w-4 h-4" />
                  Offline
                </button>
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    rescheduleData.meeting_type === 'online' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setRescheduleData({...rescheduleData, meeting_type: 'online'})}
                >
                  <Video className="w-4 h-4" />
                  Online
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select New Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={rescheduleData.date}
                  onSelect={(date) => setRescheduleData({...rescheduleData, date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30) || date.getDay() === 0}
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
                Reschedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={!!showConvertModal} onOpenChange={() => setShowConvertModal(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convert School - {showConvertModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deal Amount (₹)</label>
              <Input
                type="number"
                placeholder="Enter deal amount"
                value={convertData.amount}
                onChange={(e) => setConvertData({...convertData, amount: e.target.value})}
                data-testid="convert-amount"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowConvertModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConvert} className="btn-primary flex-1">
                Convert School
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Email address (optional)"
                value={newLead.email}
                onChange={(e) => setNewLead({...newLead, email: e.target.value})}
                data-testid="new-school-email"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
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
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Est. Students</label>
                <Input
                  type="number"
                  placeholder="Student count"
                  value={newLead.student_count}
                  onChange={(e) => setNewLead({...newLead, student_count: e.target.value})}
                  data-testid="new-school-students"
                />
              </div>
            </div>
            
            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Meeting Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    newLead.meeting_type === 'offline' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setNewLead({...newLead, meeting_type: 'offline'})}
                >
                  <Users className="w-4 h-4" />
                  Offline Meeting
                </button>
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    newLead.meeting_type === 'online' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setNewLead({...newLead, meeting_type: 'online'})}
                >
                  <Video className="w-4 h-4" />
                  Online Meeting
                </button>
              </div>
            </div>

            {/* Meeting Date & Time */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-slate-900 mb-3">Meeting Scheduling</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Date</label>
                  <div className="border rounded-lg p-2">
                    <CalendarComponent
                      mode="single"
                      selected={newLead.meeting_date}
                      onSelect={(date) => setNewLead({...newLead, meeting_date: date})}
                      disabled={(date) => date < new Date()}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={`p-2 rounded-lg border text-sm ${
                          newLead.meeting_time === time 
                            ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setNewLead({...newLead, meeting_time: time})}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
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
                <option value="website">Website</option>
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
            <div className="flex gap-3 pt-4 border-t">
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

      {/* Comment Modal */}
      <Dialog open={!!showCommentModal} onOpenChange={() => setShowCommentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment - {showCommentModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showCommentModal?.comments?.length > 0 && (
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                <h4 className="text-sm font-medium text-slate-700">Previous Comments</h4>
                {showCommentModal.comments.map((comment, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-sm text-slate-700">{comment.text}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span>{comment.author}</span>
                      <span>•</span>
                      <span>{comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a') : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment or note..."
              className="min-h-[100px]"
              data-testid="school-comment-input"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCommentModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddComment} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-school-comment">
                <Send className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Lead - {showAssignModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showAssignModal?.assigned_to && (
              <div className="bg-indigo-50 rounded-lg p-3">
                <p className="text-sm text-indigo-700">
                  Currently assigned to: <strong>{getAssignedUserName(showAssignModal.assigned_to) || 'Unknown'}</strong>
                </p>
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Select Team Member</p>
              {teamUsers.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No team members found.</p>
              ) : (
                teamUsers.filter(u => u.is_active).map(teamUser => (
                  <button
                    key={teamUser.id}
                    onClick={() => handleAssignLead(teamUser.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 ${
                      showAssignModal?.assigned_to === teamUser.id 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-slate-200'
                    }`}
                    data-testid={`school-assign-to-${teamUser.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{teamUser.name}</p>
                        <p className="text-xs text-slate-500">{teamUser.email}</p>
                      </div>
                      {showAssignModal?.assigned_to === teamUser.id && (
                        <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Current</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAssignModal(null)} className="flex-1">
                Cancel
              </Button>
              {showAssignModal?.assigned_to && (
                <Button 
                  variant="outline" 
                  onClick={() => handleAssignLead('')}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Unassign
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Followup Modal */}
      <Dialog open={!!showFollowupModal} onOpenChange={() => setShowFollowupModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              Schedule Followup - {showFollowupModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showFollowupModal?.followup_date && (
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="text-sm text-cyan-700">
                  Current followup: <strong>{showFollowupModal.followup_date}</strong>
                </p>
                {showFollowupModal.followup_comment && (
                  <p className="text-xs text-cyan-600 mt-1">{showFollowupModal.followup_comment}</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Followup Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={followupData.date}
                  onSelect={(date) => setFollowupData(prev => ({...prev, date}))}
                  disabled={(date) => date < new Date()}
                  className="rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Followup Note</label>
              <Textarea
                value={followupData.comment}
                onChange={(e) => setFollowupData(prev => ({...prev, comment: e.target.value}))}
                placeholder="Add a note for this followup..."
                className="min-h-[80px]"
                data-testid="followup-comment"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowFollowupModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddFollowup} className="flex-1 bg-cyan-600 hover:bg-cyan-700" data-testid="submit-followup">
                <Clock className="w-4 h-4 mr-2" />
                Set Followup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* School Onboarding Modal */}
      <Dialog open={!!showOnboardModal} onOpenChange={() => setShowOnboardModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-600" />
              Onboard School: {showOnboardModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="text-sm font-medium text-slate-700">Select Model *</label>
              <select
                value={onboardData.model}
                onChange={(e) => setOnboardData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select school offering model</option>
                <option value="robotics_lab">Robotics Lab Setup</option>
                <option value="stem_curriculum">STEM Curriculum Integration</option>
                <option value="after_school">After School Program</option>
                <option value="teacher_training">Teacher Training</option>
                <option value="full_partnership">Full School Partnership</option>
              </select>
            </div>

            {/* Grade-wise Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Grade-wise Student Count & Pricing</label>
                <Button variant="ghost" size="sm" onClick={addGradePricing} className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" /> Add Grade
                </Button>
              </div>
              <div className="space-y-2">
                {onboardData.grade_pricing.map((gp, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Grade (e.g., 1-5)"
                      value={gp.grade}
                      onChange={(e) => updateGradePricing(idx, 'grade', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="No. of students"
                      value={gp.students}
                      onChange={(e) => updateGradePricing(idx, 'students', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Price/student"
                      value={gp.price_per_student}
                      onChange={(e) => updateGradePricing(idx, 'price_per_student', e.target.value)}
                    />
                    <div className="flex items-center justify-center text-sm text-slate-600">
                      ₹{((parseInt(gp.students) || 0) * (parseFloat(gp.price_per_student) || 0)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm">
                <span className="font-medium">Total: </span>
                {onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0)} students • 
                ₹{onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0).toLocaleString()}
              </div>
            </div>

            {/* School Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">School Team Contacts</label>
                <Button variant="ghost" size="sm" onClick={addSchoolContact} className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </div>
              <div className="space-y-2">
                {onboardData.school_contacts.map((contact, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Name"
                      value={contact.name}
                      onChange={(e) => updateSchoolContact(idx, 'name', e.target.value)}
                    />
                    <Input
                      placeholder="Phone"
                      value={contact.phone}
                      onChange={(e) => updateSchoolContact(idx, 'phone', e.target.value)}
                    />
                    <Input
                      placeholder="Email"
                      value={contact.email}
                      onChange={(e) => updateSchoolContact(idx, 'email', e.target.value)}
                    />
                    <Input
                      placeholder="Role (Principal, etc)"
                      value={contact.role}
                      onChange={(e) => updateSchoolContact(idx, 'role', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                <select
                  value={onboardData.payment_mode}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, payment_mode: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="half_yearly">Half Yearly</option>
                  <option value="annual">Annual</option>
                  <option value="one_time">One Time</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contract Start</label>
                <Input
                  type="date"
                  value={onboardData.contract_start}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, contract_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contract End</label>
                <Input
                  type="date"
                  value={onboardData.contract_end}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, contract_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowOnboardModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleOnboardSchool} className="flex-1 bg-green-600 hover:bg-green-700">
                Onboard School
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSchoolCRM;
