import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Phone, Mail, Clock, User, MessageSquare, AlertCircle, CreditCard, Wrench, HelpCircle, ThumbsUp, Building2, Send, AlertTriangle, CheckCircle, UserPlus, Plus, Paperclip, Mic, MicOff, X, FileText, Play, Pause, Upload, History, Edit, Trash2, StickyNote, RefreshCw } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { format, differenceInHours } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SOURCE_OPTIONS = [
  { value: 'admin_created', label: 'Admin Created' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const QUERY_TYPES = [
  { value: 'demo_related', label: 'Demo Related', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  { value: 'payment', label: 'Payment', icon: CreditCard, color: 'bg-green-100 text-green-700' },
  { value: 'payment_related', label: 'Payment Related', icon: CreditCard, color: 'bg-green-100 text-green-700' },
  { value: 'course_info', label: 'Course Info', icon: HelpCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'ongoing_classes', label: 'Ongoing Classes', icon: HelpCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'technical', label: 'Technical', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
  { value: 'partnership', label: 'Partnership', icon: Building2, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'feedback', label: 'Feedback', icon: ThumbsUp, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'educator_query', label: 'Educator Query', icon: UserPlus, color: 'bg-red-100 text-red-700' },
  { value: 'other', label: 'Other', icon: AlertCircle, color: 'bg-slate-100 text-slate-700' },
];

const INQUIRY_TYPES = [
  { value: 'student', label: 'Student' },
  { value: 'school', label: 'School' },
  { value: 'educator', label: 'Educator' },
  { value: 'growth_partner', label: 'Growth Partner' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'team', label: 'Team' },
];

// Tabs for query status
const QUERY_TABS = [
  { value: 'new', label: 'New', icon: MessageSquare, color: 'bg-blue-500' },
  { value: 'overdue', label: 'Overdue', icon: AlertTriangle, color: 'bg-red-500' },
  { value: 'closed', label: 'Closed', icon: CheckCircle, color: 'bg-green-500' },
];

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const AdminSupportUnified = () => {
  const { getAuthHeaders, user } = useAuth();
  const [queries, setQueries] = useState([]);
  const [legacyTickets, setLegacyTickets] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [queryTypeFilter, setQueryTypeFilter] = useState('');
  const [activeTab, setActiveTab] = useState('new'); // 'new', 'overdue', 'closed'
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'inquiry', 'user_support', 'tracking_page', 'legacy'
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [userTypeFilter, setUserTypeFilter] = useState('all'); // Filter by inquiry_type
  const [showReplyModal, setShowReplyModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({
    name: '', phone: '', email: '', query_type: 'other', inquiry_type: 'student', message: '', priority: 'normal', source: 'admin_created'
  });
  
  // Notes, History, Edit, Delete states
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editForm, setEditForm] = useState({});
  const [queryHistory, setQueryHistory] = useState([]);
  const [queryNotes, setQueryNotes] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Attachment & Voice Note states
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  // Autocomplete states
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState('');

  useEffect(() => {
    fetchAllQueries();
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

  // Voice Recording Functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(recordingIntervalRef.current);
    }
  };

  const togglePlayPause = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        audioPlayerRef.current.pause();
      } else {
        audioPlayerRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const removeVoiceNote = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setUploadingAttachment(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        
        setAttachments(prev => [...prev, {
          name: file.name,
          url: response.data.url,
          type: file.type,
          isVoiceNote: false
        }]);
      }
      toast.success('File(s) uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // Autocomplete search for existing records
  const searchAutocomplete = async (query, field) => {
    if (!query || query.length < 3) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/data-center/autocomplete?q=${encodeURIComponent(query)}`, {
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
    setNewTicket({
      ...newTicket,
      name: suggestion.name || suggestion.school_name || '',
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      inquiry_type: suggestion.type === 'school' ? 'school' : suggestion.type === 'educator' ? 'teacher' : 'student',
    });
    setShowAutocomplete(false);
  };

  // Initial effect handled above

  const fetchAllQueries = async () => {
    setLoading(true);
    try {
      // Fetch all sources: inquiry queries, user support queries, legacy tickets, and tracking page tickets
      const [inquiryResponse, supportQueriesResponse, legacyResponse, trackingTicketsResponse] = await Promise.all([
        axios.get(`${API}/inquiry/queries`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/support/queries`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/support/tickets`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/support/tracking-tickets`, { headers: getAuthHeaders() }).catch(() => ({ data: { tickets: [] } }))
      ]);
      
      // Add source identifier
      const inquiryQueries = (inquiryResponse.data || []).map(q => ({ ...q, _source: 'inquiry' }));
      
      // Support queries from SupportFlow.jsx (user-facing support) and Educator queries
      const supportQueries = (supportQueriesResponse.data || []).map(q => ({ 
        ...q, 
        _source: q.type === 'educator_query' ? 'educator' : 'user_support',
        query_type: q.type === 'educator_query' ? q.category : (q.category || q.main_category || 'other'),
        query_details: q.type === 'educator_query' 
          ? `[${q.category_label || ''}] ${q.subcategory_label || ''}: ${q.query || ''}`
          : (q.details || q.reason || ''),
        inquiry_type: q.type === 'educator_query' ? 'educator' : 'student',
        name: q.educator_name || q.contact_name || q.name || 'User',
        phone: q.educator_phone || q.phone || '',
        email: q.educator_email || q.email || '',
        priority: q.priority || 'normal'
      }));
      
      const legacy = (legacyResponse.data || []).map(t => ({ 
        ...t, 
        _source: 'legacy',
        query_type: t.type || 'other',
        query_details: t.message || '',
        inquiry_type: t.user_type || 'student'
      }));

      // Tracking page tickets from schools during onboarding
      const trackingTickets = (trackingTicketsResponse.data?.tickets || []).map(t => ({
        ...t,
        _source: 'tracking_page',
        query_type: t.query_type || 'other',
        query_details: t.description || `${t.query_type} - Step: ${t.step}`,
        inquiry_type: 'school',
        name: t.school_name || t.contact_name || 'School',
        phone: t.contact_phone || '',
        email: t.contact_email || '',
        priority: t.priority || 'medium'
      }));
      
      setQueries([...inquiryQueries, ...supportQueries, ...trackingTickets]);
      setLegacyTickets(legacy);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch support queries');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (query, newStatus) => {
    try {
      if (query._source === 'inquiry') {
        await axios.patch(`${API}/inquiry/queries/${query.id}`, { status: newStatus }, {
          headers: getAuthHeaders()
        });
      } else if (query._source === 'user_support') {
        await axios.patch(`${API}/support/queries/${query.id}`, { status: newStatus }, {
          headers: getAuthHeaders()
        });
      } else if (query._source === 'tracking_page') {
        await axios.patch(`${API}/support/tracking-tickets/${query.id}`, { status: newStatus }, {
          headers: getAuthHeaders()
        });
      } else {
        await axios.patch(`${API}/support/tickets/${query.id}`, { status: newStatus }, {
          headers: getAuthHeaders()
        });
      }
      toast.success('Status updated');
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error('Please enter a reply');
      return;
    }
    try {
      // Add reply as a note/comment
      if (showReplyModal._source === 'inquiry') {
        await axios.patch(`${API}/inquiry/queries/${showReplyModal.id}`, { 
          status: 'in_progress',
          query_details: `${showReplyModal.query_details}\n\n--- Admin Reply (${format(new Date(), 'MMM d, yyyy h:mm a')}) ---\n${replyText}`
        }, {
          headers: getAuthHeaders()
        });
      } else if (showReplyModal._source === 'user_support') {
        await axios.patch(`${API}/support/queries/${showReplyModal.id}`, { 
          status: 'in_progress',
          details: `${showReplyModal.query_details}\n\n--- Admin Reply (${format(new Date(), 'MMM d, yyyy h:mm a')}) ---\n${replyText}`
        }, {
          headers: getAuthHeaders()
        });
      }
      toast.success('Reply sent');
      setShowReplyModal(null);
      setReplyText('');
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to send reply');
    }
  };

  const [assignDeadline, setAssignDeadline] = useState('');

  const handleCreateTicket = async () => {
    if (!newTicket.name || !newTicket.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      // Upload voice note if exists
      let allAttachments = [...attachments];
      if (audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'voice-note.webm');
        const uploadResponse = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        allAttachments.push({
          name: 'Voice Note',
          url: uploadResponse.data.url,
          type: 'audio/webm',
          isVoiceNote: true
        });
      }
      
      await axios.post(`${API}/support/queries/create`, {
        ...newTicket,
        attachments: allAttachments
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Ticket created successfully');
      setShowCreateModal(false);
      setNewTicket({ name: '', phone: '', email: '', query_type: 'other', inquiry_type: 'student', message: '', priority: 'normal', source: 'admin_created' });
      setAttachments([]);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const handleAssignQuery = async (userId) => {
    if (!showAssignModal) return;
    try {
      // Use the new assign endpoint with deadline and notifications
      await axios.post(`${API}/support/queries/${showAssignModal.id}/assign`, {
        assigned_to: userId,
        deadline: assignDeadline || null
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Query assigned and notifications sent');
      setShowAssignModal(null);
      setAssignDeadline('');
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to assign query');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const getQueryTypeBadge = (type) => {
    const typeObj = QUERY_TYPES.find(t => t.value === type) || QUERY_TYPES[6];
    return <span className={`badge-status ${typeObj.color}`}>{typeObj.label}</span>;
  };

  // Check if query is overdue (>24 hours and not resolved/closed)
  const isOverdue = (query) => {
    if (['resolved', 'closed'].includes(query.status)) return false;
    if (!query.created_at) return false;
    const hoursSinceCreation = differenceInHours(new Date(), new Date(query.created_at));
    return hoursSinceCreation > 24;
  };

  // Add Note handler
  const handleAddNote = async () => {
    if (!noteText.trim() || !showNotesModal) {
      toast.error('Please enter a note');
      return;
    }
    try {
      await axios.post(`${API}/support/queries/${showNotesModal.id}/notes`, {
        text: noteText
      }, { headers: getAuthHeaders() });
      toast.success('Note added successfully');
      setNoteText('');
      fetchAllQueries();
      // Refresh notes
      if (showNotesModal) {
        fetchQueryHistory(showNotesModal.id);
      }
    } catch (error) {
      toast.error('Failed to add note');
    }
  };

  // Fetch Query History
  const fetchQueryHistory = async (queryId) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${API}/support/queries/${queryId}/history`, {
        headers: getAuthHeaders()
      });
      setQueryHistory(response.data.history || []);
      setQueryNotes(response.data.notes || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setQueryHistory([]);
      setQueryNotes([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Edit Query handler
  const handleEditQuery = async () => {
    if (!showEditModal) return;
    try {
      await axios.put(`${API}/support/queries/${showEditModal.id}`, editForm, {
        headers: getAuthHeaders()
      });
      toast.success('Query updated successfully');
      setShowEditModal(null);
      setEditForm({});
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to update query');
    }
  };

  // Delete Query handler
  const handleDeleteQuery = async (query) => {
    if (!window.confirm('Are you sure you want to delete this query? This action cannot be undone.')) {
      return;
    }
    try {
      await axios.delete(`${API}/support/queries/${query.id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Query deleted successfully');
      fetchAllQueries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete query');
    }
  };

  // Combine and filter all queries
  const allQueriesRaw = [...queries, ...legacyTickets];
  
  // Team members can only see queries assigned to them
  const isTeamMember = user?.role === 'team_member';
  const allQueries = isTeamMember 
    ? allQueriesRaw.filter(q => q.assigned_to === user?.id || q.assigned_to === user?.email)
    : allQueriesRaw;
  
  // Calculate tab counts
  const newCount = allQueries.filter(q => ['open', 'in_progress'].includes(q.status) && !isOverdue(q)).length;
  const overdueCount = allQueries.filter(q => isOverdue(q)).length;
  const closedCount = allQueries.filter(q => ['resolved', 'closed'].includes(q.status)).length;
  
  const filteredQueries = allQueries.filter(query => {
    // Tab filter
    if (activeTab === 'new') {
      if (!['open', 'in_progress'].includes(query.status)) return false;
      if (isOverdue(query)) return false;
    } else if (activeTab === 'overdue') {
      if (!isOverdue(query)) return false;
    } else if (activeTab === 'closed') {
      if (!['resolved', 'closed'].includes(query.status)) return false;
    }
    
    // Source filter
    if (sourceFilter === 'inquiry' && query._source !== 'inquiry') return false;
    if (sourceFilter === 'user_support' && query._source !== 'user_support') return false;
    if (sourceFilter === 'tracking_page' && query._source !== 'tracking_page') return false;
    if (sourceFilter === 'legacy' && query._source !== 'legacy') return false;
    
    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && query.assigned_to) return false;
      if (assigneeFilter !== 'unassigned' && query.assigned_to !== assigneeFilter) return false;
    }
    
    // Query type filter
    if (queryTypeFilter && query.query_type !== queryTypeFilter) return false;
    
    // User type (inquiry_type) filter
    if (userTypeFilter !== 'all' && query.inquiry_type !== userTypeFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      query.name?.toLowerCase().includes(q) ||
      query.phone?.includes(q) ||
      query.email?.toLowerCase().includes(q) ||
      query.query_details?.toLowerCase().includes(q)
    );
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <AdminLayout title="Support Center">
      {/* Team Member Banner */}
      {isTeamMember && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <p className="text-sm text-indigo-700 flex items-center gap-2">
            <User className="w-4 h-4" />
            Showing queries assigned to you. Contact admin to access other queries.
          </p>
        </div>
      )}
      
      {/* Tabs */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => setActiveTab('new')}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            activeTab === 'new'
              ? 'bg-blue-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          data-testid="tab-new"
        >
          <MessageSquare className="w-4 h-4" />
          New Queries
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'new' ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>
            {newCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('overdue')}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            activeTab === 'overdue'
              ? 'bg-red-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          data-testid="tab-overdue"
        >
          <AlertTriangle className="w-4 h-4" />
          Overdue
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'overdue' ? 'bg-white/20' : 'bg-red-100 text-red-700'}`}>
            {overdueCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('closed')}
          className={`px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            activeTab === 'closed'
              ? 'bg-green-500 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
          data-testid="tab-closed"
        >
          <CheckCircle className="w-4 h-4" />
          Closed
          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${activeTab === 'closed' ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>
            {closedCount}
          </span>
        </button>
        
        {/* Create Ticket Button */}
        <Button
          onClick={() => setShowCreateModal(true)}
          className="ml-auto bg-[#D63031] hover:bg-red-600"
          data-testid="create-ticket-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Ticket
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-queries"
          />
        </div>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="source-filter"
        >
          <option value="all">All Sources</option>
          <option value="inquiry">Team Inquiries</option>
          <option value="user_support">User Support</option>
          <option value="tracking_page">Tracking Page</option>
          <option value="legacy">Legacy Tickets</option>
        </select>
        <select
          value={queryTypeFilter}
          onChange={(e) => setQueryTypeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="query-type-filter"
        >
          <option value="">All Query Types</option>
          {QUERY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={userTypeFilter}
          onChange={(e) => setUserTypeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="user-type-filter"
        >
          <option value="all">All User Types</option>
          {INQUIRY_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
          data-testid="assignee-filter"
        >
          <option value="all">All Assignees</option>
          <option value="unassigned">Unassigned</option>
          {teamUsers.filter(u => u.is_active).map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredQueries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {activeTab === 'new' && 'No new queries'}
            {activeTab === 'overdue' && 'No overdue queries - Great job!'}
            {activeTab === 'closed' && 'No closed queries'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQueries.map((query) => (
            <div 
              key={`${query._source}-${query.id}`} 
              className={`bg-white rounded-2xl border p-6 ${isOverdue(query) ? 'border-red-300 bg-red-50/30' : 'border-slate-100'}`}
              data-testid={`query-card-${query.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div className="flex flex-wrap items-center gap-2">
                  {isOverdue(query) && (
                    <span className="badge-status bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                  <span className={`badge-status ${query.status === 'open' ? 'bg-blue-100 text-blue-700' : query.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : query.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {query.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {getQueryTypeBadge(query.query_type)}
                  <span className="text-sm text-slate-500 capitalize">
                    {INQUIRY_TYPES.find(t => t.value === query.inquiry_type)?.label || query.inquiry_type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${query._source === 'inquiry' ? 'bg-purple-100 text-purple-600' : query._source === 'user_support' ? 'bg-blue-100 text-blue-600' : query._source === 'tracking_page' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                    {query._source === 'inquiry' ? 'Team Inquiry' : query._source === 'user_support' ? 'User Support' : query._source === 'tracking_page' ? 'Tracking Page' : 'User Ticket'}
                  </span>
                </div>
                <span className="text-sm text-slate-400">
                  {query.created_at ? format(new Date(query.created_at), 'MMM d, yyyy h:mm a') : '-'}
                </span>
              </div>

              <div className="mb-4">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="flex items-center gap-1 text-slate-600">
                    <User className="w-4 h-4 text-slate-400" />
                    {query.name}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {query.phone}
                  </span>
                  {query.email && (
                    <span className="flex items-center gap-1 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" />
                      {query.email}
                    </span>
                  )}
                  {query.assigned_to && (
                    <span className="flex items-center gap-1 text-indigo-600 font-medium">
                      <UserPlus className="w-4 h-4" />
                      Assigned: {getAssignedUserName(query.assigned_to) || 'Team Member'}
                    </span>
                  )}
                </div>
              </div>

              {/* Priority & Source Row */}
              <div className="flex flex-wrap gap-3 mb-3">
                {query.priority && query.priority !== 'normal' && (
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    query.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    query.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                    query.priority === 'low' ? 'bg-slate-100 text-slate-600' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {query.priority.charAt(0).toUpperCase() + query.priority.slice(1)} Priority
                  </span>
                )}
                {query.source && query.source !== 'admin_created' && (
                  <span className="text-xs px-2 py-1 rounded bg-cyan-100 text-cyan-700">
                    Source: {SOURCE_OPTIONS.find(s => s.value === query.source)?.label || query.source}
                  </span>
                )}
              </div>

              {(query.query_details || query.message) && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-slate-600 whitespace-pre-wrap">{query.query_details || query.message}</p>
                </div>
              )}

              {/* Attachments Display */}
              {query.attachments && query.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {query.attachments.map((att, idx) => (
                      <a
                        key={idx}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          att.isVoiceNote || att.is_voice_note
                            ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {att.isVoiceNote || att.is_voice_note ? <Mic className="w-3 h-3" /> : <Paperclip className="w-3 h-3" />}
                        {att.name || 'Attachment'}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Latest Note Display */}
              {query.latest_note && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                    <StickyNote className="w-3 h-3" />
                    Latest Note:
                  </p>
                  <p className="text-sm text-amber-800">{query.latest_note}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map(status => (
                    <Button
                      key={status.value}
                      size="sm"
                      variant={query.status === status.value ? 'default' : 'outline'}
                      className={query.status === status.value ? 'bg-[#1E3A5F]' : ''}
                      onClick={() => updateStatus(query, status.value)}
                      data-testid={`query-${query.id}-status-${status.value}`}
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNotesModal(query);
                      fetchQueryHistory(query.id);
                    }}
                    className="flex items-center gap-1 text-amber-600 border-amber-200 hover:bg-amber-50"
                    data-testid={`notes-${query.id}`}
                  >
                    <StickyNote className="w-4 h-4" />
                    Notes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowHistoryModal(query);
                      fetchQueryHistory(query.id);
                    }}
                    className="flex items-center gap-1 text-purple-600 border-purple-200 hover:bg-purple-50"
                    data-testid={`history-${query.id}`}
                  >
                    <History className="w-4 h-4" />
                    History
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowReplyModal(query)}
                    className="flex items-center gap-1"
                    data-testid={`reply-${query.id}`}
                  >
                    <Send className="w-4 h-4" />
                    Reply
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignModal(query)}
                    className="flex items-center gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    data-testid={`assign-${query.id}`}
                  >
                    <UserPlus className="w-4 h-4" />
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowEditModal(query);
                      setEditForm({
                        name: query.name || '',
                        phone: query.phone || '',
                        email: query.email || '',
                        query_type: query.query_type || '',
                        inquiry_type: query.inquiry_type || '',
                        message: query.message || query.query_details || '',
                        priority: query.priority || 'normal',
                        source: query.source || ''
                      });
                    }}
                    className="flex items-center gap-1 text-blue-600 border-blue-200 hover:bg-blue-50"
                    data-testid={`edit-${query.id}`}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteQuery(query)}
                    className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                    data-testid={`delete-${query.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal */}
      <Dialog open={!!showReplyModal} onOpenChange={() => setShowReplyModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reply to Query</DialogTitle>
          </DialogHeader>
          {showReplyModal && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600 font-medium">{showReplyModal.name}</p>
                <p className="text-xs text-slate-500">{showReplyModal.phone}</p>
              </div>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply..."
                className="min-h-[120px]"
                data-testid="reply-input"
              />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowReplyModal(null)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleReply} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-reply">
                  <Send className="w-4 h-4 mr-2" />
                  Send Reply
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => { setShowAssignModal(null); setAssignDeadline(''); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Query
            </DialogTitle>
          </DialogHeader>
          {showAssignModal && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-sm text-slate-600 font-medium">{showAssignModal.name}</p>
                <p className="text-xs text-slate-500">{showAssignModal.phone}</p>
              </div>
              {showAssignModal.assigned_to && (
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
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {teamUsers.filter(u => u.is_active).map(teamUser => (
                      <button
                        key={teamUser.id}
                        onClick={() => handleAssignQuery(teamUser.id)}
                        className={`w-full p-3 rounded-lg border text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 ${
                          showAssignModal.assigned_to === teamUser.id 
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
                          {showAssignModal.assigned_to === teamUser.id && (
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Current</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Optional Deadline - Collapsible */}
              <details className="border rounded-lg p-3">
                <summary className="text-sm font-medium text-slate-600 cursor-pointer">+ Add deadline (optional)</summary>
                <div className="mt-3 space-y-2">
                  <Input
                    type="datetime-local"
                    value={assignDeadline}
                    onChange={(e) => setAssignDeadline(e.target.value)}
                    className="w-full"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  <p className="text-xs text-slate-500">Assignee will receive notification with deadline</p>
                </div>
              </details>
              
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => { setShowAssignModal(null); setAssignDeadline(''); }} className="flex-1">
                  Cancel
                </Button>
                {showAssignModal.assigned_to && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleAssignQuery('')}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    Unassign
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D63031]" />
              Create Support Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Auto-fill hint */}
            <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded-lg">
              💡 Type 3+ characters in Name, Phone, or Email to auto-fill from existing records
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Name *</label>
                <Input
                  value={newTicket.name}
                  onChange={(e) => {
                    setNewTicket({ ...newTicket, name: e.target.value });
                    searchAutocomplete(e.target.value, 'name');
                  }}
                  placeholder="Customer name"
                />
                {showAutocomplete && autocompleteField === 'name' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAutocompleteFill(s)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{s.name || s.school_name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.type}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Phone *</label>
                <Input
                  value={newTicket.phone}
                  onChange={(e) => {
                    setNewTicket({ ...newTicket, phone: e.target.value });
                    searchAutocomplete(e.target.value, 'phone');
                  }}
                  placeholder="Phone number"
                />
                {showAutocomplete && autocompleteField === 'phone' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAutocompleteFill(s)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{s.name || s.school_name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.type}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="relative">
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={newTicket.email}
                onChange={(e) => {
                  setNewTicket({ ...newTicket, email: e.target.value });
                  searchAutocomplete(e.target.value, 'email');
                }}
                placeholder="Email address"
              />
              {showAutocomplete && autocompleteField === 'email' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAutocompleteFill(s)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">{s.name || s.school_name}</p>
                      <p className="text-xs text-slate-500">{s.phone} • {s.type}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Query Type</label>
                <select
                  value={newTicket.query_type}
                  onChange={(e) => setNewTicket({ ...newTicket, query_type: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {QUERY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">User Type</label>
                <select
                  value={newTicket.inquiry_type}
                  onChange={(e) => setNewTicket({ ...newTicket, inquiry_type: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {INQUIRY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Source</label>
                <select
                  value={newTicket.source}
                  onChange={(e) => setNewTicket({ ...newTicket, source: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Message</label>
              <Textarea
                value={newTicket.message}
                onChange={(e) => setNewTicket({ ...newTicket, message: e.target.value })}
                placeholder="Describe the issue..."
                rows={3}
              />
            </div>
            
            {/* Attachments Section */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="text-sm font-medium text-slate-700">Attachments & Voice Note</label>
              
              {/* File Upload */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  className="flex items-center gap-1"
                >
                  {uploadingAttachment ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload File
                </Button>
                
                {/* Voice Recording */}
                {!audioUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`flex items-center gap-1 ${isRecording ? 'bg-red-50 border-red-300 text-red-600' : ''}`}
                  >
                    {isRecording ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop ({recordingTime}s)
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Record Voice
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 bg-purple-50 px-3 py-1 rounded-lg">
                    <audio ref={audioPlayerRef} src={audioUrl} onEnded={() => setIsPlaying(false)} />
                    <Button type="button" variant="ghost" size="sm" onClick={togglePlayPause} className="p-1">
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </Button>
                    <span className="text-xs text-purple-600">Voice Note ({recordingTime}s)</span>
                    <Button type="button" variant="ghost" size="sm" onClick={removeVoiceNote} className="p-1 text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Uploaded Files List */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-700 max-w-[150px] truncate">{att.name}</span>
                      <button type="button" onClick={() => removeAttachment(idx)} className="text-red-500 hover:text-red-700">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setShowCreateModal(false);
                setAttachments([]);
                setAudioBlob(null);
                setAudioUrl(null);
              }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} className="flex-1 bg-[#D63031] hover:bg-red-600">
                Create Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notes Modal */}
      <Dialog open={!!showNotesModal} onOpenChange={() => { setShowNotesModal(null); setNoteText(''); }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StickyNote className="w-5 h-5 text-amber-600" />
              Notes - {showNotesModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Add Note */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Add Note</label>
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Type your note here..."
                rows={3}
              />
              <Button onClick={handleAddNote} className="w-full bg-amber-600 hover:bg-amber-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </div>
            
            {/* Existing Notes */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Previous Notes ({queryNotes.length})</p>
              {loadingHistory ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                </div>
              ) : queryNotes.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No notes yet</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {queryNotes.map((note, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <p className="text-sm text-slate-700">{note.text}</p>
                      <p className="text-xs text-slate-500 mt-2">
                        By {note.by} • {note.created_at ? format(new Date(note.created_at), 'MMM d, yyyy h:mm a') : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Activity History Modal */}
      <Dialog open={!!showHistoryModal} onOpenChange={() => setShowHistoryModal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-purple-600" />
              Activity History - {showHistoryModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {loadingHistory ? (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                <p className="text-sm text-slate-500 mt-2">Loading history...</p>
              </div>
            ) : queryHistory.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No activity history</p>
            ) : (
              <div className="space-y-3">
                {queryHistory.map((item, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded-lg text-sm border-l-4 ${
                      item.type === 'created' ? 'bg-blue-50 border-blue-400' :
                      item.type === 'status_change' ? 'bg-amber-50 border-amber-400' :
                      item.type === 'note_added' ? 'bg-green-50 border-green-400' :
                      item.type === 'assigned' ? 'bg-indigo-50 border-indigo-400' :
                      item.type === 'edited' ? 'bg-orange-50 border-orange-400' :
                      'bg-slate-50 border-slate-300'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5">
                        {item.type === 'created' && <Plus className="w-4 h-4 text-blue-500" />}
                        {item.type === 'status_change' && <RefreshCw className="w-4 h-4 text-amber-500" />}
                        {item.type === 'note_added' && <StickyNote className="w-4 h-4 text-green-500" />}
                        {item.type === 'assigned' && <UserPlus className="w-4 h-4 text-indigo-500" />}
                        {item.type === 'edited' && <Edit className="w-4 h-4 text-orange-500" />}
                      </span>
                      <div className="flex-1">
                        <p className="text-slate-700">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          By {item.by} • {item.date ? format(new Date(item.date), 'MMM d, yyyy h:mm a') : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Query Modal */}
      <Dialog open={!!showEditModal} onOpenChange={() => { setShowEditModal(null); setEditForm({}); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Query
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Name</label>
                <Input
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Phone</label>
                <Input
                  value={editForm.phone || ''}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={editForm.email || ''}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Query Type</label>
                <select
                  value={editForm.query_type || ''}
                  onChange={(e) => setEditForm({ ...editForm, query_type: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {QUERY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">User Type</label>
                <select
                  value={editForm.inquiry_type || ''}
                  onChange={(e) => setEditForm({ ...editForm, inquiry_type: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {INQUIRY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Priority</label>
                <select
                  value={editForm.priority || 'normal'}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Source</label>
                <select
                  value={editForm.source || ''}
                  onChange={(e) => setEditForm({ ...editForm, source: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {SOURCE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Message/Details</label>
              <Textarea
                value={editForm.message || ''}
                onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => { setShowEditModal(null); setEditForm({}); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleEditQuery} className="flex-1 bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupportUnified;
