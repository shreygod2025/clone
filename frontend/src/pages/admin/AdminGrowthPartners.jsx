import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Mail, Clock, Plus, ChevronRight, MessageSquare, Archive, CheckCircle2, User, MapPin, Briefcase, Send, UserPlus, Edit, Save } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-500' },
  { value: 'in_discussion', label: 'In Discussion', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const INTEREST_TYPES = [
  { value: 'franchise', label: 'Franchise' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'investment', label: 'Investment' },
  { value: 'reseller', label: 'Reseller' },
  { value: 'other', label: 'Other' },
];

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'about_page', label: 'About Page' },
  { value: 'team_inquiry_form', label: 'Team Inquiry' },
  { value: 'referral', label: 'Referral' },
  { value: 'event', label: 'Event' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'other', label: 'Other' },
];

const AdminGrowthPartners = () => {
  const { getAuthHeaders, user } = useAuth();
  const [partners, setPartners] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [cities, setCities] = useState([]);
  
  // Modal states
  const [viewPartner, setViewPartner] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', city: '', details: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Form state
  const [newPartner, setNewPartner] = useState({
    name: '',
    phone: '',
    email: '',
    city: '',
    interest_type: '',
    details: '',
    source: 'website',
  });

  useEffect(() => {
    fetchPartners();
    fetchCities();
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

  const fetchPartners = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/growth-partners`, {
        headers: getAuthHeaders()
      });
      setPartners(response.data);
    } catch (error) {
      toast.error('Failed to fetch growth partners');
    } finally {
      setLoading(false);
    }
  };

  const fetchCities = async () => {
    try {
      const response = await axios.get(`${API}/cities`);
      setCities(response.data.filter(c => c.is_active));
    } catch (error) {
      console.error('Failed to fetch cities');
    }
  };

  const handleStatusChange = async (partner, newStatus) => {
    try {
      await axios.patch(`${API}/growth-partners/${partner.id}`, { status: newStatus }, {
        headers: getAuthHeaders()
      });
      toast.success('Status updated');
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddPartner = async () => {
    if (!newPartner.name || !newPartner.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      await axios.post(`${API}/growth-partners`, {
        ...newPartner,
        email: newPartner.email || `${newPartner.phone}@partner.oll`,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Growth partner added successfully');
      setShowAddForm(false);
      setNewPartner({
        name: '',
        phone: '',
        email: '',
        city: '',
        interest_type: '',
        details: '',
        source: 'website',
      });
      fetchPartners();
    } catch (error) {
      toast.error('Failed to add partner');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/growth_partners/comment/${showCommentModal.id}`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      fetchPartners();
      // Update the view modal if open
      if (viewPartner?.id === showCommentModal.id) {
        const updated = partners.find(p => p.id === showCommentModal.id);
        if (updated) {
          setViewPartner({ ...updated, comments: [...(updated.comments || []), { text: newComment, author: user?.name || 'Admin', created_at: new Date().toISOString() }] });
        }
      }
      setShowCommentModal(null);
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/growth-partners/${showAssignModal.id}`, {
        assigned_to: userId
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead assigned successfully');
      setShowAssignModal(null);
      fetchPartners();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = p.status === activeSection;
    return matchesSearch && matchesSection;
  });

  const getCount = (status) => partners.filter(p => p.status === status).length;

  const renderActionButtons = (partner) => {
    const statusActions = {
      new: ['contacted', 'archived'],
      contacted: ['in_discussion', 'archived'],
      in_discussion: ['converted', 'archived'],
      converted: [],
      archived: ['new'],
    };
    const actions = statusActions[partner.status] || [];
    
    return (
      <div className="flex gap-1 flex-wrap">
        {actions.map(action => (
          <button
            key={action}
            onClick={() => handleStatusChange(partner, action)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium ${
              action === 'archived' 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : action === 'converted'
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
            data-testid={`${action}-${partner.id}`}
          >
            {action === 'archived' ? <Archive className="w-3 h-3" /> : 
             action === 'converted' ? <CheckCircle2 className="w-3 h-3" /> :
             <ChevronRight className="w-3 h-3" />}
            {action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
        <button
          onClick={() => setShowAssignModal(partner)}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
          data-testid={`assign-${partner.id}`}
        >
          <UserPlus className="w-3 h-3" />
          Assign
        </button>
        <button
          onClick={() => setShowCommentModal(partner)}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${partner.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Add Note
        </button>
      </div>
    );
  };

  return (
    <AdminLayout title="Growth Partners">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, phone, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="partner-search"
          />
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="btn-primary flex items-center gap-2"
          data-testid="add-partner-btn"
        >
          <Plus className="w-4 h-4" /> Add Partner
        </Button>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_SECTIONS.map((section) => (
          <button
            key={section.value}
            onClick={() => setActiveSection(section.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeSection === section.value
                ? `${section.color} text-white`
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
            data-testid={`section-${section.value}`}
          >
            {section.label} ({getCount(section.value)})
          </button>
        ))}
      </div>

      {/* Partners List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredPartners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No partners in this section</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-md transition-shadow"
              data-testid={`partner-card-${partner.id}`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-[#1E3A5F] text-lg">{partner.name}</h3>
                    {partner.interest_type && (
                      <span className="badge-status bg-purple-100 text-purple-700">
                        {INTEREST_TYPES.find(t => t.value === partner.interest_type)?.label || partner.interest_type}
                      </span>
                    )}
                    {partner.source && (
                      <span className="badge-status bg-slate-100 text-slate-600">
                        {SOURCE_OPTIONS.find(s => s.value === partner.source)?.label || partner.source}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {partner.phone}
                    </span>
                    {partner.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {partner.email}
                      </span>
                    )}
                    {partner.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {partner.city}
                      </span>
                    )}
                    {partner.assigned_to && (
                      <span className="flex items-center gap-1 text-indigo-600">
                        <UserPlus className="w-4 h-4" />
                        Assigned: {getAssignedUserName(partner.assigned_to) || 'Team Member'}
                      </span>
                    )}
                  </div>
                  {partner.details && (
                    <p className="mt-2 text-sm text-slate-600 line-clamp-2">{partner.details}</p>
                  )}
                  {partner.comments?.length > 0 && (
                    <div className="mt-2 text-xs text-purple-600">
                      <MessageSquare className="w-3 h-3 inline mr-1" />
                      {partner.comments.length} comment{partner.comments.length > 1 ? 's' : ''}
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setViewPartner(partner)}
                    className="flex items-center gap-1"
                    data-testid={`view-${partner.id}`}
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </Button>
                  {renderActionButtons(partner)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Partner Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Growth Partner</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  value={newPartner.name}
                  onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                  placeholder="Full name"
                  data-testid="add-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={newPartner.phone}
                  onChange={(e) => setNewPartner({ ...newPartner, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  placeholder="10-digit phone"
                  data-testid="add-phone"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={newPartner.email}
                onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                placeholder="Email address"
                data-testid="add-email"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <Select value={newPartner.city} onValueChange={(v) => setNewPartner({ ...newPartner, city: v })}>
                  <SelectTrigger data-testid="add-city">
                    <SelectValue placeholder="Select city" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map((city) => (
                      <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Interest Type</label>
                <Select value={newPartner.interest_type} onValueChange={(v) => setNewPartner({ ...newPartner, interest_type: v })}>
                  <SelectTrigger data-testid="add-interest">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEREST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
              <Select value={newPartner.source} onValueChange={(v) => setNewPartner({ ...newPartner, source: v })}>
                <SelectTrigger data-testid="add-source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {SOURCE_OPTIONS.map((src) => (
                    <SelectItem key={src.value} value={src.value}>{src.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
              <Textarea
                value={newPartner.details}
                onChange={(e) => setNewPartner({ ...newPartner, details: e.target.value })}
                placeholder="Additional details about the partner..."
                className="min-h-[100px]"
                data-testid="add-details"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddPartner} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-add">
                Add Partner
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Partner Modal */}
      <Dialog open={!!viewPartner} onOpenChange={() => setViewPartner(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Partner Details</DialogTitle>
          </DialogHeader>
          {viewPartner && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Name</label>
                  <p className="font-medium text-[#1E3A5F]">{viewPartner.name}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <p className="font-medium capitalize">{viewPartner.status?.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Phone</label>
                  <p className="font-medium">{viewPartner.phone}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Email</label>
                  <p className="font-medium">{viewPartner.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">City</label>
                  <p className="font-medium">{viewPartner.city || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Interest Type</label>
                  <p className="font-medium capitalize">{viewPartner.interest_type || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Source</label>
                  <p className="font-medium">{SOURCE_OPTIONS.find(s => s.value === viewPartner.source)?.label || viewPartner.source || '-'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Created</label>
                  <p className="font-medium text-sm">
                    {viewPartner.created_at ? format(new Date(viewPartner.created_at), 'MMM d, yyyy') : '-'}
                  </p>
                </div>
              </div>
              
              {viewPartner.details && (
                <div>
                  <label className="text-xs text-slate-500">Details</label>
                  <p className="text-slate-600">{viewPartner.details}</p>
                </div>
              )}

              {/* Comments Section */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-[#1E3A5F]">Comments History</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCommentModal(viewPartner)}
                    className="flex items-center gap-1"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Add Comment
                  </Button>
                </div>
                {viewPartner.comments?.length > 0 ? (
                  <div className="space-y-3 max-h-[200px] overflow-y-auto">
                    {viewPartner.comments.map((comment, idx) => (
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
                ) : (
                  <p className="text-sm text-slate-500 text-center py-4">No comments yet</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Comment Modal */}
      <Dialog open={!!showCommentModal} onOpenChange={() => setShowCommentModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Enter your comment or note..."
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

      {/* Assign Lead Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Partner - {showAssignModal?.name}
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
                    data-testid={`partner-assign-to-${teamUser.id}`}
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
    </AdminLayout>
  );
};

export default AdminGrowthPartners;
