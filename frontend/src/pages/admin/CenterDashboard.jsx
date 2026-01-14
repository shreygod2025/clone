import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Building2, Calendar, Clock, Phone, User, Plus, LogOut, Search, GraduationCap, MapPin, Check, X, Eye, MessageSquare, Archive, CalendarClock, CheckCircle2, Edit, Save, Send, Mail, BookOpen, Target, UserPlus, Video, Navigation, Home } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format, addDays, isToday, isTomorrow, parseISO, isBefore, isAfter, addHours } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
const SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const AGE_GROUPS = ['5-8 years', '9-12 years', '13-17 years', '18+ years'];

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const CenterDashboard = () => {
  const { user, logout, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [demos, setDemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('new');

  // Modal states
  const [viewInquiry, setViewInquiry] = useState(null);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', demo_date: '', demo_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', reason: '' });
  const [convertData, setConvertData] = useState({ amount: '', sessions: '' });

  const [newDemo, setNewDemo] = useState({
    name: '',
    phone: '',
    email: '',
    age_group: '',
    skill: '',
    demo_date: null,
    demo_time: '',
    notes: ''
  });

  useEffect(() => {
    if (user?.role !== 'center_user') {
      navigate('/admin/login');
      return;
    }
    fetchDemos();
  }, [user, navigate]);

  const fetchDemos = async () => {
    try {
      const response = await axios.get(`${API}/center/demos`, {
        headers: getAuthHeaders()
      });
      setDemos(response.data);
    } catch (error) {
      console.error('Failed to fetch demos:', error);
      toast.error('Failed to fetch demos');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDemo = async () => {
    if (!newDemo.name || !newDemo.phone) {
      toast.error('Please fill in name and phone');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/center/demos`, {
        name: newDemo.name,
        email: newDemo.email || `${newDemo.phone}@student.oll`,
        phone: newDemo.phone,
        age_group: newDemo.age_group,
        skill: newDemo.skill,
        demo_date: newDemo.demo_date ? format(newDemo.demo_date, 'yyyy-MM-dd') : null,
        demo_time: newDemo.demo_time,
        notes: newDemo.notes
      }, {
        headers: getAuthHeaders()
      });

      toast.success('Demo booking added!');
      setShowAddModal(false);
      setNewDemo({
        name: '',
        phone: '',
        email: '',
        age_group: '',
        skill: '',
        demo_date: null,
        demo_time: '',
        notes: ''
      });
      fetchDemos();
    } catch (error) {
      toast.error('Failed to add demo booking');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (inquiry, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/center/demos/${inquiry.id}`, { 
        status: newStatus,
        ...additionalData
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Status updated successfully`);
      fetchDemos();
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
      await axios.patch(`${API}/center/demos/${showRescheduleModal.id}`, {
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
      fetchDemos();
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
      await axios.patch(`${API}/center/demos/${showConvertModal.id}`, {
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
      fetchDemos();
    } catch (error) {
      toast.error('Failed to convert');
    }
  };

  const handleArchive = async (inquiry) => {
    await handleStatusChange(inquiry, 'archived');
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/center/demos/${showCommentModal.id}/comment`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      setShowCommentModal(null);
      fetchDemos();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleSaveEdit = async () => {
    if (!viewInquiry) return;
    try {
      await axios.patch(`${API}/center/demos/${viewInquiry.id}`, {
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
      fetchDemos();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleAddViewComment = async () => {
    if (!viewComment.trim() || !viewInquiry) return;
    try {
      await axios.post(`${API}/center/demos/${viewInquiry.id}/comment`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewInquiry data
      const response = await axios.get(`${API}/center/demos`, { headers: getAuthHeaders() });
      const updatedInquiry = response.data.find(i => i.id === viewInquiry.id);
      if (updatedInquiry) setViewInquiry(updatedInquiry);
      fetchDemos();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/admin/login');
  };

  // Filter demos
  const today = format(new Date(), 'yyyy-MM-dd');

  const filteredDemos = demos.filter(demo => {
    const matchesSearch = !searchQuery || 
      demo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      demo.phone?.includes(searchQuery);
    const matchesSection = demo.status === activeSection;
    return matchesSearch && matchesSection;
  });

  const getCount = (status) => demos.filter(d => d.status === status).length;

  // Generate a Jitsi meeting link for center user (moderator role)
  const generateMeetingLink = (inquiry) => {
    const meetCode = inquiry.id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const centerName = encodeURIComponent(user?.name || 'OLL Center');
    
    // Jitsi config for center moderator with lobby control enabled
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': false,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'config.enableLobby': true,
      'config.lobbyModeEnabled': true,
      'userInfo.displayName': centerName,
      'userInfo.moderator': true
    };
    
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `https://meet.jit.si/${roomName}#${configString}`;
  };

  // Check if demo is joinable (within 15 mins before to 1 hour after scheduled time)
  const isDemoJoinable = (inquiry) => {
    if (!inquiry.demo_date || !inquiry.demo_time) return false;
    if (!['new', 'demo_scheduled'].includes(inquiry.status)) return false;
    
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

  const generateCenterMapsLink = (inquiry) => {
    const centerName = inquiry.selected_center_name || inquiry.center_name || user?.center_name || 'OLL Center';
    const city = inquiry.city || '';
    const query = encodeURIComponent(`${centerName} ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  // Check if a demo is overdue
  const isOverdue = (demo) => {
    if (!demo.demo_date || demo.status !== 'new') return false;
    return isBefore(parseISO(demo.demo_date), new Date()) && !isToday(parseISO(demo.demo_date));
  };

  const overdueCount = demos.filter(d => isOverdue(d)).length;

  // Render action buttons based on status
  const renderActionButtons = (inquiry) => {
    const baseButtons = (
      <>
        <button
          onClick={() => setShowCommentModal(inquiry)}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Add Note
        </button>
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
                setShowConvertModal(inquiry);
                setConvertData({ amount: '', sessions: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Converted
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
      case 'archived':
        return <div className="flex gap-1 flex-wrap">{baseButtons}</div>;
      
      default:
        return null;
    }
  };

  if (user?.role !== 'center_user') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1E3A5F] rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {user?.center_name || 'Center Dashboard'}
                </h1>
                <p className="text-xs text-slate-500">{user?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                onClick={() => setShowAddModal(true)}
                className="bg-[#D63031] hover:bg-[#b52828] gap-2"
                data-testid="add-demo-btn"
              >
                <Plus className="w-4 h-4" />
                Add Demo
              </Button>
              <Button variant="ghost" onClick={handleLogout} className="text-slate-500">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {STATUS_SECTIONS.map(section => (
            <div 
              key={section.value}
              className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${activeSection === section.value ? 'border-[#D63031] shadow-md' : 'border-slate-100'}`}
              onClick={() => setActiveSection(section.value)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${section.color} rounded-lg flex items-center justify-center`}>
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#1E3A5F]">{getCount(section.value)}</p>
                  <p className="text-xs text-slate-500">{section.label}</p>
                </div>
              </div>
            </div>
          ))}
          {overdueCount > 0 && (
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
                  <p className="text-xs text-red-500">Overdue</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl p-4 border border-slate-100 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
        </div>

        {/* Lead Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
          </div>
        ) : filteredDemos.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <p className="text-slate-500">No leads in this section</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDemos.map((inquiry) => (
              <div 
                key={inquiry.id} 
                className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow ${isOverdue(inquiry) ? 'border-red-300 bg-red-50/30' : 'border-slate-100'}`}
                data-testid={`inquiry-card-${inquiry.id}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#1E3A5F]">{inquiry.name}</h3>
                      {isOverdue(inquiry) && (
                        <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Overdue</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" /> {inquiry.phone}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    inquiry.source?.includes('center') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
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
                      <span className={`font-medium ${inquiry.learning_mode.includes('offline') ? 'text-[#D63031]' : 'text-[#1E3A5F]'}`}>
                        {inquiry.learning_mode === 'online' ? 'Online' : 
                         inquiry.learning_mode === 'offline_center' ? 'Offline (Center)' : 
                         inquiry.learning_mode === 'offline_home' ? 'Offline (Home)' : 
                         inquiry.learning_mode.includes('offline') ? 'Offline' : 'Online'}
                      </span>
                    </p>
                  )}
                  {inquiry.demo_date && (
                    <p className={`flex items-center gap-1 ${isOverdue(inquiry) ? 'text-red-600 font-medium' : ''}`}>
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

                {/* Comments preview */}
                {inquiry.comments?.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-3">
                    <p className="text-xs text-amber-600 font-medium">
                      {inquiry.comments.length} comment{inquiry.comments.length > 1 ? 's' : ''}
                    </p>
                  </div>
                )}

                {/* View Button + Join Demo */}
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
      </main>

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
                      <p className="text-xs text-slate-500 mb-1">Age Group</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.age_group || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.source || 'website'}</p>
                    </div>
                  </div>

                  {viewInquiry.demo_date && (
                    <div className={`rounded-lg p-3 ${isOverdue(viewInquiry) ? 'bg-red-50' : 'bg-blue-50'}`}>
                      <p className={`text-xs mb-1 ${isOverdue(viewInquiry) ? 'text-red-500' : 'text-blue-500'}`}>
                        {isOverdue(viewInquiry) ? 'Demo Overdue' : 'Demo Scheduled'}
                      </p>
                      <p className={`font-medium flex items-center gap-1 ${isOverdue(viewInquiry) ? 'text-red-700' : 'text-blue-700'}`}>
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
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Demo Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D63031]" />
              Add Demo Booking
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  placeholder="Student name"
                  value={newDemo.name}
                  onChange={(e) => setNewDemo({...newDemo, name: e.target.value})}
                  data-testid="demo-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  placeholder="Phone number"
                  value={newDemo.phone}
                  onChange={(e) => setNewDemo({...newDemo, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                  data-testid="demo-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Age Group</label>
                <Select value={newDemo.age_group} onValueChange={(v) => setNewDemo({...newDemo, age_group: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select age" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map(a => (
                      <SelectItem key={a} value={a}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skill Interest</label>
                <Select value={newDemo.skill} onValueChange={(v) => setNewDemo({...newDemo, skill: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select skill" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILLS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Demo Date & Time</label>
              <div className="grid grid-cols-2 gap-3">
                <div className="border rounded-lg p-2">
                  <CalendarComponent
                    mode="single"
                    selected={newDemo.demo_date}
                    onSelect={(date) => setNewDemo({...newDemo, demo_date: date})}
                    disabled={(date) => date < new Date()}
                    className="rounded-md scale-90 origin-top-left"
                  />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-2">Select Time</p>
                  <div className="grid grid-cols-2 gap-1 max-h-[200px] overflow-y-auto">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setNewDemo({...newDemo, demo_time: time})}
                        className={`py-2 px-2 rounded-lg text-sm font-medium border transition-all ${
                          newDemo.demo_time === time
                            ? 'border-[#D63031] bg-[#D63031] text-white'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                placeholder="Any additional notes..."
                value={newDemo.notes}
                onChange={(e) => setNewDemo({...newDemo, notes: e.target.value})}
                className="min-h-[60px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleAddDemo} 
                disabled={submitting}
                className="flex-1 bg-[#D63031] hover:bg-[#b52828]"
                data-testid="submit-demo"
              >
                {submitting ? 'Adding...' : 'Add Demo'}
              </Button>
            </div>
          </div>
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

      {/* Comment Modal */}
      <Dialog open={!!showCommentModal} onOpenChange={() => setShowCommentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              Comments - {showCommentModal?.name}
            </DialogTitle>
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
              <Button onClick={handleAddComment} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white" data-testid="submit-comment">
                <Send className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CenterDashboard;
