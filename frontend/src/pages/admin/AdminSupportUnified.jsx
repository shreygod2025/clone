import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Phone, Mail, Clock, User, MessageSquare, AlertCircle, CreditCard, Wrench, HelpCircle, ThumbsUp, Building2, Send, AlertTriangle, CheckCircle, UserPlus } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { format, differenceInHours } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all', 'inquiry', 'user_support', 'legacy'
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showReplyModal, setShowReplyModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [newTicket, setNewTicket] = useState({
    name: '', phone: '', email: '', query_type: 'other', inquiry_type: 'student', message: '', priority: 'normal'
  });

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

  // Initial effect handled above

  const fetchAllQueries = async () => {
    setLoading(true);
    try {
      // Fetch all three sources: inquiry queries, user support queries, and legacy tickets
      const [inquiryResponse, supportQueriesResponse, legacyResponse] = await Promise.all([
        axios.get(`${API}/inquiry/queries`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/support/queries`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/support/tickets`, { headers: getAuthHeaders() }).catch(() => ({ data: [] }))
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
      
      setQueries([...inquiryQueries, ...supportQueries]);
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
      await axios.post(`${API}/support/queries/create`, newTicket, {
        headers: getAuthHeaders()
      });
      toast.success('Ticket created successfully');
      setShowCreateModal(false);
      setNewTicket({ name: '', phone: '', email: '', query_type: 'other', inquiry_type: 'student', message: '', priority: 'normal' });
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

  // Combine and filter all queries
  const allQueries = [...queries, ...legacyTickets];
  
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
    if (sourceFilter === 'legacy' && query._source !== 'legacy') return false;
    
    // Assignee filter
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned' && query.assigned_to) return false;
      if (assigneeFilter !== 'unassigned' && query.assigned_to !== assigneeFilter) return false;
    }
    
    // Query type filter
    if (queryTypeFilter && query.query_type !== queryTypeFilter) return false;
    
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
                  <span className={`text-xs px-2 py-0.5 rounded ${query._source === 'inquiry' ? 'bg-purple-100 text-purple-600' : query._source === 'user_support' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    {query._source === 'inquiry' ? 'Team Inquiry' : query._source === 'user_support' ? 'User Support' : 'User Ticket'}
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

              {query.query_details && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-slate-600 whitespace-pre-wrap">{query.query_details}</p>
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
    </AdminLayout>
  );
};

export default AdminSupportUnified;
