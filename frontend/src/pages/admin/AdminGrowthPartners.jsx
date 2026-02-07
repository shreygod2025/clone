import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Eye, Phone, Mail, Clock, Plus, ChevronRight, MessageSquare, Archive, 
  CheckCircle2, User, MapPin, Briefcase, Send, UserPlus, Edit, Save, 
  FileText, GraduationCap, CreditCard, Copy, UserX, BarChart3, ExternalLink, Package
} from 'lucide-react';
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
  { value: 'in_discussion', label: 'In Discussion', color: 'bg-purple-500' },
  { value: 'onboarding', label: 'Onboarding', color: 'bg-orange-500' },
  { value: 'active', label: 'Active Partners', color: 'bg-emerald-500' },
  { value: 'discontinued', label: 'Discontinued', color: 'bg-red-500' },
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
  const [gpOnboardings, setGpOnboardings] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [roles, setRoles] = useState([]);
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
  
  // GP Onboarding modal states
  const [showStepModal, setShowStepModal] = useState(null);
  const [showActivateModal, setShowActivateModal] = useState(null);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [stepData, setStepData] = useState({});
  
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

  // GP Onboarding steps
  const ONBOARDING_STEPS = [
    { key: 'personal_info', label: 'Personal Info', icon: User },
    { key: 'bank_details', label: 'Bank Details', icon: CreditCard },
    { key: 'contract_signing', label: 'Contract', icon: FileText },
    { key: 'payment', label: 'Payment', icon: CreditCard },
    { key: 'kit_delivery', label: 'Kit Delivery', icon: Package },
    { key: 'training', label: 'Training', icon: GraduationCap },
  ];

  // Modal state for payment verification
  const [showPaymentVerifyModal, setShowPaymentVerifyModal] = useState(null);

  useEffect(() => {
    fetchPartners();
    fetchGpOnboardings();
    fetchCities();
    fetchTeamUsers();
    fetchRoles();
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

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`, { headers: getAuthHeaders() });
      setRoles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchGpOnboardings = async () => {
    try {
      const res = await axios.get(`${API}/gp-onboarding`, { headers: getAuthHeaders() });
      setGpOnboardings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch GP onboardings:', error);
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
      
      // If converting to onboarding/converted, initiate GP onboarding
      if (newStatus === 'converted') {
        try {
          const res = await axios.post(`${API}/gp-onboarding/init/${partner.id}`, {}, {
            headers: getAuthHeaders()
          });
          // The backend automatically sets status to 'onboarding' and generates a new tracking token
          toast.success('Partner converted! Onboarding process initiated. Check the Onboarding tab.');
          // Refresh both lists to get updated data
          fetchPartners();
          fetchGpOnboardings();
          // Switch to onboarding tab to show the new onboarding
          setActiveSection('onboarding');
          return;
        } catch (onboardError) {
          console.error('Failed to initiate GP onboarding:', onboardError);
          toast.success('Status updated. Onboarding may already exist.');
        }
      } else {
        toast.success('Status updated');
      }
      fetchPartners();
      fetchGpOnboardings();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Handle starting onboarding for converted partners
  const handleStartOnboarding = async (partner) => {
    try {
      const res = await axios.post(`${API}/gp-onboarding/init/${partner.id}`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Onboarding started! Check the Onboarding tab.');
      fetchPartners();
      fetchGpOnboardings();
      // Switch to onboarding tab
      setActiveSection('onboarding');
    } catch (error) {
      console.error('Failed to start onboarding:', error);
      toast.error('Failed to start onboarding');
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

  const handleSaveEdit = async () => {
    if (!viewPartner) return;
    try {
      await axios.patch(`${API}/growth-partners/${viewPartner.id}`, {
        name: editData.name,
        phone: editData.phone,
        email: editData.email,
        city: editData.city,
        details: editData.details,
        notes: editData.notes
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Partner updated successfully');
      setEditMode(false);
      setViewPartner(null);
      fetchPartners();
    } catch (error) {
      toast.error('Failed to update partner');
    }
  };

  const handleAddViewComment = async () => {
    if (!viewComment.trim() || !viewPartner) return;
    try {
      await axios.post(`${API}/growth_partners/comment/${viewPartner.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewPartner data
      const response = await axios.get(`${API}/growth-partners`, { headers: getAuthHeaders() });
      const updated = response.data.find(i => i.id === viewPartner.id);
      if (updated) setViewPartner(updated);
      fetchPartners();
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

  // GP Onboarding Functions
  const getOnboardingForPartner = (partnerId) => {
    return gpOnboardings.find(o => o.growth_partner_id === partnerId);
  };

  const getCompletedSteps = (steps) => {
    if (!steps) return 0;
    return Object.values(steps).filter(s => s.completed).length;
  };

  const handleCompleteStep = async () => {
    if (!showStepModal) return;
    try {
      await axios.post(`${API}/gp-onboarding/${showStepModal.onboardingId}/complete-step`, {
        step: showStepModal.step,
        data: stepData
      }, { headers: getAuthHeaders() });
      toast.success(`${showStepModal.stepLabel} completed!`);
      setShowStepModal(null);
      setStepData({});
      fetchGpOnboardings();
    } catch (error) {
      toast.error('Failed to complete step');
    }
  };

  const handleActivateGP = async () => {
    if (!showActivateModal) return;
    try {
      const res = await axios.post(`${API}/gp-onboarding/${showActivateModal.id}/activate`, {
        role_id: selectedRoleId || undefined
      }, { headers: getAuthHeaders() });
      toast.success(`Growth Partner activated! Username: ${res.data.username}`);
      navigator.clipboard.writeText(res.data.temp_password);
      toast.info('Temporary password copied to clipboard');
      setShowActivateModal(null);
      setSelectedRoleId('');
      fetchGpOnboardings();
      fetchPartners();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleDiscontinueGP = async () => {
    if (!showDiscontinueModal || !discontinueReason) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await axios.post(`${API}/gp-onboarding/${showDiscontinueModal.id}/discontinue`, {
        reason: discontinueReason
      }, { headers: getAuthHeaders() });
      toast.success('Growth Partner discontinued');
      setShowDiscontinueModal(null);
      setDiscontinueReason('');
      fetchGpOnboardings();
      fetchPartners();
    } catch (error) {
      toast.error('Failed to discontinue');
    }
  };

  const copyTrackingLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/gp-track/${token}`);
    toast.success('Tracking link copied!');
  };

  const copyOnboardingLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/gp-onboard/${token}`);
    toast.success('Onboarding form link copied!');
  };

  const filteredPartners = partners.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone?.includes(searchQuery) ||
      p.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSection = p.status === activeSection;
    return matchesSearch && matchesSection;
  });

  // For onboarding/active/discontinued tabs, filter from gpOnboardings
  const filteredOnboardings = gpOnboardings.filter(o => {
    const matchesSearch = !searchQuery ||
      o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeSection === 'onboarding') return matchesSearch && o.status === 'onboarding';
    if (activeSection === 'active') return matchesSearch && o.status === 'active';
    if (activeSection === 'discontinued') return matchesSearch && o.status === 'discontinued';
    return false;
  });

  const getCount = (status) => {
    if (['onboarding', 'active', 'discontinued'].includes(status)) {
      return gpOnboardings.filter(o => o.status === status).length;
    }
    return partners.filter(p => p.status === status).length;
  };

  const renderActionButtons = (partner) => {
    const statusActions = {
      new: ['in_discussion', 'archived'],
      in_discussion: ['start_onboarding', 'archived'],
      archived: ['new'],
    };
    const actions = statusActions[partner.status] || [];
    
    return (
      <div className="flex gap-1 flex-wrap">
        {actions.map(action => (
          <button
            key={action}
            onClick={() => action === 'start_onboarding' ? handleStartOnboarding(partner) : handleStatusChange(partner, action)}
            className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium ${
              action === 'archived' 
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                : action === 'start_onboarding'
                  ? 'bg-orange-100 hover:bg-orange-200 text-orange-700'
                  : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
            }`}
            data-testid={`${action}-${partner.id}`}
          >
            {action === 'archived' ? <Archive className="w-3 h-3" /> : 
             action === 'start_onboarding' ? <GraduationCap className="w-3 h-3" /> :
             <ChevronRight className="w-3 h-3" />}
            {action === 'start_onboarding' ? 'Start Onboarding' : action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
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

      {/* Partners List / Onboarding List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : ['onboarding', 'active', 'discontinued'].includes(activeSection) ? (
        /* GP Onboarding Content */
        filteredOnboardings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              {activeSection === 'onboarding' ? 'No partners in onboarding. Convert partners to start onboarding.' :
               activeSection === 'active' ? 'No active partners yet.' : 'No discontinued partners.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOnboardings.map((gp) => (
              <div key={gp.id} className="bg-white rounded-2xl border border-slate-100 p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-[#1E3A5F]">{gp.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        gp.status === 'onboarding' ? 'bg-orange-100 text-orange-700' :
                        gp.status === 'active' ? 'bg-green-100 text-green-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {gp.status === 'onboarding' ? 'Onboarding' :
                         gp.status === 'active' ? 'Active Partner' : 'Discontinued'}
                      </span>
                      {gp.interest_type && (
                        <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                          {gp.interest_type}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap gap-3 text-sm text-slate-600">
                      {gp.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {gp.phone}</span>}
                      {gp.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {gp.email}</span>}
                      {gp.city && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {gp.city}</span>}
                    </div>

                    {/* Progress for onboarding */}
                    {gp.status === 'onboarding' && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-orange-500 transition-all"
                              style={{ width: `${(getCompletedSteps(gp.steps) / 6) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">{getCompletedSteps(gp.steps)}/6 steps</span>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {ONBOARDING_STEPS.map(step => {
                            const stepData = gp.steps?.[step.key];
                            const isCompleted = stepData?.completed;
                            const isAwaitingVerification = step.key === 'payment' && stepData?.completed && !stepData?.verified;
                            const Icon = step.icon;
                            return (
                              <button
                                key={step.key}
                                onClick={() => {
                                  if (isAwaitingVerification) {
                                    setShowPaymentVerifyModal(gp);
                                  } else if (!isCompleted) {
                                    setShowStepModal({ onboardingId: gp.id, step: step.key, stepLabel: step.label });
                                    setStepData({});
                                  }
                                }}
                                className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                                  isAwaitingVerification
                                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                                    : isCompleted 
                                      ? 'bg-green-100 text-green-700 cursor-default' 
                                      : 'bg-slate-100 text-slate-600 hover:bg-orange-100 hover:text-orange-700'
                                }`}
                              >
                                {isAwaitingVerification ? <Clock className="w-3 h-3" /> : isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Icon className="w-3 h-3" />}
                                {step.label}
                                {isAwaitingVerification && <span className="text-[10px]">(Verify)</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Active partner stats */}
                    {gp.status === 'active' && (
                      <div className="mt-3 flex gap-4">
                        <div className="text-center p-2 bg-blue-50 rounded-lg">
                          <p className="text-lg font-bold text-blue-600">{gp.total_referrals || 0}</p>
                          <p className="text-xs text-slate-500">Referrals</p>
                        </div>
                        <div className="text-center p-2 bg-green-50 rounded-lg">
                          <p className="text-lg font-bold text-green-600">{gp.successful_conversions || 0}</p>
                          <p className="text-xs text-slate-500">Conversions</p>
                        </div>
                        <div className="text-center p-2 bg-purple-50 rounded-lg">
                          <p className="text-lg font-bold text-purple-600">₹{(gp.total_earnings || 0).toLocaleString()}</p>
                          <p className="text-xs text-slate-500">Earnings</p>
                        </div>
                      </div>
                    )}

                    {/* Discontinued info */}
                    {gp.status === 'discontinued' && gp.discontinued_reason && (
                      <div className="mt-3 p-2 bg-red-50 rounded-lg">
                        <p className="text-xs text-red-600"><strong>Reason:</strong> {gp.discontinued_reason}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-wrap">
                    {gp.status === 'onboarding' && (
                      <>
                        <button
                          onClick={() => copyOnboardingLink(gp.tracking_token)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1"
                        >
                          <Copy className="w-3 h-3" /> Copy Link
                        </button>
                        {getCompletedSteps(gp.steps) === 3 && (
                          <button
                            onClick={() => setShowActivateModal(gp)}
                            className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                          >
                            <UserPlus className="w-3 h-3" /> Activate
                          </button>
                        )}
                      </>
                    )}
                    {gp.status === 'active' && (
                      <>
                        <button
                          onClick={() => setShowReportsModal(gp)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" /> Reports
                        </button>
                        <button
                          onClick={() => setShowDiscontinueModal(gp)}
                          className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1"
                        >
                          <UserX className="w-3 h-3" /> Discontinue
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setViewPartner(partners.find(p => p.id === gp.growth_partner_id) || gp)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
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

      {/* View/Edit Partner Modal */}
      <Dialog open={!!viewPartner} onOpenChange={() => { setViewPartner(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#1E3A5F]" />
                {editMode ? 'Edit Partner' : viewPartner?.name}
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(true);
                  setEditData({
                    name: viewPartner?.name || '',
                    phone: viewPartner?.phone || '',
                    email: viewPartner?.email || '',
                    city: viewPartner?.city || '',
                    details: viewPartner?.details || '',
                    notes: viewPartner?.notes || ''
                  });
                }}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewPartner && (
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
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                      <Select value={editData.city} onValueChange={(v) => setEditData({...editData, city: v})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {cities.map((city) => (
                            <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Details</label>
                    <Textarea
                      value={editData.details}
                      onChange={(e) => setEditData({...editData, details: e.target.value})}
                      placeholder="Partner details..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <Textarea
                      value={editData.notes}
                      onChange={(e) => setEditData({...editData, notes: e.target.value})}
                      placeholder="Internal notes..."
                      className="min-h-[60px]"
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
                        <Phone className="w-4 h-4" /> {viewPartner.phone}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <Mail className="w-4 h-4" /> {viewPartner.email || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">City</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {viewPartner.city || '-'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Interest Type</p>
                      <p className="font-medium text-[#1E3A5F] capitalize">{viewPartner.interest_type || '-'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="font-medium text-[#1E3A5F]">{SOURCE_OPTIONS.find(s => s.value === viewPartner.source)?.label || viewPartner.source || '-'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <p className="font-medium text-[#1E3A5F] capitalize">{viewPartner.status?.replace('_', ' ')}</p>
                    </div>
                  </div>
                  
                  {viewPartner.details && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Details</p>
                      <p className="text-slate-700">{viewPartner.details}</p>
                    </div>
                  )}

                  {viewPartner.notes && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-500 mb-1">Notes</p>
                      <p className="text-amber-900 whitespace-pre-line">{viewPartner.notes}</p>
                    </div>
                  )}

                  {/* Onboarding Link - Show for partners with onboarding */}
                  {viewPartner.status === 'onboarding' && gpOnboardings.find(o => o.growth_partner_id === viewPartner.id) && (
                    <div className="bg-indigo-50 rounded-lg p-3">
                      <p className="text-xs text-indigo-500 mb-2">Onboarding Link</p>
                      <a 
                        href={`/gp-onboard/${gpOnboardings.find(o => o.growth_partner_id === viewPartner.id)?.tracking_token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-sm flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Open Onboarding Form
                      </a>
                    </div>
                  )}

                  {/* Complete Onboarding Data - If partner has started onboarding */}
                  {(() => {
                    const onboarding = gpOnboardings.find(o => o.growth_partner_id === viewPartner.id);
                    if (!onboarding) return null;
                    return (
                      <div className="space-y-4">
                        {/* Progress Overview */}
                        <div className="bg-green-50 rounded-lg p-3">
                          <p className="text-xs text-green-600 mb-2 font-medium">Onboarding Progress</p>
                          <div className="grid grid-cols-3 gap-2">
                            {Object.entries(onboarding.steps || {}).map(([key, step]) => (
                              <div key={key} className={`p-2 rounded text-center text-xs ${step.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                {step.completed ? '✓' : '○'} {key.replace(/_/g, ' ')}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Personal Information */}
                        {onboarding.personal_info && Object.keys(onboarding.personal_info).some(k => onboarding.personal_info[k]) && (
                          <div className="bg-blue-50 rounded-lg p-3">
                            <p className="text-xs text-blue-600 mb-2 font-medium flex items-center gap-1">
                              <User className="w-3 h-3" /> Personal Information
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {onboarding.personal_info.full_name && (
                                <div><span className="text-slate-500">Name:</span> <span className="text-slate-700">{onboarding.personal_info.full_name}</span></div>
                              )}
                              {onboarding.personal_info.email && (
                                <div><span className="text-slate-500">Email:</span> <span className="text-slate-700">{onboarding.personal_info.email}</span></div>
                              )}
                              {onboarding.personal_info.phone && (
                                <div><span className="text-slate-500">Phone:</span> <span className="text-slate-700">{onboarding.personal_info.phone}</span></div>
                              )}
                              {onboarding.personal_info.city && (
                                <div><span className="text-slate-500">City:</span> <span className="text-slate-700">{onboarding.personal_info.city}</span></div>
                              )}
                              {onboarding.personal_info.state && (
                                <div><span className="text-slate-500">State:</span> <span className="text-slate-700">{onboarding.personal_info.state}</span></div>
                              )}
                              {onboarding.personal_info.pincode && (
                                <div><span className="text-slate-500">Pincode:</span> <span className="text-slate-700">{onboarding.personal_info.pincode}</span></div>
                              )}
                              {onboarding.personal_info.address && (
                                <div className="col-span-2"><span className="text-slate-500">Address:</span> <span className="text-slate-700">{onboarding.personal_info.address}</span></div>
                              )}
                              {onboarding.personal_info.aadhar_number && (
                                <div><span className="text-slate-500">Aadhar:</span> <span className="text-slate-700">{onboarding.personal_info.aadhar_number}</span></div>
                              )}
                              {onboarding.personal_info.pan_number && (
                                <div><span className="text-slate-500">PAN:</span> <span className="text-slate-700">{onboarding.personal_info.pan_number}</span></div>
                              )}
                              {onboarding.personal_info.tshirt_size && (
                                <div><span className="text-slate-500">T-Shirt Size:</span> <span className="text-slate-700">{onboarding.personal_info.tshirt_size}</span></div>
                              )}
                            </div>
                            {/* Document Links */}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {onboarding.personal_info.aadhar_url && (
                                <a href={onboarding.personal_info.aadhar_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Aadhar Card
                                </a>
                              )}
                              {onboarding.personal_info.pan_url && (
                                <a href={onboarding.personal_info.pan_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> PAN Card
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Bank Details */}
                        {onboarding.bank_details && Object.keys(onboarding.bank_details).some(k => onboarding.bank_details[k]) && (
                          <div className="bg-purple-50 rounded-lg p-3">
                            <p className="text-xs text-purple-600 mb-2 font-medium flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Bank Details
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {onboarding.bank_details.account_holder_name && (
                                <div><span className="text-slate-500">Account Holder:</span> <span className="text-slate-700">{onboarding.bank_details.account_holder_name}</span></div>
                              )}
                              {onboarding.bank_details.bank_name && (
                                <div><span className="text-slate-500">Bank:</span> <span className="text-slate-700">{onboarding.bank_details.bank_name}</span></div>
                              )}
                              {onboarding.bank_details.account_number && (
                                <div><span className="text-slate-500">Account No:</span> <span className="text-slate-700">{onboarding.bank_details.account_number}</span></div>
                              )}
                              {onboarding.bank_details.ifsc_code && (
                                <div><span className="text-slate-500">IFSC:</span> <span className="text-slate-700">{onboarding.bank_details.ifsc_code}</span></div>
                              )}
                              {onboarding.bank_details.branch && (
                                <div><span className="text-slate-500">Branch:</span> <span className="text-slate-700">{onboarding.bank_details.branch}</span></div>
                              )}
                              {onboarding.bank_details.upi_id && (
                                <div><span className="text-slate-500">UPI ID:</span> <span className="text-slate-700">{onboarding.bank_details.upi_id}</span></div>
                              )}
                            </div>
                            {onboarding.bank_details.cancelled_cheque_url && (
                              <a href={onboarding.bank_details.cancelled_cheque_url} target="_blank" rel="noopener noreferrer" className="text-xs text-purple-600 hover:underline flex items-center gap-1 mt-2">
                                <FileText className="w-3 h-3" /> Cancelled Cheque
                              </a>
                            )}
                          </div>
                        )}

                        {/* Contract Details */}
                        {(onboarding.contract_url || onboarding.contract_signed_at) && (
                          <div className="bg-amber-50 rounded-lg p-3">
                            <p className="text-xs text-amber-600 mb-2 font-medium flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Contract Details
                            </p>
                            <div className="text-sm space-y-1">
                              {onboarding.contract_signed_at && (
                                <div><span className="text-slate-500">Signed At:</span> <span className="text-slate-700">{new Date(onboarding.contract_signed_at).toLocaleString()}</span></div>
                              )}
                              {onboarding.contract_url && (
                                <a href={onboarding.contract_url} target="_blank" rel="noopener noreferrer" className="text-xs text-amber-600 hover:underline flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> View Contract
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Details */}
                        {(onboarding.payment_status || onboarding.payment_amount) && (
                          <div className="bg-emerald-50 rounded-lg p-3">
                            <p className="text-xs text-emerald-600 mb-2 font-medium flex items-center gap-1">
                              <CreditCard className="w-3 h-3" /> Payment Details
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {onboarding.payment_amount > 0 && (
                                <div><span className="text-slate-500">Amount:</span> <span className="text-slate-700">₹{onboarding.payment_amount}</span></div>
                              )}
                              {onboarding.payment_status && (
                                <div><span className="text-slate-500">Status:</span> <span className={`font-medium ${onboarding.payment_status === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>{onboarding.payment_status}</span></div>
                              )}
                              {onboarding.payment_transaction_id && (
                                <div><span className="text-slate-500">Transaction ID:</span> <span className="text-slate-700">{onboarding.payment_transaction_id}</span></div>
                              )}
                              {onboarding.payment_date && (
                                <div><span className="text-slate-500">Date:</span> <span className="text-slate-700">{onboarding.payment_date}</span></div>
                              )}
                            </div>
                            {onboarding.payment_screenshot_url && (
                              <a href={onboarding.payment_screenshot_url} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline flex items-center gap-1 mt-2">
                                <FileText className="w-3 h-3" /> Payment Screenshot
                              </a>
                            )}
                          </div>
                        )}

                        {/* Kit Delivery */}
                        {(onboarding.kit_delivery_status || onboarding.kit_tracking_number) && (
                          <div className="bg-cyan-50 rounded-lg p-3">
                            <p className="text-xs text-cyan-600 mb-2 font-medium flex items-center gap-1">
                              <Package className="w-3 h-3" /> Kit Delivery
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              {onboarding.kit_delivery_status && (
                                <div><span className="text-slate-500">Status:</span> <span className="text-slate-700">{onboarding.kit_delivery_status}</span></div>
                              )}
                              {onboarding.kit_tracking_number && (
                                <div><span className="text-slate-500">Tracking #:</span> <span className="text-slate-700">{onboarding.kit_tracking_number}</span></div>
                              )}
                              {onboarding.kit_delivery_date && (
                                <div><span className="text-slate-500">Delivery Date:</span> <span className="text-slate-700">{onboarding.kit_delivery_date}</span></div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Training Progress */}
                        {onboarding.training_progress && Object.keys(onboarding.training_progress).length > 0 && (
                          <div className="bg-orange-50 rounded-lg p-3">
                            <p className="text-xs text-orange-600 mb-2 font-medium flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> Training Progress
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              {Object.entries(onboarding.training_progress).map(([step, data]) => (
                                <div key={step} className={`text-xs p-2 rounded ${data.completed ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                                  {data.completed ? '✓' : '○'} {step.replace(/_/g, ' ')}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Comments Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comments ({viewPartner.comments?.length || 0})
                    </h4>
                    
                    {viewPartner.comments?.length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto mb-3">
                        {viewPartner.comments.map((comment, idx) => (
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
                      Created: {viewPartner.created_at ? format(new Date(viewPartner.created_at), 'MMM d, yyyy') : '-'}
                      {viewPartner.assigned_to && (
                        <span className="ml-2">| Assigned: {getAssignedUserName(viewPartner.assigned_to)}</span>
                      )}
                    </p>
                  </div>
                </>
              )}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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

      {/* GP Onboarding Step Modal */}
      <Dialog open={!!showStepModal} onOpenChange={() => setShowStepModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete: {showStepModal?.stepLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showStepModal?.step === 'personal_info' && (
              <>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-slate-700">Personal Details</h4>
                  <Input placeholder="Full Name" value={stepData.full_name || ''} onChange={(e) => setStepData({...stepData, full_name: e.target.value})} />
                  <Input type="date" placeholder="Date of Birth" value={stepData.dob || ''} onChange={(e) => setStepData({...stepData, dob: e.target.value})} />
                  <Textarea placeholder="Address" value={stepData.address || ''} onChange={(e) => setStepData({...stepData, address: e.target.value})} />
                  <Input placeholder="PAN Number" value={stepData.pan || ''} onChange={(e) => setStepData({...stepData, pan: e.target.value})} />
                </div>
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium text-sm text-slate-700">Bank Details</h4>
                  <Input placeholder="Account Holder Name" value={stepData.bank_details?.account_holder || ''} onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), account_holder: e.target.value}})} />
                  <Input placeholder="Account Number" value={stepData.bank_details?.account_number || ''} onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), account_number: e.target.value}})} />
                  <Input placeholder="IFSC Code" value={stepData.bank_details?.ifsc || ''} onChange={(e) => setStepData({...stepData, bank_details: {...(stepData.bank_details || {}), ifsc: e.target.value}})} />
                </div>
              </>
            )}
            {showStepModal?.step === 'contract_signing' && (
              <>
                <Input placeholder="Signed Contract URL" value={stepData.contract_url || ''} onChange={(e) => setStepData({...stepData, contract_url: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Student Referral %" type="number" value={stepData.commission_structure?.student_referral || ''} onChange={(e) => setStepData({...stepData, commission_structure: {...(stepData.commission_structure || {}), student_referral: e.target.value}})} />
                  <Input placeholder="School Referral %" type="number" value={stepData.commission_structure?.school_referral || ''} onChange={(e) => setStepData({...stepData, commission_structure: {...(stepData.commission_structure || {}), school_referral: e.target.value}})} />
                </div>
              </>
            )}
            {showStepModal?.step === 'training' && (
              <Textarea placeholder="Training notes" value={stepData.notes || ''} onChange={(e) => setStepData({...stepData, notes: e.target.value})} />
            )}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowStepModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleCompleteStep} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Complete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GP Activate Modal */}
      <Dialog open={!!showActivateModal} onOpenChange={() => setShowActivateModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" /> Activate Growth Partner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-green-800">{showActivateModal?.name}</p>
              <p className="text-sm text-green-600">{showActivateModal?.interest_type || 'Growth Partner'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Role (Optional)</label>
              <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Default: Growth Partner</option>
                {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
            <p className="text-sm text-slate-500">A new user account will be created. Temp password will be copied to clipboard.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowActivateModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleActivateGP} className="flex-1 bg-green-600 hover:bg-green-700">Activate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GP Discontinue Modal */}
      <Dialog open={!!showDiscontinueModal} onOpenChange={() => setShowDiscontinueModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" /> Discontinue Partner
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-800">{showDiscontinueModal?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason *</label>
              <select value={discontinueReason} onChange={(e) => setDiscontinueReason(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Select reason</option>
                <option value="Inactivity">Inactivity</option>
                <option value="Contract Violation">Contract Violation</option>
                <option value="Poor Performance">Poor Performance</option>
                <option value="Partner Request">Partner Request</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDiscontinueModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleDiscontinueGP} className="flex-1 bg-red-600 hover:bg-red-700">Discontinue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* GP Reports Modal */}
      <Dialog open={!!showReportsModal} onOpenChange={() => setShowReportsModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Partner Report: {showReportsModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{showReportsModal?.total_referrals || 0}</p>
                <p className="text-sm text-slate-600">Total Referrals</p>
              </div>
              <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{showReportsModal?.successful_conversions || 0}</p>
                <p className="text-sm text-slate-600">Conversions</p>
              </div>
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">₹{(showReportsModal?.total_earnings || 0).toLocaleString()}</p>
                <p className="text-sm text-slate-600">Total Earnings</p>
              </div>
            </div>
            {showReportsModal?.commission_structure && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-3">Commission Structure</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-slate-500">Student Referral</p>
                    <p className="text-xl font-bold text-blue-600">{showReportsModal.commission_structure.student_referral || 0}%</p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-slate-500">School Referral</p>
                    <p className="text-xl font-bold text-purple-600">{showReportsModal.commission_structure.school_referral || 0}%</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminGrowthPartners;
