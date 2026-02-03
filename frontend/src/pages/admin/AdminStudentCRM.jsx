import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Calendar, Clock, Plus, ChevronRight, MessageSquare, Archive, CalendarClock, CheckCircle2, X, User, Mail, MapPin, Target, BookOpen, Send, UserPlus, Edit, Save, Video, Navigation, Home, ExternalLink, Bell, Upload } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, parseISO, isAfter, isBefore, addHours } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy', 'Other'];
const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
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
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCancelDemoModal, setShowCancelDemoModal] = useState(null);
  const [showOnboardModal, setShowOnboardModal] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  const [newComment, setNewComment] = useState('');
  const [onboardedEducators, setOnboardedEducators] = useState([]);
  const [assignTab, setAssignTab] = useState('team'); // 'team' or 'educator'
  const [batches, setBatches] = useState([]);
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', demo_date: '', demo_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Autocomplete states
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState('');
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', reason: '' });
  const [convertData, setConvertData] = useState({ amount: '', sessions: '', payment_receipt: null });
  const [cancelDemoReason, setCancelDemoReason] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [onboardData, setOnboardData] = useState({
    batch_mode: 'new', // 'new' or 'existing'
    batch_id: '',
    name: '',
    skill: '',
    start_date: '',
    days: [],
    time_slot: '',
    num_sessions: 12,
    educator_id: '',
    educator_name: '',
    mode: 'online',
    payment_receipt: null,
    payment_receipt_url: '',
    amount: '', // Payment amount
  });
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    email: '',
    skill: '',
    otherSkill: '', // Custom skill when "Other" is selected
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
    fetchTeamUsers();
    fetchOnboardedEducators();
    fetchBatches();
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

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API}/batches?status=active`, {
        headers: getAuthHeaders()
      });
      setBatches(response.data || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchOnboardedEducators = async () => {
    try {
      const response = await axios.get(`${API}/educators/applications`, {
        headers: getAuthHeaders()
      });
      // Filter to only onboarded educators
      const onboarded = (response.data || []).filter(e => e.status === 'onboarded');
      setOnboardedEducators(onboarded);
    } catch (error) {
      console.error('Failed to fetch educators:', error);
    }
  };

  // Autocomplete search for existing records
  const searchAutocomplete = async (query, field) => {
    if (!query || query.length < 3) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/data-center/autocomplete?q=${encodeURIComponent(query)}&data_type=students`, {
        headers: getAuthHeaders()
      });
      setAutocompleteSuggestions(response.data || []);
      setAutocompleteField(field);
      setShowAutocomplete(response.data && response.data.length > 0);
    } catch (error) {
      console.error('Autocomplete error:', error);
    }
  };

  const handleAutocompleteFill = (suggestion) => {
    setNewLead({
      ...newLead,
      name: suggestion.name || '',
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      city: suggestion.city || '',
      age_group: suggestion.age_group || '',
      skill: suggestion.skill || '',
      learning_mode: suggestion.learning_mode || 'online',
      learning_goal: suggestion.learning_goal || '',
      address: suggestion.address || '',
    });
    setShowAutocomplete(false);
    toast.info('Form auto-filled from existing record');
  };

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

  const handleAssignEducator = async (educatorId, educatorName) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/students/inquiry/${showAssignModal.id}`, {
        assigned_educator_id: educatorId,
        assigned_educator_name: educatorName
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Demo assigned to ${educatorName}`);
      setShowAssignModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to assign educator');
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

  const handleCancelDemo = async () => {
    if (!cancelDemoReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showCancelDemoModal.id}`, {
        demo_date: null,
        demo_time: null,
        demo_cancelled: true,
        notes: showCancelDemoModal.notes 
          ? `${showCancelDemoModal.notes}\n\n[DEMO CANCELLED] ${format(new Date(), 'MMM d, yyyy')}: ${cancelDemoReason}` 
          : `[DEMO CANCELLED] ${format(new Date(), 'MMM d, yyyy')}: ${cancelDemoReason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Demo cancelled successfully');
      setShowCancelDemoModal(null);
      setCancelDemoReason('');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to cancel demo');
    }
  };

  const handleConvert = async () => {
    // This function is now part of onboarding - see handleOnboardStudent
  };

  const handleArchive = (inquiry) => {
    setShowArchiveModal(inquiry);
    setArchiveReason('');
  };

  const confirmArchive = async () => {
    if (!showArchiveModal) return;
    if (!archiveReason) {
      toast.error('Please select a reason for archiving');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showArchiveModal.id}`, {
        status: 'archived',
        archive_reason: archiveReason,
        notes: showArchiveModal.notes 
          ? `${showArchiveModal.notes}\n\n--- Archived (${format(new Date(), 'dd MMM yyyy')}) ---\nReason: ${archiveReason}`
          : `--- Archived (${format(new Date(), 'dd MMM yyyy')}) ---\nReason: ${archiveReason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead archived');
      setShowArchiveModal(null);
      setArchiveReason('');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to archive lead');
    }
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setOnboardData(prev => ({ 
        ...prev, 
        payment_receipt_url: response.data.url || response.data.file_url 
      }));
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleOnboardStudent = async () => {
    if (!showOnboardModal) return;
    
    // Validate payment receipt
    if (!onboardData.payment_receipt_url) {
      toast.error('Payment receipt is mandatory');
      return;
    }
    
    // Validate amount
    if (!onboardData.amount || parseFloat(onboardData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      // First update to converted status with payment info
      await axios.patch(`${API}/students/inquiry/${showOnboardModal.id}`, {
        status: 'converted',
        payment_receipt_url: onboardData.payment_receipt_url,
        conversion_amount: onboardData.amount,
        notes: showOnboardModal.notes 
          ? `${showOnboardModal.notes}\n\nConverted with payment receipt - ₹${onboardData.amount}` 
          : `Converted with payment receipt - ₹${onboardData.amount}`
      }, {
        headers: getAuthHeaders()
      });
      
      let batchId = onboardData.batch_id;
      
      // Create new batch if needed
      if (onboardData.batch_mode === 'new') {
        if (!onboardData.start_date || onboardData.days.length === 0 || !onboardData.time_slot || !onboardData.educator_id) {
          toast.error('Please fill all required fields for new batch');
          return;
        }
        
        const batchResponse = await axios.post(`${API}/batches`, {
          name: onboardData.name || `${showOnboardModal.name}'s Batch`,
          skill: onboardData.skill || showOnboardModal.skill,
          start_date: onboardData.start_date,
          days: onboardData.days,
          time_slot: onboardData.time_slot,
          num_sessions: parseInt(onboardData.num_sessions) || 12,
          educator_id: onboardData.educator_id,
          educator_name: onboardData.educator_name,
          mode: onboardData.mode,
        }, { headers: getAuthHeaders() });
        
        batchId = batchResponse.data.id;
      }
      
      if (!batchId) {
        toast.error('Please select or create a batch');
        return;
      }
      
      // Add student to batch
      await axios.post(`${API}/batches/${batchId}/add-student`, {
        student_id: showOnboardModal.id
      }, { headers: getAuthHeaders() });
      
      toast.success('Student onboarded successfully! Sessions created.');
      setShowOnboardModal(null);
      setOnboardData({
        batch_mode: 'new', batch_id: '', name: '', skill: '', start_date: '',
        days: [], time_slot: '', num_sessions: 12, educator_id: '', educator_name: '', mode: 'online',
        payment_receipt: null, payment_receipt_url: '', amount: ''
      });
      fetchInquiries();
      fetchBatches();
    } catch (error) {
      toast.error('Failed to onboard student');
      console.error(error);
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }
    const fullPhone = newLead.countryCode === '+91' ? newLead.phone : `${newLead.countryCode}${newLead.phone}`;
    
    // Use otherSkill if skill is "other"
    const finalSkill = newLead.skill === 'other' && newLead.otherSkill ? newLead.otherSkill : newLead.skill;
    
    try {
      await axios.post(`${API}/students/inquiry`, {
        ...newLead,
        skill: finalSkill,
        phone: fullPhone,
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
        countryCode: '+91',
        email: '',
        skill: '',
        otherSkill: '',
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

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/students/comment/${showCommentModal.id}`, 
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

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/students/inquiry/${showAssignModal.id}`, {
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

  const handleSaveEdit = async () => {
    if (!viewInquiry) return;
    try {
      await axios.patch(`${API}/students/inquiry/${viewInquiry.id}`, {
        name: editData.name,
        phone: editData.phone,
        email: editData.email,
        demo_date: editData.demo_date || null,
        demo_time: editData.demo_time || null,
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
      await axios.post(`${API}/students/comment/${viewInquiry.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewInquiry data
      const response = await axios.get(`${API}/students/inquiries`, { headers: getAuthHeaders() });
      const updatedInquiry = response.data.find(i => i.id === viewInquiry.id);
      if (updatedInquiry) setViewInquiry(updatedInquiry);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  // Helper functions for meeting links and location
  // Generate a Jitsi meeting link for admin (moderator role)
  const generateMeetingLink = (inquiry) => {
    const meetCode = inquiry.id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const adminName = encodeURIComponent(user?.name || 'OLL Admin');
    
    // Jitsi config for admin/moderator with lobby control enabled
    // Moderators can admit/reject participants from the lobby
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': false,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'config.enableLobby': true,
      'config.lobbyModeEnabled': true,
      'userInfo.displayName': adminName,
      'userInfo.moderator': true
    };
    
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `https://meet.jit.si/${roomName}#${configString}`;
  };

  const isDemoJoinable = (inquiry) => {
    if (!inquiry.demo_date || !inquiry.demo_time) return false;
    if (!['new', 'demo_scheduled'].includes(inquiry.status)) return false;
    if (inquiry.learning_mode !== 'online') return false;
    
    try {
      const demoDateTime = parseISO(`${inquiry.demo_date}T${inquiry.demo_time}:00`);
      const now = new Date();
      const joinWindowStart = addHours(demoDateTime, -0.25);
      const joinWindowEnd = addHours(demoDateTime, 1);
      return isAfter(now, joinWindowStart) && isBefore(now, joinWindowEnd);
    } catch {
      return false;
    }
  };

  const isOnlineMode = (inquiry) => inquiry.learning_mode === 'online';
  const isOfflineCenter = (inquiry) => inquiry.learning_mode === 'offline_center';
  const isOfflineHome = (inquiry) => inquiry.learning_mode === 'offline_home';

  const generateCenterMapsLink = (inquiry) => {
    const centerName = inquiry.selected_center_name || inquiry.center_name || 'OLL Center';
    const city = inquiry.city || '';
    const query = encodeURIComponent(`${centerName} ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getLocationDisplay = (inquiry) => {
    if (isOnlineMode(inquiry)) {
      return { type: 'online', text: 'Online Class', icon: Video };
    } else if (isOfflineCenter(inquiry)) {
      const centerName = inquiry.selected_center_name || inquiry.center_name || 'OLL Center';
      return { type: 'center', text: `${centerName}, ${inquiry.city || ''}`, icon: MapPin };
    } else if (isOfflineHome(inquiry)) {
      return { type: 'home', text: `At Home - ${inquiry.address || inquiry.city || ''}`, icon: Home };
    }
    return { type: 'unknown', text: inquiry.city || 'Location TBD', icon: MapPin };
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // Notify not joined - for student or educator
  const handleNotifyNotJoined = async (inquiry, notifyType) => {
    try {
      await axios.post(`${API}/admin/notify-not-joined/${inquiry.id}`, {
        notify_type: notifyType
      }, { headers: getAuthHeaders() });
      toast.success(`${notifyType === 'student' ? 'Student' : 'Educator'} has been notified`);
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

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
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Add Note
        </button>
        {/* Not Joined notification buttons */}
        {inquiry.demo_date && inquiry.status === 'new' && (
          <>
            <button
              onClick={() => handleNotifyNotJoined(inquiry, 'student')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center gap-1 font-medium"
              data-testid={`notify-student-${inquiry.id}`}
              title="Notify student they haven't joined"
            >
              <Bell className="w-3 h-3" />
              Student?
            </button>
            {inquiry.assigned_educator_id && (
              <button
                onClick={() => handleNotifyNotJoined(inquiry, 'educator')}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
                data-testid={`notify-educator-${inquiry.id}`}
                title="Notify educator they haven't joined"
              >
                <Bell className="w-3 h-3" />
                Educator?
              </button>
            )}
          </>
        )}
      </>
    );

    switch (inquiry.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleDemoCompleted(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
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
              {inquiry.demo_date ? 'Reschedule' : 'Add Demo'}
            </button>
            {inquiry.demo_date && (
              <button
                onClick={() => {
                  setShowCancelDemoModal(inquiry);
                  setCancelDemoReason('');
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
                data-testid={`cancel-demo-${inquiry.id}`}
              >
                <X className="w-3 h-3" />
                Cancel Demo
              </button>
            )}
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
      
      case 'demo_completed':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => {
                setOnboardData(prev => ({ 
                  ...prev, 
                  skill: inquiry.skill, 
                  mode: inquiry.learning_mode || 'online',
                  payment_receipt_url: ''
                }));
                setShowOnboardModal(inquiry);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Convert & Onboard
            </button>
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
            {baseButtons}
            {!inquiry.batch_id && (
              <button
                onClick={() => {
                  setOnboardData(prev => ({ ...prev, skill: inquiry.skill, mode: inquiry.learning_mode || 'online' }));
                  setShowOnboardModal(inquiry);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                data-testid={`onboard-${inquiry.id}`}
              >
                <CalendarClock className="w-3 h-3" />
                Onboard
              </button>
            )}
            {inquiry.batch_id && (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">
                ✓ In Batch
              </span>
            )}
          </div>
        );
      case 'archived':
        return <div className="flex gap-1 flex-wrap">{baseButtons}</div>;
      
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
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
          data-testid="assignee-filter"
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
                  {inquiry.assigned_to && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Assigned to: {getAssignedUserName(inquiry.assigned_to) || 'Team Member'}
                    </p>
                  )}
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
                    <span className="text-slate-400">Location:</span>{' '}
                    {(() => {
                      const locationInfo = getLocationDisplay(inquiry);
                      return (
                        <span className={`font-medium ${
                          locationInfo.type === 'online' ? 'text-[#1E3A5F]' : 
                          locationInfo.type === 'home' ? 'text-green-600' : 'text-[#D63031]'
                        }`}>
                          {locationInfo.text}
                        </span>
                      );
                    })()}
                  </p>
                )}
                {inquiry.demo_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Demo: {inquiry.demo_date} {inquiry.demo_time && `at ${inquiry.demo_time}`}
                  </p>
                )}
                {inquiry.assigned_educator_name && (
                  <p className="flex items-center gap-1 text-green-600">
                    <User className="w-3 h-3" />
                    Educator: {inquiry.assigned_educator_name}
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

              {/* View Button + Action Links */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewInquiry(inquiry)}
                  data-testid={`view-inquiry-${inquiry.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                
                {/* Join Demo Button - For online mode */}
                {isOnlineMode(inquiry) && inquiry.demo_date && ['new', 'demo_scheduled'].includes(inquiry.status) && (
                  <a
                    href={generateMeetingLink(inquiry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-medium text-xs transition-all duration-300 shadow-sm ${
                      isDemoJoinable(inquiry)
                        ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] animate-pulse'
                        : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F]'
                    }`}
                    data-testid={`join-demo-${inquiry.id}`}
                  >
                    <Video className="w-3 h-3" />
                    {isDemoJoinable(inquiry) ? 'Join Now' : 'Join Demo'}
                  </a>
                )}

                {/* Go to Center Button - For offline center */}
                {isOfflineCenter(inquiry) && ['new', 'demo_scheduled'].includes(inquiry.status) && (
                  <a
                    href={generateCenterMapsLink(inquiry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-white font-medium text-xs bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] transition-all duration-300 shadow-sm"
                    data-testid={`go-to-center-${inquiry.id}`}
                  >
                    <Navigation className="w-3 h-3" />
                    Go to Center
                  </a>
                )}
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
                <User className="w-5 h-5 text-[#1E3A5F]" />
                {editMode ? 'Edit Lead' : viewInquiry?.name}
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(true);
                  setEditData({
                    name: viewInquiry?.name || '',
                    phone: viewInquiry?.phone || '',
                    email: viewInquiry?.email || '',
                    demo_date: viewInquiry?.demo_date || '',
                    demo_time: viewInquiry?.demo_time || '',
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                      <Input
                        value={editData.name}
                        onChange={(e) => setEditData({...editData, name: e.target.value})}
                        placeholder="Full name"
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Demo Date</label>
                      <Input
                        type="date"
                        value={editData.demo_date}
                        onChange={(e) => setEditData({...editData, demo_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Demo Time</label>
                      <select
                        value={editData.demo_time}
                        onChange={(e) => setEditData({...editData, demo_time: e.target.value})}
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
                      <p className={`font-medium flex items-center gap-1 ${viewInquiry.learning_mode?.includes('offline') ? 'text-[#D63031]' : 'text-[#1E3A5F]'}`}>
                        <MapPin className="w-4 h-4" /> 
                        {viewInquiry.learning_mode === 'online' ? 'Online' :
                         viewInquiry.learning_mode === 'offline_center' ? `Offline (Center) - ${viewInquiry.city}` :
                         viewInquiry.learning_mode === 'offline_home' ? `Offline (Home) - ${viewInquiry.city}` :
                         viewInquiry.learning_mode?.includes('offline') ? `Offline - ${viewInquiry.city}` : 'Online'}
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

      {/* Reschedule/Add Demo Modal */}
      <Dialog open={!!showRescheduleModal} onOpenChange={() => setShowRescheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {showRescheduleModal?.demo_date ? 'Reschedule Demo' : 'Add Demo'} - {showRescheduleModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showRescheduleModal?.demo_date && (
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm text-blue-700">
                  Current: {showRescheduleModal.demo_date} {showRescheduleModal.demo_time && `at ${showRescheduleModal.demo_time}`}
                </p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
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

            {showRescheduleModal?.demo_date && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Rescheduling</label>
                <Textarea
                  placeholder="Enter reason..."
                  value={rescheduleData.reason}
                  onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                  className="min-h-[80px]"
                />
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRescheduleModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleReschedule} className="btn-primary flex-1">
                {showRescheduleModal?.demo_date ? 'Reschedule Demo' : 'Add Demo'}
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

      {/* Cancel Demo Modal */}
      <Dialog open={!!showCancelDemoModal} onOpenChange={() => setShowCancelDemoModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Cancel Demo - {showCancelDemoModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showCancelDemoModal?.demo_date && (
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <span className="text-slate-600">Scheduled Demo: </span>
                <span className="font-medium text-slate-800">
                  {showCancelDemoModal.demo_date} {showCancelDemoModal.demo_time && `at ${showCancelDemoModal.demo_time}`}
                </span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Enter reason for cancelling the demo..."
                value={cancelDemoReason}
                onChange={(e) => setCancelDemoReason(e.target.value)}
                rows={3}
                data-testid="cancel-demo-reason"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelDemoModal(null)} className="flex-1">
                Go Back
              </Button>
              <Button 
                onClick={handleCancelDemo} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-cancel-demo"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel Demo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Reason Modal */}
      <Dialog open={!!showArchiveModal} onOpenChange={() => setShowArchiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-600">
              <Archive className="w-5 h-5" />
              Archive Lead - {showArchiveModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Archiving <span className="text-red-500">*</span>
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                data-testid="archive-reason-select"
              >
                <option value="">Select reason</option>
                <option value="Not interested">Not interested</option>
                <option value="Budget constraints">Budget constraints</option>
                <option value="Chose competitor">Chose competitor</option>
                <option value="No response">No response</option>
                <option value="Wrong contact">Wrong contact</option>
                <option value="Age not suitable">Age not suitable</option>
                <option value="Location not serviceable">Location not serviceable</option>
                <option value="Duplicate lead">Duplicate lead</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowArchiveModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={confirmArchive} 
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                data-testid="confirm-archive"
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Auto-fill hint */}
            <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded-lg">
              💡 Type at least 3 characters in Name, Phone, or Email to auto-fill from existing records
            </div>
            
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <Input
                  placeholder="Student / Parent name"
                  value={newLead.name}
                  onChange={(e) => {
                    setNewLead({...newLead, name: e.target.value});
                    searchAutocomplete(e.target.value, 'name');
                  }}
                  onFocus={() => newLead.name.length >= 3 && searchAutocomplete(newLead.name, 'name')}
                  data-testid="new-lead-name"
                />
                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteField === 'name' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAutocompleteFill(s)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                <PhoneInput
                  value={newLead.phone}
                  onChange={(val) => {
                    setNewLead({...newLead, phone: val});
                    searchAutocomplete(val, 'phone');
                  }}
                  countryCode={newLead.countryCode}
                  onCountryCodeChange={(code) => setNewLead({...newLead, countryCode: code})}
                  placeholder="Phone number"
                  data-testid="new-lead-phone"
                />
                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteField === 'phone' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAutocompleteFill(s)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Email address (optional)"
                value={newLead.email}
                onChange={(e) => {
                  setNewLead({...newLead, email: e.target.value});
                  searchAutocomplete(e.target.value, 'email');
                }}
                onFocus={() => newLead.email.length >= 3 && searchAutocomplete(newLead.email, 'email')}
                data-testid="new-lead-email"
              />
              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteField === 'email' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAutocompleteFill(s)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Age & Skill */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Age Group</label>
                <select
                  value={newLead.age_group}
                  onChange={(e) => setNewLead({...newLead, age_group: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-age"
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skill Interest</label>
                <select
                  value={newLead.skill}
                  onChange={(e) => setNewLead({...newLead, skill: e.target.value, otherSkill: ''})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-skill"
                >
                  <option value="">Select skill</option>
                  {SKILLS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
                {/* Other skill text input */}
                {newLead.skill === 'other' && (
                  <div className="mt-2">
                    <Input
                      placeholder="Please specify the skill"
                      value={newLead.otherSkill}
                      onChange={(e) => setNewLead({...newLead, otherSkill: e.target.value})}
                      className="h-10"
                      data-testid="other-skill-input"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Learning Mode & Goal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Learning Mode</label>
                <select
                  value={newLead.learning_mode}
                  onChange={(e) => setNewLead({...newLead, learning_mode: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-mode"
                >
                  {LEARNING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Learning Goal</label>
                <select
                  value={newLead.learning_goal}
                  onChange={(e) => setNewLead({...newLead, learning_goal: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-goal"
                >
                  <option value="">Select goal</option>
                  {LEARNING_GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>

            {/* City (always show) & Address (for offline) */}
            <div className="grid grid-cols-2 gap-4">
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
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Address for offline home */}
            {newLead.learning_mode === 'offline_home' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <Textarea
                  placeholder="Complete address for home visit"
                  value={newLead.address}
                  onChange={(e) => setNewLead({...newLead, address: e.target.value})}
                  className="min-h-[60px]"
                  data-testid="new-lead-address"
                />
              </div>
            )}

            {/* Demo Date & Time */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-slate-900 mb-3">Demo Scheduling</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Demo Date</label>
                  <div className="border rounded-lg p-2">
                    <CalendarComponent
                      mode="single"
                      selected={newLead.demo_date}
                      onSelect={(date) => setNewLead({...newLead, demo_date: date})}
                      disabled={(date) => date < new Date()}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Demo Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={`p-2 rounded-lg border text-sm ${
                          newLead.demo_time === time 
                            ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setNewLead({...newLead, demo_time: time})}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
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

            <div className="flex gap-3 pt-4 border-t">
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

      {/* Comment Modal */}
      <Dialog open={!!showCommentModal} onOpenChange={() => setShowCommentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment - {showCommentModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing Comments */}
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
              data-testid="comment-input"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCommentModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddComment} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-comment">
                <Send className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal - Updated with Educator Tab */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Lead - {showAssignModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Assignment Info */}
            {(showAssignModal?.assigned_to || showAssignModal?.assigned_educator_name) && (
              <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                {showAssignModal?.assigned_to && (
                  <p className="text-sm text-indigo-700">
                    Team: <strong>{getAssignedUserName(showAssignModal.assigned_to) || 'Unknown'}</strong>
                  </p>
                )}
                {showAssignModal?.assigned_educator_name && (
                  <p className="text-sm text-green-700">
                    Educator: <strong>{showAssignModal.assigned_educator_name}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setAssignTab('team')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  assignTab === 'team' 
                    ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Team Member
              </button>
              <button
                onClick={() => setAssignTab('educator')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  assignTab === 'educator' 
                    ? 'text-green-600 bg-green-50 border-b-2 border-green-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Educator (Demo)
              </button>
            </div>

            {/* Team Members Tab */}
            {assignTab === 'team' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Select Team Member</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
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
                        data-testid={`assign-to-${teamUser.id}`}
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
              </div>
            )}

            {/* Educators Tab */}
            {assignTab === 'educator' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Assign Demo to Educator</p>
                <p className="text-xs text-slate-500 mb-2">
                  Skill: <span className="font-medium">{showAssignModal?.skill}</span>
                </p>
                {onboardedEducators.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No onboarded educators available.</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {onboardedEducators.map(educator => {
                      const skillMatch = educator.skills?.some(s => 
                        s.toLowerCase().includes(showAssignModal?.skill?.toLowerCase() || '')
                      );
                      return (
                        <button
                          key={educator.id}
                          onClick={() => handleAssignEducator(educator.id, educator.name)}
                          className={`w-full p-3 rounded-lg border text-left transition-all hover:border-green-300 hover:bg-green-50 ${
                            showAssignModal?.assigned_educator_id === educator.id 
                              ? 'border-green-500 bg-green-50' 
                              : skillMatch ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
                          }`}
                          data-testid={`assign-educator-${educator.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900 flex items-center gap-2">
                                {educator.name}
                                {skillMatch && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Skill Match</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{educator.skills?.join(', ')}</p>
                              <p className="text-xs text-slate-400">{educator.city}</p>
                            </div>
                            {showAssignModal?.assigned_educator_id === educator.id && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Assigned</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAssignModal(null)} className="flex-1">
                Cancel
              </Button>
              {(showAssignModal?.assigned_to || showAssignModal?.assigned_educator_id) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (assignTab === 'team') handleAssignLead('');
                    else handleAssignEducator('', '');
                  }}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Unassign
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Onboarding Modal */}
      <Dialog open={!!showOnboardModal} onOpenChange={() => setShowOnboardModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-600" />
              Convert & Onboard: {showOnboardModal?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Amount & Receipt - MANDATORY */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              {/* Amount Field */}
              <div>
                <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                  Amount (₹) *
                </label>
                <div className="mt-1">
                  <Input
                    type="number"
                    placeholder="Enter payment amount"
                    value={onboardData.amount}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-white"
                    data-testid="onboard-amount"
                  />
                </div>
              </div>
              
              {/* Receipt Upload */}
              <div>
                <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Payment Receipt (Mandatory) *
                </label>
                <div className="mt-2">
                  {onboardData.payment_receipt_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Receipt uploaded
                      </span>
                      <a 
                        href={onboardData.payment_receipt_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View
                      </a>
                      <button 
                        onClick={() => setOnboardData(prev => ({ ...prev, payment_receipt_url: '' }))}
                        className="text-xs text-red-600 underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => handleReceiptUpload(e.target.files[0])}
                        className="text-sm"
                        disabled={uploadingReceipt}
                      />
                      {uploadingReceipt && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Batch Mode Selection */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setOnboardData(prev => ({ ...prev, batch_mode: 'new' }))}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  onboardData.batch_mode === 'new' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-600'
                }`}
              >
                Create New Batch
              </button>
              <button
                onClick={() => setOnboardData(prev => ({ ...prev, batch_mode: 'existing' }))}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  onboardData.batch_mode === 'existing' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-600'
                }`}
              >
                Join Existing Batch
              </button>
            </div>

            {onboardData.batch_mode === 'existing' ? (
              /* Select Existing Batch */
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Select Batch</label>
                {batches.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
                    No active batches available. Create a new one.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batches.map(batch => (
                      <button
                        key={batch.id}
                        onClick={() => setOnboardData(prev => ({ ...prev, batch_id: batch.id }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          onboardData.batch_id === batch.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{batch.name}</p>
                        <p className="text-xs text-slate-500">
                          {batch.skill} • {batch.educator_name} • {batch.mode}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {batch.days?.join(', ')} at {batch.time_slot} • {batch.num_sessions} sessions
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Create New Batch Form */
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Batch Name (optional)</label>
                  <Input
                    value={onboardData.name}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`${showOnboardModal?.name}'s Batch`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Start Date *</label>
                    <Input
                      type="date"
                      value={onboardData.start_date}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, start_date: e.target.value }))}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Time Slot *</label>
                    <select
                      value={onboardData.time_slot}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, time_slot: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select time</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Days *</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          setOnboardData(prev => ({
                            ...prev,
                            days: prev.days.includes(day) 
                              ? prev.days.filter(d => d !== day)
                              : [...prev.days, day]
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          onboardData.days.includes(day)
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">No. of Sessions</label>
                    <Input
                      type="number"
                      value={onboardData.num_sessions}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, num_sessions: e.target.value }))}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Mode *</label>
                    <select
                      value={onboardData.mode}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, mode: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Assign Educator *</label>
                  <select
                    value={onboardData.educator_id}
                    onChange={(e) => {
                      const edu = onboardedEducators.find(ed => ed.id === e.target.value);
                      setOnboardData(prev => ({ 
                        ...prev, 
                        educator_id: e.target.value,
                        educator_name: edu?.name || ''
                      }));
                    }}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select educator</option>
                    {onboardedEducators.map(edu => (
                      <option key={edu.id} value={edu.id}>{edu.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Skill</label>
                  <select
                    value={onboardData.skill}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, skill: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select skill</option>
                    <option value="Robotics">Robotics</option>
                    <option value="Coding">Coding</option>
                    <option value="AI">AI</option>
                    <option value="Entrepreneurship">Entrepreneurship</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowOnboardModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleOnboardStudent} className="flex-1 bg-green-600 hover:bg-green-700">
                Onboard Student
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudentCRM;
