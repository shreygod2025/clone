import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  Search, Eye, Phone, Mail, Clock, Plus, ChevronRight, MessageSquare, Archive, 
  CheckCircle2, User, MapPin, Briefcase, Send, UserPlus, Calendar, Settings, 
  Edit2, Trash2, X, FileText, ExternalLink, CreditCard, GraduationCap, Copy,
  UserX, BarChart3, PhoneCall, Users, UserCheck, Download, Upload, AlertTriangle,
  Play, Pause, Award, Building2
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
import CitySearch from '../../components/CitySearch';
import PhoneInput from '../../components/PhoneInput';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STATUS_CONFIG = {
  applicant: { label: 'Applicant', color: 'bg-blue-100 text-blue-700' },
  candidate: { label: 'Candidate', color: 'bg-purple-100 text-purple-700' },
  onboarding: { label: 'Onboarding', color: 'bg-orange-100 text-orange-700' },
  active: { label: 'Active', color: 'bg-emerald-100 text-emerald-700' },
  past_member: { label: 'Past Member', color: 'bg-slate-100 text-slate-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
  // Legacy statuses for backward compatibility
  new: { label: 'Applicant', color: 'bg-blue-100 text-blue-700' },
  contacted: { label: 'Contacted', color: 'bg-yellow-100 text-yellow-700' },
  interview_scheduled: { label: 'Interview Scheduled', color: 'bg-purple-100 text-purple-700' },
  interviewed: { label: 'Interviewed', color: 'bg-indigo-100 text-indigo-700' },
  hired: { label: 'Hired', color: 'bg-green-100 text-green-700' },
  discontinued: { label: 'Discontinued', color: 'bg-red-100 text-red-700' },
  archived: { label: 'Archived', color: 'bg-slate-100 text-slate-700' },
};

const AdminTeamApplications = () => {
  const { getAuthHeaders, user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [teamOnboardings, setTeamOnboardings] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [teamRequirements, setTeamRequirements] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('applicant');
  
  // Modal states
  const [viewApplication, setViewApplication] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [newComment, setNewComment] = useState('');
  
  // NEW PIPELINE MODAL STATES
  // Applicant Stage - Telephonic Round
  const [showTelephonicModal, setShowTelephonicModal] = useState(null);
  const [telephonicData, setTelephonicData] = useState({ outcome: '', reject_reason: '', notes: '' });
  
  // Candidate Stage - HR Interview & Dept Head
  const [showHRInterviewModal, setShowHRInterviewModal] = useState(null);
  const [hrInterviewData, setHRInterviewData] = useState({ scheduled_at: '', notes: '' });
  const [showDeptHeadModal, setShowDeptHeadModal] = useState(null);
  const [deptHeadData, setDeptHeadData] = useState({ dept_head_id: '', scheduled_at: '', notes: '' });
  
  // Candidate Stage - Interview Outcome Modals
  const [showHROutcomeModal, setShowHROutcomeModal] = useState(null);
  const [hrOutcomeData, setHROutcomeData] = useState({ outcome: '', notes: '' });
  const [showDeptHeadOutcomeModal, setShowDeptHeadOutcomeModal] = useState(null);
  const [deptHeadOutcomeData, setDeptHeadOutcomeData] = useState({ outcome: '', notes: '' });
  
  // Onboarding Stage
  const [showWelcomeEmailModal, setShowWelcomeEmailModal] = useState(null);
  const [showOfferLetterModal, setShowOfferLetterModal] = useState(null);
  const [showCreateAccountModal, setShowCreateAccountModal] = useState(null);
  const [showTrialPeriodModal, setShowTrialPeriodModal] = useState(null);
  const [trialPeriodData, setTrialPeriodData] = useState({ duration: '1_week', start_date: '' });
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(null);
  const [extendTrialData, setExtendTrialData] = useState({ extension_date: '', reason: '' });
  
  // Bulk Upload
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState(null);
  
  // Onboarding modal states (legacy)
  const [showStepModal, setShowStepModal] = useState(null);
  const [showActivateModal, setShowActivateModal] = useState(null);
  const [showDiscontinueModal, setShowDiscontinueModal] = useState(null);
  const [showReportsModal, setShowReportsModal] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [discontinueReason, setDiscontinueReason] = useState('');
  const [exitFormalities, setExitFormalities] = useState({});
  const [stepData, setStepData] = useState({});
  
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

  // Onboarding steps
  const ONBOARDING_STEPS = [
    { key: 'personal_info', label: 'Personal Info', icon: User },
    { key: 'bank_details', label: 'Bank Details', icon: CreditCard },
    { key: 'contract_signing', label: 'Contract', icon: FileText },
    { key: 'training', label: 'Training', icon: GraduationCap },
  ];

  useEffect(() => {
    fetchApplications();
    fetchTeamOnboardings();
    fetchTeamUsers();
    fetchTeamRequirements();
    fetchRoles();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API}/roles`, { headers: getAuthHeaders() });
      setRoles(res.data || []);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
    }
  };

  const fetchTeamOnboardings = async () => {
    try {
      const res = await axios.get(`${API}/team-onboarding`, { headers: getAuthHeaders() });
      setTeamOnboardings(res.data || []);
    } catch (error) {
      console.error('Failed to fetch team onboardings:', error);
    }
  };

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
      
      // If moving to active, update activation timestamp
      if (newStatus === 'active') {
        await axios.patch(`${API}/team-applications/${application.id}`, {
          activated_at: new Date().toISOString()
        }, {
          headers: getAuthHeaders()
        });
        toast.success('Team member activated!');
      } else {
        toast.success('Status updated');
      }
      fetchApplications();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // ===============================
  // NEW PIPELINE HANDLER FUNCTIONS
  // ===============================

  // APPLICANT STAGE: Complete Telephonic Round
  const handleTelephonicRound = async () => {
    if (!showTelephonicModal || !telephonicData.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    
    try {
      const updateData = {
        telephonic_round: {
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user?.name || 'Admin',
          outcome: telephonicData.outcome,
          reject_reason: telephonicData.outcome === 'rejected' ? telephonicData.reject_reason : null,
          notes: telephonicData.notes || null
        }
      };
      
      // If accepted, move to candidate stage
      if (telephonicData.outcome === 'accepted') {
        updateData.status = 'candidate';
      } else {
        updateData.status = 'rejected';
      }
      
      await axios.patch(`${API}/team-applications/${showTelephonicModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      toast.success(telephonicData.outcome === 'accepted' 
        ? 'Moved to Candidate stage!' 
        : 'Application rejected');
      setShowTelephonicModal(null);
      setTelephonicData({ outcome: '', reject_reason: '', notes: '' });
      fetchApplications();
    } catch (error) {
      console.error('Telephonic round error:', error);
      toast.error('Failed to update telephonic round');
    }
  };

  // CANDIDATE STAGE: Schedule HR Interview
  const handleScheduleHRInterview = async () => {
    if (!showHRInterviewModal || !hrInterviewData.scheduled_at) {
      toast.error('Please select interview date');
      return;
    }
    
    try {
      const updateData = {
        hr_interview: {
          ...showHRInterviewModal.hr_interview,
          scheduled: true,
          scheduled_at: hrInterviewData.scheduled_at,
          scheduled_by: user?.name || 'Admin',
          notes: hrInterviewData.notes || null,
          email_sent: true
        }
      };
      
      await axios.patch(`${API}/team-applications/${showHRInterviewModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      // Send email notification (if email exists)
      if (showHRInterviewModal.email) {
        try {
          await axios.post(`${API}/team-applications/${showHRInterviewModal.id}/send-hr-interview-email`, {
            scheduled_at: hrInterviewData.scheduled_at,
            notes: hrInterviewData.notes
          }, { headers: getAuthHeaders() });
        } catch (emailErr) {
          console.error('Email failed:', emailErr);
        }
      }
      
      toast.success('HR Interview scheduled!');
      setShowHRInterviewModal(null);
      setHRInterviewData({ scheduled_at: '', notes: '' });
      fetchApplications();
    } catch (error) {
      console.error('HR interview error:', error);
      toast.error('Failed to schedule HR interview');
    }
  };

  // CANDIDATE STAGE: Select Dept Head for Interview
  const handleSelectDeptHead = async () => {
    if (!showDeptHeadModal || !deptHeadData.dept_head_id) {
      toast.error('Please select a department head');
      return;
    }
    
    const selectedDeptHead = teamUsers.find(u => u.id === deptHeadData.dept_head_id);
    
    try {
      const updateData = {
        dept_head_interview: {
          ...showDeptHeadModal.dept_head_interview,
          assigned: true,
          dept_head_id: deptHeadData.dept_head_id,
          dept_head_name: selectedDeptHead?.name || '',
          scheduled_at: deptHeadData.scheduled_at || null,
          notes: deptHeadData.notes || null,
          notification_sent: true
        }
      };
      
      await axios.patch(`${API}/team-applications/${showDeptHeadModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      // Send notification to dept head
      if (selectedDeptHead?.email) {
        try {
          await axios.post(`${API}/team-applications/${showDeptHeadModal.id}/notify-dept-head`, {
            dept_head_email: selectedDeptHead.email,
            dept_head_name: selectedDeptHead.name,
            applicant_name: showDeptHeadModal.name,
            role: showDeptHeadModal.role
          }, { headers: getAuthHeaders() });
        } catch (notifyErr) {
          console.error('Notification failed:', notifyErr);
        }
      }
      
      toast.success(`${selectedDeptHead?.name || 'Dept Head'} assigned for interview!`);
      setShowDeptHeadModal(null);
      setDeptHeadData({ dept_head_id: '', scheduled_at: '', notes: '' });
      fetchApplications();
    } catch (error) {
      console.error('Dept head selection error:', error);
      toast.error('Failed to assign department head');
    }
  };

  // CANDIDATE STAGE: Mark HR Interview Outcome
  const handleHROutcome = async () => {
    if (!showHROutcomeModal || !hrOutcomeData.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    
    try {
      const updateData = {
        hr_interview: {
          ...showHROutcomeModal.hr_interview,
          completed: true,
          completed_at: new Date().toISOString(),
          outcome: hrOutcomeData.outcome, // 'passed' or 'failed'
          notes: hrOutcomeData.notes || showHROutcomeModal.hr_interview?.notes || null
        }
      };
      
      // If failed, automatically reject
      if (hrOutcomeData.outcome === 'failed') {
        updateData.status = 'rejected';
      }
      
      await axios.patch(`${API}/team-applications/${showHROutcomeModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      toast.success(hrOutcomeData.outcome === 'passed' 
        ? 'HR Interview passed!' 
        : 'HR Interview failed - Application rejected');
      setShowHROutcomeModal(null);
      setHROutcomeData({ outcome: '', notes: '' });
      fetchApplications();
    } catch (error) {
      console.error('HR outcome error:', error);
      toast.error('Failed to update HR interview outcome');
    }
  };

  // CANDIDATE STAGE: Mark Dept Head Interview Outcome
  const handleDeptHeadOutcome = async () => {
    if (!showDeptHeadOutcomeModal || !deptHeadOutcomeData.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    
    try {
      const updateData = {
        dept_head_interview: {
          ...showDeptHeadOutcomeModal.dept_head_interview,
          completed: true,
          completed_at: new Date().toISOString(),
          outcome: deptHeadOutcomeData.outcome, // 'selected' or 'not_selected'
          notes: deptHeadOutcomeData.notes || showDeptHeadOutcomeModal.dept_head_interview?.notes || null
        }
      };
      
      // If not selected, automatically reject
      if (deptHeadOutcomeData.outcome === 'not_selected') {
        updateData.status = 'rejected';
      }
      
      await axios.patch(`${API}/team-applications/${showDeptHeadOutcomeModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      toast.success(deptHeadOutcomeData.outcome === 'selected' 
        ? 'Candidate selected by department!' 
        : 'Candidate not selected - Application rejected');
      setShowDeptHeadOutcomeModal(null);
      setDeptHeadOutcomeData({ outcome: '', notes: '' });
      fetchApplications();
    } catch (error) {
      console.error('Dept head outcome error:', error);
      toast.error('Failed to update department interview outcome');
    }
  };

  // ONBOARDING STAGE: Send Welcome Email
  const handleSendWelcomeEmail = async () => {
    if (!showWelcomeEmailModal) return;
    
    try {
      await axios.post(`${API}/team-applications/${showWelcomeEmailModal.id}/send-welcome-email`, {}, {
        headers: getAuthHeaders()
      });
      
      await axios.patch(`${API}/team-applications/${showWelcomeEmailModal.id}`, {
        welcome_email_sent: true,
        welcome_email_sent_at: new Date().toISOString()
      }, { headers: getAuthHeaders() });
      
      toast.success('Welcome email sent!');
      setShowWelcomeEmailModal(null);
      fetchApplications();
    } catch (error) {
      console.error('Welcome email error:', error);
      toast.error('Failed to send welcome email');
    }
  };

  // ONBOARDING STAGE: Create OLL Admin Account
  const handleCreateAccount = async () => {
    if (!showCreateAccountModal || !selectedRoleId) {
      toast.error('Please select a role');
      return;
    }
    
    const selectedRole = roles.find(r => r.id === selectedRoleId);
    
    try {
      const response = await axios.post(`${API}/team-applications/${showCreateAccountModal.id}/create-account`, {
        role_id: selectedRoleId
      }, { headers: getAuthHeaders() });
      
      await axios.patch(`${API}/team-applications/${showCreateAccountModal.id}`, {
        admin_account_created: true,
        admin_role_id: selectedRoleId,
        admin_role_name: selectedRole?.name || ''
      }, { headers: getAuthHeaders() });
      
      toast.success(`Account created! Username: ${response.data.username}`);
      if (response.data.temp_password) {
        navigator.clipboard.writeText(response.data.temp_password);
        toast.info('Temporary password copied to clipboard');
      }
      setShowCreateAccountModal(null);
      setSelectedRoleId('');
      fetchApplications();
    } catch (error) {
      console.error('Create account error:', error);
      toast.error(error.response?.data?.detail || 'Failed to create account');
    }
  };

  // ONBOARDING STAGE: Generate Offer Letter
  const handleGenerateOfferLetter = async () => {
    if (!showOfferLetterModal) return;
    
    try {
      const response = await axios.post(`${API}/team-applications/${showOfferLetterModal.id}/generate-offer-letter`, {}, {
        headers: getAuthHeaders()
      });
      
      await axios.patch(`${API}/team-applications/${showOfferLetterModal.id}`, {
        offer_letter_generated: true,
        offer_letter_url: response.data.url || ''
      }, { headers: getAuthHeaders() });
      
      toast.success('Offer letter generated!');
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
      setShowOfferLetterModal(null);
      fetchApplications();
    } catch (error) {
      console.error('Offer letter error:', error);
      toast.error('Failed to generate offer letter');
    }
  };

  // ONBOARDING STAGE: Toggle Razorpay Setup / Training checkboxes
  const handleToggleOnboardingStep = async (application, field) => {
    try {
      const currentValue = application[field] || false;
      await axios.patch(`${API}/team-applications/${application.id}`, {
        [field]: !currentValue
      }, { headers: getAuthHeaders() });
      
      toast.success(currentValue 
        ? `${field === 'razorpay_setup_done' ? 'Razorpay Setup' : 'Training'} unmarked` 
        : `${field === 'razorpay_setup_done' ? 'Razorpay Setup' : 'Training'} completed!`);
      fetchApplications();
    } catch (error) {
      console.error('Toggle step error:', error);
      toast.error('Failed to update step');
    }
  };

  // ONBOARDING STAGE: Start Trial Period
  const handleStartTrialPeriod = async () => {
    if (!showTrialPeriodModal || !trialPeriodData.start_date) {
      toast.error('Please select start date');
      return;
    }
    
    // Calculate end date based on duration
    const startDate = new Date(trialPeriodData.start_date);
    let endDate = new Date(startDate);
    if (trialPeriodData.duration === '1_week') {
      endDate.setDate(endDate.getDate() + 7);
    } else {
      endDate.setMonth(endDate.getMonth() + 1);
    }
    
    try {
      await axios.patch(`${API}/team-applications/${showTrialPeriodModal.id}`, {
        trial_period: {
          duration: trialPeriodData.duration,
          start_date: trialPeriodData.start_date,
          end_date: endDate.toISOString().split('T')[0],
          extended: false,
          status: 'ongoing'
        }
      }, { headers: getAuthHeaders() });
      
      toast.success(`${trialPeriodData.duration === '1_week' ? '1 Week' : '1 Month'} trial period started!`);
      setShowTrialPeriodModal(null);
      setTrialPeriodData({ duration: '1_week', start_date: '' });
      fetchApplications();
    } catch (error) {
      console.error('Trial period error:', error);
      toast.error('Failed to start trial period');
    }
  };

  // ONBOARDING STAGE: Extend Trial Period
  const handleExtendTrial = async () => {
    if (!showExtendTrialModal || !extendTrialData.extension_date) {
      toast.error('Please select new end date');
      return;
    }
    
    try {
      await axios.patch(`${API}/team-applications/${showExtendTrialModal.id}`, {
        trial_period: {
          ...showExtendTrialModal.trial_period,
          extended: true,
          end_date: extendTrialData.extension_date,
          extension_reason: extendTrialData.reason || null
        }
      }, { headers: getAuthHeaders() });
      
      toast.success('Trial period extended!');
      setShowExtendTrialModal(null);
      setExtendTrialData({ extension_date: '', reason: '' });
      fetchApplications();
    } catch (error) {
      console.error('Extend trial error:', error);
      toast.error('Failed to extend trial');
    }
  };

  // ACTIVE STAGE: Add to WhatsApp Group
  const handleWhatsAppGroupAdd = async (application) => {
    try {
      await axios.patch(`${API}/team-applications/${application.id}`, {
        whatsapp_group_added: true,
        whatsapp_group_added_at: new Date().toISOString()
      }, { headers: getAuthHeaders() });
      
      // Optionally trigger WhatsApp notification
      try {
        await axios.post(`${API}/team-applications/${application.id}/whatsapp-group-notification`, {}, {
          headers: getAuthHeaders()
        });
      } catch (waErr) {
        console.error('WhatsApp notification failed:', waErr);
      }
      
      toast.success('Added to WhatsApp group!');
      fetchApplications();
    } catch (error) {
      console.error('WhatsApp group error:', error);
      toast.error('Failed to add to WhatsApp group');
    }
  };

  // Discontinue/Exit handler update
  const handleDiscontinueApplication = async () => {
    if (!showDiscontinueModal || !discontinueReason) {
      toast.error('Please provide a reason');
      return;
    }
    
    try {
      await axios.patch(`${API}/team-applications/${showDiscontinueModal.id}`, {
        status: 'past_member',
        exit_date: new Date().toISOString(),
        exit_reason: discontinueReason,
        account_deactivated: true
      }, { headers: getAuthHeaders() });
      
      // Deactivate team user if exists
      if (showDiscontinueModal.admin_account_created) {
        try {
          await axios.post(`${API}/team-applications/${showDiscontinueModal.id}/deactivate-account`, {}, {
            headers: getAuthHeaders()
          });
        } catch (deactErr) {
          console.error('Deactivate account error:', deactErr);
        }
      }
      
      toast.success('Team member moved to past members');
      setShowDiscontinueModal(null);
      setDiscontinueReason('');
      fetchApplications();
    } catch (error) {
      console.error('Discontinue error:', error);
      toast.error('Failed to discontinue');
    }
  };

  // ===============================
  // BULK UPLOAD HANDLERS
  // ===============================

  // Download Excel Template
  const handleDownloadTemplate = () => {
    // Create template CSV with headers
    const headers = [
      'Name*', 'Email*', 'Phone*', 'City*', 'Role', 'Experience', 
      'Availability', 'LinkedIn', 'Portfolio', 'Message'
    ];
    const sampleRow = [
      'John Doe', 'john@example.com', '+919876543210', 'Mumbai', 
      'Software Developer', '3-5 years', 'Full-time', 
      'https://linkedin.com/in/johndoe', 'https://portfolio.com', 
      'Looking forward to joining the team'
    ];
    
    const csvContent = [
      headers.join(','),
      sampleRow.join(','),
      // Add empty rows for user to fill
      '', '', ''
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team_applications_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Template downloaded! Fill in the data and upload.');
  };

  // Handle Bulk Upload
  const handleBulkUpload = async () => {
    if (!bulkUploadFile) {
      toast.error('Please select a file');
      return;
    }
    
    setBulkUploadLoading(true);
    setBulkUploadResults(null);
    
    try {
      const formData = new FormData();
      formData.append('file', bulkUploadFile);
      
      const response = await axios.post(`${API}/team-applications/bulk-upload`, formData, {
        headers: {
          ...getAuthHeaders(),
        }
      });
      
      setBulkUploadResults(response.data);
      toast.success(`Uploaded ${response.data.success_count || 0} applications`);
      if (response.data.success_count > 0) {
        fetchApplications();
      }
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload applications');
      setBulkUploadResults({ error: error.response?.data?.detail || 'Upload failed' });
    } finally {
      setBulkUploadLoading(false);
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
    
    // Status mapping for backward compatibility
    let matchesStatus = false;
    if (activeSection === 'all') {
      matchesStatus = true;
    } else if (activeSection === 'applicant') {
      matchesStatus = app.status === 'applicant' || app.status === 'new';
    } else if (activeSection === 'rejected') {
      matchesStatus = app.status === 'rejected' || app.status === 'archived';
    } else {
      matchesStatus = app.status === activeSection;
    }
    
    return matchesSearch && matchesStatus;
  });

  const sections = [
    { value: 'applicant', label: 'Applicants', count: applications.filter(a => a.status === 'applicant' || a.status === 'new').length, color: 'bg-blue-500' },
    { value: 'candidate', label: 'Candidates', count: applications.filter(a => a.status === 'candidate').length, color: 'bg-purple-500' },
    { value: 'onboarding', label: 'Onboarding', count: applications.filter(a => a.status === 'onboarding').length, color: 'bg-orange-500' },
    { value: 'active', label: 'Active', count: applications.filter(a => a.status === 'active').length, color: 'bg-emerald-500' },
    { value: 'past_member', label: 'Past Members', count: applications.filter(a => a.status === 'past_member').length, color: 'bg-slate-400' },
    { value: 'rejected', label: 'Rejected', count: applications.filter(a => a.status === 'rejected' || a.status === 'archived').length, color: 'bg-red-500' },
  ];

  // Helper functions for onboarding
  const getCompletedSteps = (steps) => {
    if (!steps) return 0;
    return Object.values(steps).filter(s => s.completed).length;
  };

  const copyTrackingLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/team-track/${token}`);
    toast.success('Tracking link copied!');
  };

  const filteredOnboardings = teamOnboardings.filter(o => {
    const matchesSearch = !searchQuery ||
      o.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.phone?.includes(searchQuery) ||
      o.email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeSection === 'onboarding') return matchesSearch && o.status === 'onboarding';
    if (activeSection === 'active') return matchesSearch && o.status === 'active';
    if (activeSection === 'discontinued') return matchesSearch && o.status === 'discontinued';
    return false;
  });

  const handleCompleteStep = async () => {
    if (!showStepModal) return;
    try {
      await axios.post(`${API}/team-onboarding/${showStepModal.onboardingId}/complete-step`, {
        step: showStepModal.step,
        data: stepData
      }, { headers: getAuthHeaders() });
      toast.success(`${showStepModal.stepLabel} completed!`);
      setShowStepModal(null);
      setStepData({});
      fetchTeamOnboardings();
    } catch (error) {
      toast.error('Failed to complete step');
    }
  };

  const handleActivate = async () => {
    if (!showActivateModal || !selectedRoleId) {
      toast.error('Please select a role');
      return;
    }
    try {
      const res = await axios.post(`${API}/team-onboarding/${showActivateModal.id}/activate`, {
        role_id: selectedRoleId
      }, { headers: getAuthHeaders() });
      toast.success(`Team member activated! Username: ${res.data.username}`);
      navigator.clipboard.writeText(res.data.temp_password);
      toast.info('Temporary password copied to clipboard');
      setShowActivateModal(null);
      setSelectedRoleId('');
      fetchTeamOnboardings();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to activate');
    }
  };

  const handleDiscontinue = async () => {
    if (!showDiscontinueModal || !discontinueReason) {
      toast.error('Please provide a reason');
      return;
    }
    try {
      await axios.post(`${API}/team-onboarding/${showDiscontinueModal.id}/discontinue`, {
        reason: discontinueReason,
        exit_formalities: exitFormalities
      }, { headers: getAuthHeaders() });
      toast.success('Team member discontinued');
      setShowDiscontinueModal(null);
      setDiscontinueReason('');
      setExitFormalities({ assets_returned: false, access_revoked: false, final_settlement: false, exit_interview: false, notes: '' });
      fetchTeamOnboardings();
    } catch (error) {
      toast.error('Failed to discontinue');
    }
  };

  const fetchTeamMemberReport = async (member) => {
    if (!member?.team_user_id) {
      toast.error('No team user associated with this member');
      return;
    }
    setShowReportsModal(member);
    setReportLoading(true);
    try {
      const res = await axios.get(`${API}/admin/reports/team-member/${member.team_user_id}`, {
        headers: getAuthHeaders()
      });
      setReportData(res.data);
    } catch (error) {
      console.error('Failed to fetch report:', error);
      toast.error('Failed to load report');
    } finally {
      setReportLoading(false);
    }
  };

  const renderActionButtons = (application) => {
    const status = application.status;
    
    // NEW PIPELINE: applicant -> candidate -> onboarding -> active -> past_member / rejected
    return (
      <div className="flex gap-1 flex-wrap">
        {/* APPLICANT STAGE ACTIONS */}
        {(status === 'applicant' || status === 'new') && (
          <>
            {/* Telephonic Round */}
            <button
              onClick={() => {
                setTelephonicData({ outcome: '', reject_reason: '', notes: '' });
                setShowTelephonicModal(application);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`telephonic-${application.id}`}
            >
              <PhoneCall className="w-3 h-3" />
              Telephonic Round
            </button>
            {/* Call button */}
            <a
              href={`tel:${application.phone}`}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`call-${application.id}`}
            >
              <Phone className="w-3 h-3" />
              Call
            </a>
            {/* Reject */}
            <button
              onClick={() => handleStatusChange(application, 'rejected')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`reject-${application.id}`}
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </>
        )}
        
        {/* CANDIDATE STAGE ACTIONS */}
        {status === 'candidate' && (
          <>
            {/* Schedule HR Interview */}
            {!application.hr_interview?.scheduled && (
              <button
                onClick={() => {
                  setHRInterviewData({ scheduled_at: '', notes: '' });
                  setShowHRInterviewModal(application);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
                data-testid={`schedule-hr-${application.id}`}
              >
                <Calendar className="w-3 h-3" />
                Schedule HR Interview
              </button>
            )}
            {/* HR Interview Scheduled - Mark Outcome */}
            {application.hr_interview?.scheduled && !application.hr_interview?.completed && (
              <button
                onClick={() => {
                  setHROutcomeData({ outcome: '', notes: '' });
                  setShowHROutcomeModal(application);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
                data-testid={`hr-outcome-${application.id}`}
              >
                <Clock className="w-3 h-3" />
                HR: {format(new Date(application.hr_interview.scheduled_at), 'MMM d')} - Mark Result
              </button>
            )}
            {/* HR Interview Completed indicator */}
            {application.hr_interview?.completed && (
              <span className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                application.hr_interview.outcome === 'passed' 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {application.hr_interview.outcome === 'passed' ? (
                  <><CheckCircle2 className="w-3 h-3" /> HR: Passed</>
                ) : (
                  <><X className="w-3 h-3" /> HR: Failed</>
                )}
              </span>
            )}
            
            {/* Select Dept Head */}
            {!application.dept_head_interview?.assigned && (
              <button
                onClick={() => {
                  setDeptHeadData({ dept_head_id: '', scheduled_at: '', notes: '' });
                  setShowDeptHeadModal(application);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
                data-testid={`select-depthead-${application.id}`}
              >
                <Users className="w-3 h-3" />
                Select Dept Head
              </button>
            )}
            {/* Dept Head Assigned - Mark Outcome */}
            {application.dept_head_interview?.assigned && !application.dept_head_interview?.completed && (
              <button
                onClick={() => {
                  setDeptHeadOutcomeData({ outcome: '', notes: '' });
                  setShowDeptHeadOutcomeModal(application);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
                data-testid={`depthead-outcome-${application.id}`}
              >
                <UserCheck className="w-3 h-3" />
                {application.dept_head_interview.dept_head_name || 'Dept Head'} - Mark Result
              </button>
            )}
            {/* Dept Head Interview Completed indicator */}
            {application.dept_head_interview?.completed && (
              <span className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                application.dept_head_interview.outcome === 'selected' 
                  ? 'bg-green-50 text-green-600' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {application.dept_head_interview.outcome === 'selected' ? (
                  <><CheckCircle2 className="w-3 h-3" /> Dept: Selected</>
                ) : (
                  <><X className="w-3 h-3" /> Dept: Not Selected</>
                )}
              </span>
            )}
            
            {/* Move to Onboarding (if both interviews passed) */}
            {application.hr_interview?.completed && 
             application.hr_interview?.outcome === 'passed' &&
             application.dept_head_interview?.completed && 
             application.dept_head_interview?.outcome === 'selected' && (
              <button
                onClick={() => handleStatusChange(application, 'onboarding')}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 font-medium"
                data-testid={`move-onboarding-${application.id}`}
              >
                <ChevronRight className="w-3 h-3" />
                Move to Onboarding
              </button>
            )}
            {/* Reject */}
            <button
              onClick={() => handleStatusChange(application, 'rejected')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`reject-candidate-${application.id}`}
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </>
        )}
        
        {/* ONBOARDING STAGE ACTIONS */}
        {status === 'onboarding' && (
          <>
            {/* Welcome Email with Handbook */}
            {!application.welcome_email_sent && (
              <button
                onClick={() => setShowWelcomeEmailModal(application)}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
                data-testid={`welcome-email-${application.id}`}
              >
                <Mail className="w-3 h-3" />
                Send Welcome Email
              </button>
            )}
            {application.welcome_email_sent && (
              <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Welcome Sent
              </span>
            )}
            
            {/* Razorpay Setup Checkbox */}
            <button
              onClick={() => handleToggleOnboardingStep(application, 'razorpay_setup')}
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all ${
                application.razorpay_setup_done
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              data-testid={`razorpay-setup-${application.id}`}
            >
              {application.razorpay_setup_done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-400 rounded" />
              )}
              Razorpay Setup
            </button>
            
            {/* Training Checkbox */}
            <button
              onClick={() => handleToggleOnboardingStep(application, 'training_done')}
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 font-medium transition-all ${
                application.training_done
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              data-testid={`training-${application.id}`}
            >
              {application.training_done ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-400 rounded" />
              )}
              Training
            </button>
            
            {/* Activate Member - Only shows when Razorpay & Training are both done */}
            {application.razorpay_setup_done && application.training_done && (
              <button
                onClick={() => handleStatusChange(application, 'active')}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 font-medium"
                data-testid={`activate-${application.id}`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Activate Member
              </button>
            )}
            
            {/* Reject during onboarding */}
            <button
              onClick={() => handleStatusChange(application, 'rejected')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`reject-onboarding-${application.id}`}
            >
              <X className="w-3 h-3" />
              Reject
            </button>
          </>
        )}
        
        {/* ACTIVE STAGE ACTIONS */}
        {status === 'active' && (
          <>
            {/* WhatsApp Group */}
            {!application.whatsapp_group_added && (
              <button
                onClick={() => handleWhatsAppGroupAdd(application)}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                data-testid={`whatsapp-group-${application.id}`}
              >
                <MessageSquare className="w-3 h-3" />
                Add to WhatsApp Group
              </button>
            )}
            {application.whatsapp_group_added && (
              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-600">✓ In WhatsApp Group</span>
            )}
            
            {/* Move to Past Member */}
            <button
              onClick={() => setShowDiscontinueModal(application)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium"
              data-testid={`discontinue-${application.id}`}
            >
              <UserX className="w-3 h-3" />
              Exit/Discontinue
            </button>
          </>
        )}
        
        {/* PAST MEMBER / REJECTED ACTIONS */}
        {(status === 'past_member' || status === 'rejected' || status === 'archived') && (
          <button
            onClick={() => handleStatusChange(application, 'applicant')}
            className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
            data-testid={`restore-${application.id}`}
          >
            <ChevronRight className="w-3 h-3" />
            Restore to Applicant
          </button>
        )}
        
        {/* Common actions for all statuses */}
        <button
          onClick={() => setShowAssignModal(application)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
          data-testid={`assign-${application.id}`}
        >
          <UserPlus className="w-3 h-3" />
          Assign
        </button>
        <button
          onClick={() => setShowCommentModal(application)}
          className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
          data-testid={`comment-${application.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
      </div>
    );
  };

  const exportApplicationsToCSV = () => {
    const filtered = applications.filter(app => {
      const matchesSearch = !searchQuery ||
        app.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        app.phone?.includes(searchQuery) ||
        app.role?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSection = activeSection === 'all' || app.status === activeSection;
      return matchesSearch && matchesSection;
    });
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Status', 'Applied On', 'City', 'Experience'];
    const rows = filtered.map(app => [
      app.name || '',
      app.email || '',
      app.phone || '',
      app.role || '',
      app.status || '',
      app.created_at ? new Date(app.created_at).toLocaleDateString('en-IN') : '',
      app.city || '',
      app.experience || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team_applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} applications`);
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
        {/* Download Template Button */}
        <Button 
          variant="outline" 
          onClick={handleDownloadTemplate}
          className="border-slate-300 text-slate-700"
          data-testid="download-template-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Template
        </Button>
        {/* Export CSV Button */}
        <Button 
          variant="outline" 
          onClick={exportApplicationsToCSV}
          className="border-green-300 text-green-700 hover:bg-green-50"
          data-testid="export-applications-csv-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        {/* Bulk Upload Button */}
        <Button 
          variant="outline" 
          onClick={() => setShowBulkUploadModal(true)}
          className="border-emerald-500 text-emerald-600 hover:bg-emerald-50"
          data-testid="bulk-upload-btn"
        >
          <Upload className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
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
                ? `${section.color} text-white`
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
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
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {activeSection === 'applicant' ? 'No new applicants.' :
             activeSection === 'candidate' ? 'No candidates in interview process.' :
             activeSection === 'onboarding' ? 'No team members in onboarding. Move candidates here after interviews pass.' :
             activeSection === 'active' ? 'No active team members yet.' :
             activeSection === 'past_member' ? 'No past members.' :
             'No rejected applications.'}
          </p>
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
                <CitySearch
                  value={newApplication.city}
                  onChange={(city) => setNewApplication({...newApplication, city})}
                  placeholder="Search city..."
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

      {/* Team Onboarding Step Modal */}
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
                  <Input placeholder="Emergency Contact Name" value={stepData.emergency_contact_name || ''} onChange={(e) => setStepData({...stepData, emergency_contact_name: e.target.value})} />
                  <Input placeholder="Emergency Contact Phone" value={stepData.emergency_contact_phone || ''} onChange={(e) => setStepData({...stepData, emergency_contact_phone: e.target.value})} />
                </div>
              </>
            )}
            {showStepModal?.step === 'bank_details' && (
              <>
                <div className="space-y-3">
                  <h4 className="font-medium text-sm text-slate-700">Bank Details</h4>
                  <Input placeholder="Account Holder Name" value={stepData.account_holder || ''} onChange={(e) => setStepData({...stepData, account_holder: e.target.value})} />
                  <Input placeholder="Account Number" value={stepData.account_number || ''} onChange={(e) => setStepData({...stepData, account_number: e.target.value})} />
                  <Input placeholder="IFSC Code" value={stepData.ifsc || ''} onChange={(e) => setStepData({...stepData, ifsc: e.target.value})} />
                  <Input placeholder="Bank Name" value={stepData.bank_name || ''} onChange={(e) => setStepData({...stepData, bank_name: e.target.value})} />
                  <Input placeholder="PAN Number" value={stepData.pan || ''} onChange={(e) => setStepData({...stepData, pan: e.target.value})} />
                </div>
              </>
            )}
            {showStepModal?.step === 'contract_signing' && (
              <>
                <Input placeholder="Signed Contract Document URL" value={stepData.contract_url || ''} onChange={(e) => setStepData({...stepData, contract_url: e.target.value})} />
                <p className="text-sm text-slate-500">Upload the signed contract and paste the URL above</p>
              </>
            )}
            {showStepModal?.step === 'training' && (
              <>
                <Textarea placeholder="Training completion notes" value={stepData.notes || ''} onChange={(e) => setStepData({...stepData, notes: e.target.value})} />
                <p className="text-sm text-slate-500">Add any notes about the training completion</p>
              </>
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

      {/* Activate Team Member Modal */}
      <Dialog open={!!showActivateModal} onOpenChange={() => setShowActivateModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-green-600" /> Activate Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="font-medium text-green-800">{showActivateModal?.name}</p>
              <p className="text-sm text-green-600">{showActivateModal?.role || 'Team Member'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Assign Role *</label>
              <select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Select role</option>
                {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
            </div>
            <p className="text-sm text-slate-500">A new user account will be created. Temp password will be copied to clipboard.</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowActivateModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleActivate} className="flex-1 bg-green-600 hover:bg-green-700">Activate</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Discontinue Team Member Modal */}
      <Dialog open={!!showDiscontinueModal} onOpenChange={() => setShowDiscontinueModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <UserX className="w-5 h-5" /> Discontinue Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="font-medium text-red-800">{showDiscontinueModal?.name}</p>
              <p className="text-sm text-red-600">{showDiscontinueModal?.role}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason *</label>
              <select value={discontinueReason} onChange={(e) => setDiscontinueReason(e.target.value)} className="w-full h-10 px-3 border border-slate-200 rounded-lg">
                <option value="">Select reason</option>
                <option value="Resignation">Resignation</option>
                <option value="Termination">Termination</option>
                <option value="Contract End">Contract End</option>
                <option value="Performance Issues">Performance Issues</option>
                <option value="Misconduct">Misconduct</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Exit Formalities Checklist</p>
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg">
                {['assets_returned', 'access_revoked', 'final_settlement', 'exit_interview'].map(item => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input 
                      type="checkbox" 
                      checked={exitFormalities[item] || false}
                      onChange={(e) => setExitFormalities({...exitFormalities, [item]: e.target.checked})}
                      className="rounded"
                    />
                    {item.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDiscontinueModal(null)} className="flex-1">Cancel</Button>
              <Button onClick={handleDiscontinue} className="flex-1 bg-red-600 hover:bg-red-700">Discontinue</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Member Reports Modal */}
      <Dialog open={!!showReportsModal} onOpenChange={() => { setShowReportsModal(null); setReportData(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" /> Team Member Report: {showReportsModal?.name}
            </DialogTitle>
          </DialogHeader>
          {reportLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="text-slate-500 mt-3">Loading report...</p>
            </div>
          ) : reportData ? (
            <div className="space-y-4">
              {/* Member Info */}
              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><span className="text-slate-500">Role:</span> <span className="font-medium">{reportData.member_info?.role || '-'}</span></div>
                  <div><span className="text-slate-500">City:</span> <span className="font-medium">{reportData.member_info?.city || '-'}</span></div>
                  <div><span className="text-slate-500">Status:</span> <span className="font-medium capitalize">{reportData.member_info?.status || '-'}</span></div>
                </div>
              </div>
              
              {/* Key Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{(reportData.students?.assigned || 0) + (reportData.schools?.assigned || 0)}</p>
                  <p className="text-sm text-slate-600">Total Leads</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{(reportData.students?.converted || 0) + (reportData.schools?.converted || 0)}</p>
                  <p className="text-sm text-slate-600">Conversions</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{reportData.demos?.completed || 0}</p>
                  <p className="text-sm text-slate-600">Demos Done</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-orange-600">{reportData.support?.resolved || 0}</p>
                  <p className="text-sm text-slate-600">Tickets Resolved</p>
                </div>
              </div>
              
              {/* Detailed Breakdown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Students</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Assigned</span><span className="font-medium">{reportData.students?.assigned || 0}</span></div>
                    <div className="flex justify-between"><span>Converted</span><span className="font-medium text-green-600">{reportData.students?.converted || 0}</span></div>
                    <div className="flex justify-between"><span>Conversion Rate</span><span className="font-medium">{reportData.students?.conversion_rate || 0}%</span></div>
                  </div>
                </div>
                <div className="bg-white border rounded-xl p-4">
                  <h4 className="font-medium text-slate-700 mb-3">Schools</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span>Assigned</span><span className="font-medium">{reportData.schools?.assigned || 0}</span></div>
                    <div className="flex justify-between"><span>Converted</span><span className="font-medium text-green-600">{reportData.schools?.converted || 0}</span></div>
                    <div className="flex justify-between"><span>As RM</span><span className="font-medium">{reportData.schools?.as_rm || 0}</span></div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-500 py-8">No report data available</p>
          )}
        </DialogContent>
      </Dialog>

      {/* ============================== */}
      {/* NEW PIPELINE MODALS */}
      {/* ============================== */}

      {/* Telephonic Round Modal */}
      <Dialog open={!!showTelephonicModal} onOpenChange={() => setShowTelephonicModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-blue-600" />
              Telephonic Round - {showTelephonicModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">{showTelephonicModal?.name}</p>
              <p className="text-sm text-slate-600">{showTelephonicModal?.role} • {showTelephonicModal?.phone}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Outcome *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTelephonicData({...telephonicData, outcome: 'accepted'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    telephonicData.outcome === 'accepted'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                  data-testid="telephonic-accept"
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Accept</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTelephonicData({...telephonicData, outcome: 'rejected'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    telephonicData.outcome === 'rejected'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                  data-testid="telephonic-reject"
                >
                  <X className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Reject</span>
                </button>
              </div>
            </div>
            
            {telephonicData.outcome === 'rejected' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rejection Reason *</label>
                <select
                  value={telephonicData.reject_reason}
                  onChange={(e) => setTelephonicData({...telephonicData, reject_reason: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="telephonic-reject-reason"
                >
                  <option value="">Select reason</option>
                  <option value="Poor communication">Poor communication</option>
                  <option value="Not fit for role">Not fit for role</option>
                  <option value="Salary mismatch">Salary mismatch</option>
                  <option value="Location issues">Location issues</option>
                  <option value="Availability issues">Availability issues</option>
                  <option value="Declined by candidate">Declined by candidate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={telephonicData.notes}
                onChange={(e) => setTelephonicData({...telephonicData, notes: e.target.value})}
                placeholder="Add any notes from the call..."
                className="min-h-[80px]"
                data-testid="telephonic-notes"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTelephonicModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleTelephonicRound} 
                disabled={!telephonicData.outcome || (telephonicData.outcome === 'rejected' && !telephonicData.reject_reason)}
                className={`flex-1 ${telephonicData.outcome === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                data-testid="telephonic-submit"
              >
                {telephonicData.outcome === 'accepted' ? 'Move to Candidate' : 'Reject Application'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HR Interview Modal */}
      <Dialog open={!!showHRInterviewModal} onOpenChange={() => setShowHRInterviewModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Schedule HR Interview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="font-medium">{showHRInterviewModal?.name}</p>
              <p className="text-sm text-slate-600">{showHRInterviewModal?.role} • {showHRInterviewModal?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Date & Time *</label>
              <Input
                type="datetime-local"
                value={hrInterviewData.scheduled_at}
                onChange={(e) => setHRInterviewData({...hrInterviewData, scheduled_at: e.target.value})}
                data-testid="hr-interview-date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={hrInterviewData.notes}
                onChange={(e) => setHRInterviewData({...hrInterviewData, notes: e.target.value})}
                placeholder="Interview location, video link, etc..."
                className="min-h-[60px]"
                data-testid="hr-interview-notes"
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <Mail className="w-4 h-4 inline mr-1" />
                An email will be sent to {showHRInterviewModal?.email || 'the candidate'}
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowHRInterviewModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleScheduleHRInterview} 
                disabled={!hrInterviewData.scheduled_at}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                data-testid="hr-interview-submit"
              >
                Schedule Interview
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dept Head Selection Modal */}
      <Dialog open={!!showDeptHeadModal} onOpenChange={() => setShowDeptHeadModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Select Department Head
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="font-medium">{showDeptHeadModal?.name}</p>
              <p className="text-sm text-slate-600">Role: {showDeptHeadModal?.role}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Dept Head *</label>
              <select
                value={deptHeadData.dept_head_id}
                onChange={(e) => setDeptHeadData({...deptHeadData, dept_head_id: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                data-testid="dept-head-select"
              >
                <option value="">Select team member</option>
                {teamUsers.filter(u => u.is_active).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Interview Date (Optional)</label>
              <Input
                type="datetime-local"
                value={deptHeadData.scheduled_at}
                onChange={(e) => setDeptHeadData({...deptHeadData, scheduled_at: e.target.value})}
                data-testid="dept-head-date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={deptHeadData.notes}
                onChange={(e) => setDeptHeadData({...deptHeadData, notes: e.target.value})}
                placeholder="Any specific instructions..."
                className="min-h-[60px]"
                data-testid="dept-head-notes"
              />
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <Mail className="w-4 h-4 inline mr-1" />
                The selected team member will be notified via email
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDeptHeadModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleSelectDeptHead} 
                disabled={!deptHeadData.dept_head_id}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                data-testid="dept-head-submit"
              >
                Assign & Notify
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* HR Interview Outcome Modal */}
      <Dialog open={!!showHROutcomeModal} onOpenChange={() => setShowHROutcomeModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              HR Interview Result - {showHROutcomeModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="font-medium">{showHROutcomeModal?.name}</p>
              <p className="text-sm text-slate-600">{showHROutcomeModal?.role} • {showHROutcomeModal?.email}</p>
              {showHROutcomeModal?.hr_interview?.scheduled_at && (
                <p className="text-sm text-purple-600 mt-1">
                  Interview Date: {format(new Date(showHROutcomeModal.hr_interview.scheduled_at), 'PPp')}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Interview Outcome *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setHROutcomeData({...hrOutcomeData, outcome: 'passed'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    hrOutcomeData.outcome === 'passed'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                  data-testid="hr-outcome-passed"
                >
                  <CheckCircle2 className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Passed</span>
                </button>
                <button
                  type="button"
                  onClick={() => setHROutcomeData({...hrOutcomeData, outcome: 'failed'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    hrOutcomeData.outcome === 'failed'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                  data-testid="hr-outcome-failed"
                >
                  <X className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Failed</span>
                </button>
              </div>
            </div>
            
            {hrOutcomeData.outcome === 'failed' && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Marking as "Failed" will automatically reject this application.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={hrOutcomeData.notes}
                onChange={(e) => setHROutcomeData({...hrOutcomeData, notes: e.target.value})}
                placeholder="Interview feedback, observations..."
                className="min-h-[80px]"
                data-testid="hr-outcome-notes"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowHROutcomeModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleHROutcome} 
                disabled={!hrOutcomeData.outcome}
                className={`flex-1 ${hrOutcomeData.outcome === 'passed' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                data-testid="hr-outcome-submit"
              >
                {hrOutcomeData.outcome === 'passed' ? 'Mark as Passed' : 'Mark as Failed'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dept Head Interview Outcome Modal */}
      <Dialog open={!!showDeptHeadOutcomeModal} onOpenChange={() => setShowDeptHeadOutcomeModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Department Interview Result - {showDeptHeadOutcomeModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="font-medium">{showDeptHeadOutcomeModal?.name}</p>
              <p className="text-sm text-slate-600">{showDeptHeadOutcomeModal?.role}</p>
              {showDeptHeadOutcomeModal?.dept_head_interview?.dept_head_name && (
                <p className="text-sm text-indigo-600 mt-1">
                  Interviewed by: {showDeptHeadOutcomeModal.dept_head_interview.dept_head_name}
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Interview Outcome *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeptHeadOutcomeData({...deptHeadOutcomeData, outcome: 'selected'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    deptHeadOutcomeData.outcome === 'selected'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-200 hover:border-green-300'
                  }`}
                  data-testid="depthead-outcome-selected"
                >
                  <UserCheck className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Selected</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeptHeadOutcomeData({...deptHeadOutcomeData, outcome: 'not_selected'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    deptHeadOutcomeData.outcome === 'not_selected'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-200 hover:border-red-300'
                  }`}
                  data-testid="depthead-outcome-not-selected"
                >
                  <UserX className="w-5 h-5 mx-auto mb-1" />
                  <span className="text-sm font-medium">Not Selected</span>
                </button>
              </div>
            </div>
            
            {deptHeadOutcomeData.outcome === 'not_selected' && (
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-sm text-red-700">
                  <AlertTriangle className="w-4 h-4 inline mr-1" />
                  Marking as "Not Selected" will automatically reject this application.
                </p>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={deptHeadOutcomeData.notes}
                onChange={(e) => setDeptHeadOutcomeData({...deptHeadOutcomeData, notes: e.target.value})}
                placeholder="Department head's feedback, recommendations..."
                className="min-h-[80px]"
                data-testid="depthead-outcome-notes"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDeptHeadOutcomeModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleDeptHeadOutcome} 
                disabled={!deptHeadOutcomeData.outcome}
                className={`flex-1 ${deptHeadOutcomeData.outcome === 'selected' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                data-testid="depthead-outcome-submit"
              >
                {deptHeadOutcomeData.outcome === 'selected' ? 'Mark as Selected' : 'Mark as Not Selected'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Welcome Email Modal */}
      <Dialog open={!!showWelcomeEmailModal} onOpenChange={() => setShowWelcomeEmailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Send Welcome Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="font-medium">{showWelcomeEmailModal?.name}</p>
              <p className="text-sm text-slate-600">{showWelcomeEmailModal?.email}</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-2">Email Preview:</p>
              <p className="text-sm text-slate-600">
                Welcome aboard, {showWelcomeEmailModal?.name}! We're excited to have you join the OLL team.
                This email will contain onboarding instructions, important links, and next steps.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowWelcomeEmailModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleSendWelcomeEmail}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                data-testid="welcome-email-submit"
              >
                <Send className="w-4 h-4 mr-2" />
                Send Welcome Email
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Account Modal */}
      <Dialog open={!!showCreateAccountModal} onOpenChange={() => setShowCreateAccountModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Create OLL Admin Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <p className="font-medium">{showCreateAccountModal?.name}</p>
              <p className="text-sm text-slate-600">{showCreateAccountModal?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Role *</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                data-testid="create-account-role"
              >
                <option value="">Select role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-700">
                <AlertTriangle className="w-4 h-4 inline mr-1" />
                A temporary password will be generated and copied to your clipboard.
                Share it securely with the team member.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowCreateAccountModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleCreateAccount}
                disabled={!selectedRoleId}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                data-testid="create-account-submit"
              >
                Create Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Letter Modal */}
      <Dialog open={!!showOfferLetterModal} onOpenChange={() => setShowOfferLetterModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-orange-600" />
              Generate Offer Letter
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="font-medium">{showOfferLetterModal?.name}</p>
              <p className="text-sm text-slate-600">Role: {showOfferLetterModal?.role}</p>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">
                This will generate a formal offer letter with the role details and compensation information.
                The PDF will be available for download and can be sent to the candidate.
              </p>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowOfferLetterModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleGenerateOfferLetter}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                data-testid="offer-letter-submit"
              >
                <FileText className="w-4 h-4 mr-2" />
                Generate Offer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Trial Period Modal */}
      <Dialog open={!!showTrialPeriodModal} onOpenChange={() => setShowTrialPeriodModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" />
              Start Trial Period
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-emerald-50 p-4 rounded-lg">
              <p className="font-medium">{showTrialPeriodModal?.name}</p>
              <p className="text-sm text-slate-600">Role: {showTrialPeriodModal?.role}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Trial Duration *</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setTrialPeriodData({...trialPeriodData, duration: '1_week'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    trialPeriodData.duration === '1_week'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  data-testid="trial-1-week"
                >
                  <span className="font-medium">1 Week</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTrialPeriodData({...trialPeriodData, duration: '1_month'})}
                  className={`flex-1 py-3 px-4 rounded-lg border-2 transition-all ${
                    trialPeriodData.duration === '1_month'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  data-testid="trial-1-month"
                >
                  <span className="font-medium">1 Month</span>
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
              <Input
                type="date"
                value={trialPeriodData.start_date}
                onChange={(e) => setTrialPeriodData({...trialPeriodData, start_date: e.target.value})}
                data-testid="trial-start-date"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowTrialPeriodModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleStartTrialPeriod}
                disabled={!trialPeriodData.start_date}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                data-testid="trial-submit"
              >
                Start Trial Period
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend Trial Modal */}
      <Dialog open={!!showExtendTrialModal} onOpenChange={() => setShowExtendTrialModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pause className="w-5 h-5 text-yellow-600" />
              Extend Trial Period
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="font-medium">{showExtendTrialModal?.name}</p>
              <p className="text-sm text-slate-600">
                Current end date: {showExtendTrialModal?.trial_period?.end_date || 'N/A'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">New End Date *</label>
              <Input
                type="date"
                value={extendTrialData.extension_date}
                onChange={(e) => setExtendTrialData({...extendTrialData, extension_date: e.target.value})}
                min={showExtendTrialModal?.trial_period?.end_date}
                data-testid="extend-trial-date"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Extension</label>
              <Textarea
                value={extendTrialData.reason}
                onChange={(e) => setExtendTrialData({...extendTrialData, reason: e.target.value})}
                placeholder="Why is the trial being extended?"
                className="min-h-[60px]"
                data-testid="extend-trial-reason"
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowExtendTrialModal(null)} className="flex-1">Cancel</Button>
              <Button 
                onClick={handleExtendTrial}
                disabled={!extendTrialData.extension_date}
                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                data-testid="extend-trial-submit"
              >
                Extend Trial
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Modal */}
      <Dialog open={showBulkUploadModal} onOpenChange={setShowBulkUploadModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-emerald-600" />
              Bulk Upload Applications
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm text-slate-700 mb-2">
                <strong>Instructions:</strong>
              </p>
              <ol className="text-sm text-slate-600 list-decimal list-inside space-y-1">
                <li>Download the template using the "Template" button</li>
                <li>Fill in the data (Name, Email, Phone, City are required)</li>
                <li>Save as CSV file</li>
                <li>Upload the file below</li>
              </ol>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select CSV File</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setBulkUploadFile(e.target.files[0])}
                  className="hidden"
                  id="bulk-upload-input"
                  data-testid="bulk-upload-input"
                />
                <label htmlFor="bulk-upload-input" className="cursor-pointer">
                  {bulkUploadFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileText className="w-6 h-6 text-emerald-600" />
                      <span className="text-sm font-medium">{bulkUploadFile.name}</span>
                      <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); setBulkUploadFile(null); }}
                        className="p-1 hover:bg-slate-200 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">Click to select CSV file</p>
                    </>
                  )}
                </label>
              </div>
            </div>
            
            {bulkUploadResults && (
              <div className={`p-4 rounded-lg ${bulkUploadResults.error ? 'bg-red-50' : 'bg-green-50'}`}>
                {bulkUploadResults.error ? (
                  <p className="text-sm text-red-700">{bulkUploadResults.error}</p>
                ) : (
                  <div className="text-sm">
                    <p className="text-green-700 font-medium">
                      ✓ {bulkUploadResults.success_count} applications uploaded successfully
                    </p>
                    {bulkUploadResults.failed_count > 0 && (
                      <p className="text-yellow-700 mt-1">
                        ⚠ {bulkUploadResults.failed_count} rows failed
                      </p>
                    )}
                    {bulkUploadResults.errors?.length > 0 && (
                      <ul className="mt-2 text-red-600 text-xs list-disc list-inside">
                        {bulkUploadResults.errors.slice(0, 5).map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setBulkUploadFile(null);
                  setBulkUploadResults(null);
                }} 
                className="flex-1"
              >
                Close
              </Button>
              <Button 
                onClick={handleBulkUpload}
                disabled={!bulkUploadFile || bulkUploadLoading}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                data-testid="bulk-upload-submit"
              >
                {bulkUploadLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Applications
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminTeamApplications;
