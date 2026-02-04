import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Eye, Phone, Mail, Clock, Plus, ChevronRight, MessageSquare, Archive, 
  CheckCircle2, User, MapPin, Briefcase, Send, UserPlus, Calendar, Settings, 
  Edit2, Trash2, X, FileText, ExternalLink, CreditCard, GraduationCap, Copy,
  UserX, BarChart3
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { format } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  interview_scheduled: { label: 'Interview Scheduled', color: 'bg-purple-100 text-purple-700' },
  interviewed: { label: 'Interviewed', color: 'bg-indigo-100 text-indigo-700' },
  hired: { label: 'Hired', color: 'bg-green-100 text-green-700' },
  onboarding: { label: 'Onboarding', color: 'bg-orange-100 text-orange-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  discontinued: { label: 'Discontinued', color: 'bg-red-100 text-red-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-700' },
};

const AdminTeamApplications = () => {
  const { getAuthHeaders, user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamRequirements, setTeamRequirements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  
  // Modal states
  const [viewApplication, setViewApplication] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  const [newApplication, setNewApplication] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    role: '',
    experience: '',
    city: '',
    message: '',
    source: 'admin_added'
  });

  const [requirementForm, setRequirementForm] = useState({
    title: '',
    department: '',
    location: '',
    type: 'full_time',
    description: '',
    requirements: '',
    is_active: true
  });

  useEffect(() => {
    fetchApplications();
    fetchTeamUsers();
    fetchTeamRequirements();
  }, []);

  const fetchTeamRequirements = async () => {
    try {
      const response = await axios.get(`${API}/team-requirements`, {
        headers: getAuthHeaders()
      });
      setTeamRequirements(response.data || []);
    } catch (error) {
      console.error('Failed to fetch team requirements:', error);
    }
  };

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

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/team-applications`, {
        headers: getAuthHeaders()
      });
      setApplications(response.data || []);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch team applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (application, newStatus) => {
    try {
      await axios.patch(`${API}/team-applications/${application.id}`, {
        status: newStatus
      }, {
        headers: getAuthHeaders()
      });
      
      // If hired, initiate team onboarding
      if (newStatus === 'hired') {
        try {
          await axios.post(`${API}/team-onboarding/init/${application.id}`, {}, {
            headers: getAuthHeaders()
          });
          toast.success('Applicant hired! Onboarding process initiated.');
        } catch (onboardError) {
          console.error('Failed to initiate onboarding:', onboardError);
          toast.success('Status updated. Onboarding may already exist.');
        }
      } else {
        toast.success('Status updated');
      }
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/team_applications/comment/${showCommentModal.id}`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      fetchApplications();
      if (viewApplication?.id === showCommentModal.id) {
        const updated = applications.find(a => a.id === showCommentModal.id);
        if (updated) {
          setViewApplication({ ...updated, comments: [...(updated.comments || []), { text: newComment, author: user?.name || 'Admin', created_at: new Date().toISOString() }] });
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
      await axios.patch(`${API}/team-applications/${showAssignModal.id}`, {
        assigned_to: userId
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Application assigned successfully');
      setShowAssignModal(null);
      fetchApplications();
    } catch (error) {
      toast.error('Failed to assign application');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const handleAddApplication = async () => {
    if (!newApplication.name || !newApplication.phone || !newApplication.role) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      const submitData = {
        ...newApplication,
        phone: newApplication.countryCode + newApplication.phone
      };
      delete submitData.countryCode;
      
      await axios.post(`${API}/team-applications`, submitData, {
        headers: getAuthHeaders()
      });
      toast.success('Application added successfully');
      setShowAddForm(false);
      setNewApplication({
        name: '',
        email: '',
        phone: '',
        countryCode: '+91',
        role: '',
        experience: '',
        city: '',
        message: '',
        source: 'admin_added'
      });
      fetchApplications();
    } catch (error) {
      toast.error('Failed to add application');
    }
  };

  const handleSaveRequirement = async () => {
    if (!requirementForm.title || !requirementForm.department) {
      toast.error('Please fill required fields');
      return;
    }
    try {
      if (editingRequirement) {
        await axios.patch(`${API}/team-requirements/${editingRequirement.id}`, requirementForm, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement updated');
      } else {
        await axios.post(`${API}/team-requirements`, requirementForm, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement created');
      }
      setEditingRequirement(null);
      setRequirementForm({
        title: '',
        department: '',
        location: '',
        type: 'full_time',
        description: '',
        requirements: '',
        is_active: true
      });
      fetchTeamRequirements();
    } catch (error) {
      toast.error('Failed to save requirement');
    }
  };

  const handleDeleteRequirement = async (id) => {
    if (!window.confirm('Delete this requirement?')) return;
    try {
      await axios.delete(`${API}/team-requirements/${id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Requirement deleted');
      fetchTeamRequirements();
    } catch (error) {
      toast.error('Failed to delete requirement');
    }
  };

  const handleEditRequirement = (req) => {
    setEditingRequirement(req);
    setRequirementForm({
      title: req.title || '',
      department: req.department || '',
      location: req.location || '',
      type: req.type || 'full_time',
      description: req.description || '',
      requirements: req.requirements || '',
      is_active: req.is_active !== false
    });
  };

  const filteredApplications = applications.filter(app => {
    const matchesSearch = !searchQuery || 
      app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.phone?.includes(searchQuery) ||
      app.role?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = activeSection === 'all' || app.status === activeSection;
    
    return matchesSearch && matchesStatus;
  });

  const sections = [
    { value: 'new', label: 'New', count: applications.filter(a => a.status === 'new').length },
    { value: 'contacted', label: 'Contacted', count: applications.filter(a => a.status === 'contacted').length },
    { value: 'interview_scheduled', label: 'Interview', count: applications.filter(a => a.status === 'interview_scheduled' || a.status === 'interviewed').length },
    { value: 'hired', label: 'Hired', count: applications.filter(a => a.status === 'hired').length },
    { value: 'archived', label: 'Archived', count: applications.filter(a => a.status === 'archived' || a.status === 'rejected').length },
  ];

  const renderActionButtons = (application) => {
    const statusActions = {
      new: ['contacted', 'interview_scheduled', 'archived'],
      contacted: ['interview_scheduled', 'archived'],
      interview_scheduled: ['interviewed', 'archived'],
      interviewed: ['hired', 'rejected'],
      hired: [],
      rejected: ['new'],
      archived: ['new'],
    };
    const actions = statusActions[application.status] || [];
    
    return (
      <div className="flex gap-1 flex-wrap">
        {actions.map(action => (
          <button
            key={action}
            onClick={() => handleStatusChange(application, action)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium ${
              action === 'archived' || action === 'rejected'
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : action === 'hired'
                  ? 'bg-green-100 hover:bg-green-200 text-green-700'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
            data-testid={`${action}-${application.id}`}
          >
            {action === 'archived' || action === 'rejected' ? <Archive className="w-3 h-3" /> : 
             action === 'hired' ? <CheckCircle2 className="w-3 h-3" /> :
             <ChevronRight className="w-3 h-3" />}
            {STATUS_CONFIG[action]?.label || action.replace('_', ' ')}
          </button>
        ))}
        <button
          onClick={() => setShowAssignModal(application)}
          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
          data-testid={`assign-${application.id}`}
        >
          <UserPlus className="w-3 h-3" />
          Assign
        </button>
        <button
          onClick={() => setShowCommentModal(application)}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${application.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
      </div>
    );
  };

  return (
    <AdminLayout title="Team Applications" subtitle="Manage team member applications">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
          <Input
            placeholder="Search by name, phone, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="search-input"
          />
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowRequirementsModal(true)} 
          className="border-[#1E3A5F] text-[#1E3A5F]"
          data-testid="team-requirements-btn"
        >
          <Settings className="w-4 h-4 mr-2" />
          Team Requirements ({teamRequirements.filter(r => r.is_active).length})
        </Button>
        <Button onClick={() => setShowAddForm(true)} className="bg-[#D63031] hover:bg-[#b52828]" data-testid="add-application-btn">
          <Plus className="w-4 h-4 mr-2" />
          Add Application
        </Button>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sections.map(section => (
          <button
            key={section.value}
            onClick={() => setActiveSection(section.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeSection === section.value
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            data-testid={`tab-${section.value}`}
          >
            {section.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
              activeSection === section.value ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {section.count}
            </span>
          </button>
        ))}
      </div>

      {/* Applications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredApplications.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-2xl">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No applications found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApplications.map(application => (
            <div 
              key={application.id}
              className="bg-white rounded-xl p-5 border border-slate-100 hover:shadow-md transition-shadow"
              data-testid={`application-card-${application.id}`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-[#1E3A5F] flex items-center gap-2">
                        {application.name}
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_CONFIG[application.status]?.color || 'bg-slate-100'}`}>
                          {STATUS_CONFIG[application.status]?.label || application.status}
                        </span>
                      </h3>
                      <p className="text-sm text-slate-600">{application.role}</p>
                      {application.assigned_to && (
                        <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Assigned: {getAssignedUserName(application.assigned_to) || 'Team Member'}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setViewApplication(application)}
                      className="text-slate-400 hover:text-[#1E3A5F]"
                      data-testid={`view-${application.id}`}
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Phone className="w-4 h-4" />
                      {application.phone}
                    </span>
                    {application.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {application.email}
                      </span>
                    )}
                    {application.city && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {application.city}
                      </span>
                    )}
                    {application.experience && (
                      <span className="flex items-center gap-1">
                        <Briefcase className="w-4 h-4" />
                        {application.experience}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  {renderActionButtons(application)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Application Modal */}
      <Dialog open={!!viewApplication} onOpenChange={() => setViewApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Application Details
            </DialogTitle>
          </DialogHeader>
          {viewApplication && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Personal Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Name</label>
                    <p className="font-medium">{viewApplication.name}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Phone</label>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {viewApplication.phone}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Email</label>
                    <p className="font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {viewApplication.email || '-'}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">City</label>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {viewApplication.city || '-'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-blue-700 mb-3">Professional Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Role / Position</label>
                    <p className="font-medium">{viewApplication.role || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Experience</label>
                    <p className="font-medium">{viewApplication.experience || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Availability</label>
                    <p className="font-medium">{viewApplication.availability || '-'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Source</label>
                    <p className="font-medium capitalize">{viewApplication.source?.replace(/_/g, ' ') || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Links & Resume */}
              {(viewApplication.resume_url || viewApplication.linkedin || viewApplication.portfolio) && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-700 mb-3">Links & Documents</h4>
                  <div className="space-y-3">
                    {viewApplication.resume_url && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24">Resume:</span>
                        <a 
                          href={viewApplication.resume_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View Resume
                        </a>
                      </div>
                    )}
                    {viewApplication.linkedin && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24">LinkedIn:</span>
                        <a 
                          href={viewApplication.linkedin.startsWith('http') ? viewApplication.linkedin : `https://${viewApplication.linkedin}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {viewApplication.linkedin}
                        </a>
                      </div>
                    )}
                    {viewApplication.portfolio && (
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-24">Portfolio:</span>
                        <a 
                          href={viewApplication.portfolio.startsWith('http') ? viewApplication.portfolio : `https://${viewApplication.portfolio}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm"
                        >
                          {viewApplication.portfolio}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message / Cover Letter */}
              {viewApplication.message && (
                <div>
                  <label className="text-xs text-slate-500">Cover Letter / Message</label>
                  <p className="text-sm bg-slate-50 rounded-lg p-3 mt-1 whitespace-pre-wrap">{viewApplication.message}</p>
                </div>
              )}

              {/* Applied Position Info */}
              {viewApplication.applied_position_id && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-purple-700 mb-2">Applied Position</h4>
                  <p className="text-sm">{viewApplication.role}</p>
                </div>
              )}

              {/* Status & Assignment */}
              <div className="flex items-center gap-4 py-2 border-t border-b">
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[viewApplication.status]?.color || 'bg-slate-100 text-slate-700'}`}>
                    {STATUS_CONFIG[viewApplication.status]?.label || viewApplication.status}
                  </span>
                </div>
                {viewApplication.assigned_to && (
                  <div>
                    <label className="text-xs text-slate-500">Assigned To</label>
                    <p className="font-medium text-sm">{teamUsers.find(u => u.id === viewApplication.assigned_to)?.name || 'Unknown'}</p>
                  </div>
                )}
              </div>

              {/* Comments */}
              {viewApplication.comments?.length > 0 && (
                <div>
                  <label className="text-xs text-slate-500 mb-2 block">Comments ({viewApplication.comments.length})</label>
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {viewApplication.comments.map((comment, idx) => (
                      <div key={idx} className="bg-slate-50 rounded-lg p-3">
                        <p className="text-sm">{comment.text}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          <span>{comment.author}</span>
                          <span>•</span>
                          <span>{comment.created_at ? format(new Date(comment.created_at), 'MMM d, yyyy h:mm a') : '-'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Created: {viewApplication.created_at ? format(new Date(viewApplication.created_at), 'PPpp') : '-'}</span>
                {viewApplication.updated_at && (
                  <span>Updated: {format(new Date(viewApplication.updated_at), 'PPpp')}</span>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Application Modal */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Team Application</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  value={newApplication.name}
                  onChange={(e) => setNewApplication({...newApplication, name: e.target.value})}
                  placeholder="Full name"
                  data-testid="new-app-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <Input
                  value={newApplication.role}
                  onChange={(e) => setNewApplication({...newApplication, role: e.target.value})}
                  placeholder="Position applied for"
                  data-testid="new-app-role"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <PhoneInput
                  value={newApplication.phone}
                  onChange={(val) => setNewApplication({...newApplication, phone: val})}
                  countryCode={newApplication.countryCode}
                  onCountryCodeChange={(code) => setNewApplication({...newApplication, countryCode: code})}
                  placeholder="Phone number"
                  data-testid="new-app-phone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={newApplication.email}
                  onChange={(e) => setNewApplication({...newApplication, email: e.target.value})}
                  placeholder="Email address"
                  data-testid="new-app-email"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <Input
                  value={newApplication.city}
                  onChange={(e) => setNewApplication({...newApplication, city: e.target.value})}
                  placeholder="City"
                  data-testid="new-app-city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
                <Input
                  value={newApplication.experience}
                  onChange={(e) => setNewApplication({...newApplication, experience: e.target.value})}
                  placeholder="Years of experience"
                  data-testid="new-app-experience"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
              <Textarea
                value={newApplication.message}
                onChange={(e) => setNewApplication({...newApplication, message: e.target.value})}
                placeholder="Additional notes..."
                className="min-h-[80px]"
                data-testid="new-app-message"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddApplication} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="save-application">
                Add Application
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

      {/* Assign Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Application - {showAssignModal?.name}
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

      {/* Team Requirements Modal */}
      <Dialog open={showRequirementsModal} onOpenChange={setShowRequirementsModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-[#1E3A5F]" />
              Team Requirements / Open Positions
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-4">
              <h4 className="font-medium text-slate-700">
                {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Job Title *"
                  value={requirementForm.title}
                  onChange={(e) => setRequirementForm({ ...requirementForm, title: e.target.value })}
                  data-testid="req-title"
                />
                <Input
                  placeholder="Department *"
                  value={requirementForm.department}
                  onChange={(e) => setRequirementForm({ ...requirementForm, department: e.target.value })}
                  data-testid="req-department"
                />
                <Input
                  placeholder="Location"
                  value={requirementForm.location}
                  onChange={(e) => setRequirementForm({ ...requirementForm, location: e.target.value })}
                  data-testid="req-location"
                />
                <Select
                  value={requirementForm.type}
                  onValueChange={(value) => setRequirementForm({ ...requirementForm, type: value })}
                >
                  <SelectTrigger data-testid="req-type">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full Time</SelectItem>
                    <SelectItem value="part_time">Part Time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="internship">Internship</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Textarea
                placeholder="Job Description"
                value={requirementForm.description}
                onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                className="min-h-[80px]"
                data-testid="req-description"
              />
              <Textarea
                placeholder="Requirements (one per line)"
                value={requirementForm.requirements}
                onChange={(e) => setRequirementForm({ ...requirementForm, requirements: e.target.value })}
                className="min-h-[60px]"
                data-testid="req-requirements"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={requirementForm.is_active}
                    onCheckedChange={(checked) => setRequirementForm({ ...requirementForm, is_active: checked })}
                    data-testid="req-active"
                  />
                  <span className="text-sm text-slate-600">Active (shown on Join Team page)</span>
                </div>
                <div className="flex gap-2">
                  {editingRequirement && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingRequirement(null);
                        setRequirementForm({
                          title: '',
                          department: '',
                          location: '',
                          type: 'full_time',
                          description: '',
                          requirements: '',
                          is_active: true
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button onClick={handleSaveRequirement} className="bg-[#D63031] hover:bg-[#b52828]" data-testid="save-req">
                    {editingRequirement ? 'Update' : 'Add'} Requirement
                  </Button>
                </div>
              </div>
            </div>

            {/* Existing Requirements List */}
            <div className="space-y-3">
              <h4 className="font-medium text-slate-700">
                Current Requirements ({teamRequirements.length})
              </h4>
              {teamRequirements.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">No requirements added yet.</p>
              ) : (
                teamRequirements.map((req) => (
                  <div 
                    key={req.id}
                    className={`p-4 rounded-xl border ${req.is_active ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-100'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-semibold text-[#1E3A5F]">{req.title}</h5>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            req.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {req.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{req.department} • {req.location || 'Remote'}</p>
                        <p className="text-xs text-slate-500 mt-1">{req.type?.replace('_', ' ')}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditRequirement(req)}
                          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-[#1E3A5F]"
                          data-testid={`edit-req-${req.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRequirement(req.id)}
                          className="p-2 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600"
                          data-testid={`delete-req-${req.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    {req.description && (
                      <p className="text-sm text-slate-600 mt-2 line-clamp-2">{req.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeamApplications;
