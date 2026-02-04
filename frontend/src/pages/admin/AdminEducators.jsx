import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Mail, Calendar, Clock, Plus, ChevronRight, MessageSquare, Archive, CalendarClock, CheckCircle2, User, Users, Briefcase, MapPin, UserPlus, Send, Edit, Save, Video, Star, FileText, X, Download } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, parseISO, isAfter, isBefore, addHours } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Main tabs for the educator section
const MAIN_TABS = [
  { value: 'requirements', label: 'Requirements', color: 'bg-indigo-500' },
  { value: 'applicants', label: 'Applicants', color: 'bg-blue-500' },
  { value: 'onboarded', label: 'Onboarding', color: 'bg-orange-500' },
  { value: 'active', label: 'Active Educators', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

// Skills that match student selections
const EDUCATOR_SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];

// Sub-status for applicants (New + Demo Scheduled merged)
const APPLICANT_STATUS = [
  { value: 'new', label: 'New (Demo Pending)', color: 'bg-blue-500' },
  { value: 'demo_scheduled', label: 'Demo Scheduled', color: 'bg-purple-500' },
];

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

// Rating sub-pointers
const RATING_CRITERIA = {
  personality: {
    label: 'Personality',
    subPointers: ['Confidence', 'Enthusiasm', 'Professionalism', 'Approachability']
  },
  communication: {
    label: 'Communication',
    subPointers: ['Clarity', 'Engagement', 'Responsiveness', 'Language Skills']
  },
  expertise: {
    label: 'Subject Expertise',
    subPointers: ['Subject Knowledge', 'Teaching Methodology', 'Problem Solving', 'Student Handling']
  }
};

const AdminEducators = () => {
  const { getAuthHeaders } = useAuth();
  const [educators, setEducators] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('requirements'); // Main tab
  const [applicantSubFilter, setApplicantSubFilter] = useState('all'); // 'all', 'new', 'demo_scheduled'
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [requirementFilter, setRequirementFilter] = useState(null); // Filter applicants by requirement
  
  // Requirements state
  const [requirements, setRequirements] = useState([]);
  const [cities, setCities] = useState([]);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [requirementForm, setRequirementForm] = useState({
    title: '', skill: '', city: '', area: '', description: '',
    positions: 1, days: [], timing_from: '', timing_to: '',
    pay_amount: '', pay_type: 'per_session', is_active: true
  });
  
  // Add Single Educator state
  const [showAddEducatorModal, setShowAddEducatorModal] = useState(false);
  const [addEducatorForm, setAddEducatorForm] = useState({
    name: '', email: '', phone: '', skills: [], city: '', experience: ''
  });
  
  // Bulk Import state
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportPreview, setBulkImportPreview] = useState([]);
  const [bulkImportLoading, setBulkImportLoading] = useState(false);
  
  // Modal states
  const [viewEducator, setViewEducator] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(null);
  const [showDirectOnboardModal, setShowDirectOnboardModal] = useState(false);
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false);
  const [onboardingData, setOnboardingData] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [scheduleData, setScheduleData] = useState({ date: null, time: '' });
  
  // Edit Educator state
  const [showEditEducatorModal, setShowEditEducatorModal] = useState(null);
  const [editEducatorForm, setEditEducatorForm] = useState({
    name: '', email: '', phone: '', skills: [], city: '', experience: '', teaching_mode: ''
  });
  const [newSkillInput, setNewSkillInput] = useState('');
  
  // Direct onboard form
  const [directOnboardForm, setDirectOnboardForm] = useState({
    name: '', email: '', phone: '', skills: '', city: '', experience: ''
  });
  
  // Onboarding detail state
  const [selectedOnboarding, setSelectedOnboarding] = useState(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', demo_date: '', demo_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Rating state
  const [ratingData, setRatingData] = useState({
    personality: { score: 3, sub_scores: {} },
    communication: { score: 3, sub_scores: {} },
    expertise: { score: 3, sub_scores: {} },
    technical: { webcam: true, mic: true, internet: 'good', notes: '' },
    feedback: '',
    recommendation: 'pending'
  });

  useEffect(() => {
    fetchEducators();
    fetchTeamUsers();
    fetchRequirements();
  }, []);

  // Auto-load onboarding details when viewing an onboarding educator
  useEffect(() => {
    if (viewEducator && viewEducator.status === 'onboarded') {
      fetchOnboardingDetails(viewEducator.id);
    } else {
      setSelectedOnboarding(null);
    }
  }, [viewEducator]);

  const fetchRequirements = async () => {
    try {
      const [reqRes, citiesRes] = await Promise.all([
        axios.get(`${API}/requirements`, { headers: getAuthHeaders() }),
        axios.get(`${API}/cities`, { headers: getAuthHeaders() })
      ]);
      setRequirements(reqRes.data || []);
      setCities(citiesRes.data || []);
    } catch (error) {
      console.error('Failed to fetch requirements:', error);
    }
  };

  const handleSaveRequirement = async () => {
    if (!requirementForm.title || !requirementForm.skill || !requirementForm.city) {
      toast.error('Please fill in required fields');
      return;
    }
    try {
      if (editingRequirement) {
        await axios.put(`${API}/requirements/${editingRequirement.id}`, requirementForm, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement updated');
      } else {
        await axios.post(`${API}/requirements`, requirementForm, {
          headers: getAuthHeaders()
        });
        toast.success('Requirement created');
      }
      setShowRequirementModal(false);
      setEditingRequirement(null);
      setRequirementForm({
        title: '', skill: '', city: '', area: '', description: '',
        positions: 1, days: [], timing_from: '', timing_to: '',
        pay_amount: '', pay_type: 'per_session', is_active: true
      });
      fetchRequirements();
    } catch (error) {
      toast.error('Failed to save requirement');
    }
  };

  const handleAddSingleEducator = async () => {
    if (!addEducatorForm.name || !addEducatorForm.email || !addEducatorForm.phone) {
      toast.error('Please fill in name, email and phone');
      return;
    }
    try {
      await axios.post(`${API}/educators/add-active`, {
        ...addEducatorForm,
        status: 'active'
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Educator added successfully');
      setShowAddEducatorModal(false);
      setAddEducatorForm({ name: '', email: '', phone: '', skills: [], city: '', experience: '' });
      fetchEducators();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add educator');
    }
  };

  const handleBulkImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const preview = lines.slice(1, 6).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((h, i) => {
          obj[h] = values[i]?.trim() || '';
        });
        return obj;
      });
      setBulkImportPreview(preview);
    };
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) {
      toast.error('Please select a file');
      return;
    }
    
    setBulkImportLoading(true);
    const formData = new FormData();
    formData.append('file', bulkImportFile);
    
    try {
      const response = await axios.post(`${API}/educators/bulk-import`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success(`Successfully imported ${response.data.imported} educators`);
      setShowBulkImportModal(false);
      setBulkImportFile(null);
      setBulkImportPreview([]);
      fetchEducators();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to import educators');
    } finally {
      setBulkImportLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const headers = 'name,email,phone,skills,city,experience';
    const sample1 = 'John Doe,john@example.com,9876543210,"Robotics,Coding",Mumbai,3 years';
    const sample2 = 'Jane Smith,jane@example.com,9876543211,"AI,Python",Pune,5 years';
    const csv = [headers, sample1, sample2].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'educators_sample.csv';
    a.click();
    window.URL.revokeObjectURL(url);
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

  const fetchOnboardingProgress = async () => {
    try {
      const response = await axios.get(`${API}/admin/educators/onboarding-progress`, {
        headers: getAuthHeaders()
      });
      setOnboardingData(response.data || []);
    } catch (error) {
      console.error('Failed to fetch onboarding progress:', error);
    }
  };

  const handleDirectOnboard = async () => {
    if (!directOnboardForm.name || !directOnboardForm.email || !directOnboardForm.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await axios.post(`${API}/admin/educators/direct-onboard`, {
        ...directOnboardForm,
        skills: directOnboardForm.skills.split(',').map(s => s.trim()).filter(Boolean)
      }, { headers: getAuthHeaders() });
      toast.success('Educator added and onboarding started!');
      setShowDirectOnboardModal(false);
      setDirectOnboardForm({ name: '', email: '', phone: '', skills: '', city: '', experience: '' });
      fetchEducators();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to add educator');
    }
  };

  const fetchOnboardingDetails = async (educatorId) => {
    try {
      const response = await axios.get(`${API}/educator/onboarding/${educatorId}`, {
        headers: getAuthHeaders()
      });
      setSelectedOnboarding(response.data?.onboarding);
    } catch (error) {
      console.error('Failed to fetch onboarding details:', error);
      setSelectedOnboarding(null);
    }
  };

  const handleVerifyDocuments = async (educatorId, verified) => {
    try {
      await axios.post(`${API}/admin/educators/${educatorId}/verify-documents`, {
        verified,
        notes: verificationNotes
      }, { headers: getAuthHeaders() });
      toast.success(verified ? 'Documents verified!' : 'Verification rejected');
      fetchOnboardingDetails(educatorId);
      fetchOnboardingProgress();
    } catch (error) {
      toast.error('Failed to update verification status');
    }
  };

  const fetchEducators = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/educators/applications`, {
        headers: getAuthHeaders()
      });
      setEducators(response.data);
    } catch (error) {
      toast.error('Failed to fetch educators');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (educator, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/educators/application/${educator.id}`, { 
        status: newStatus,
        ...additionalData
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Status updated successfully`);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleScheduleDemo = async () => {
    if (!scheduleData.date || !scheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      await axios.patch(`${API}/educators/application/${showScheduleModal.id}`, {
        status: 'demo_scheduled',
        demo_date: format(scheduleData.date, 'yyyy-MM-dd'),
        demo_time: scheduleData.time
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Demo scheduled successfully');
      setShowScheduleModal(null);
      setScheduleData({ date: null, time: '' });
      fetchEducators();
    } catch (error) {
      toast.error('Failed to schedule demo');
    }
  };

  const handleDemoCompleted = async (educator) => {
    // Open rating modal instead of direct status change
    setShowRatingModal(educator);
    setRatingData({
      personality: { score: 3, sub_scores: {} },
      communication: { score: 3, sub_scores: {} },
      expertise: { score: 3, sub_scores: {} },
      technical: { webcam: true, mic: true, internet: 'good', notes: '' },
      feedback: '',
      recommendation: 'pending'
    });
  };

  const handleSubmitRating = async () => {
    if (!showRatingModal) return;
    
    try {
      await axios.post(`${API}/educators/complete-demo/${showRatingModal.id}`, {
        rating: ratingData,
        feedback: ratingData.feedback,
        recommendation: ratingData.recommendation
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Demo completed and rating saved');
      setShowRatingModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to save rating');
    }
  };

  // Generate Jitsi meeting link for admin (moderator)
  const generateMeetingLink = (educator) => {
    const meetCode = educator.id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': false,
      'config.startWithVideoMuted': false,
      'config.enableLobby': true,
      'userInfo.displayName': 'OLL Admin',
      'userInfo.moderator': true
    };
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    return `https://meet.jit.si/${roomName}#${configString}`;
  };

  // Check if demo is joinable (within 30 mins before to 1.5 hours after)
  const isDemoJoinable = (educator) => {
    if (!educator.demo_date || !educator.demo_time) return false;
    if (educator.status !== 'demo_scheduled') return false;
    try {
      const demoDateTime = parseISO(`${educator.demo_date}T${educator.demo_time}:00`);
      const now = new Date();
      const joinWindowStart = addHours(demoDateTime, -0.5);
      const joinWindowEnd = addHours(demoDateTime, 1.5);
      return isAfter(now, joinWindowStart) && isBefore(now, joinWindowEnd);
    } catch {
      return false;
    }
  };

  const handleOnboard = async (educator) => {
    await handleStatusChange(educator, 'onboarded', {
      onboarding_date: new Date().toISOString().split('T')[0]
    });
    // Create onboarding record
    try {
      await axios.get(`${API}/educator/onboarding/${educator.id}`, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('Failed to create onboarding record:', error);
    }
  };

  const handleActivate = async (educator) => {
    // Check if onboarding is complete and documents verified
    try {
      const response = await axios.get(`${API}/educator/onboarding/${educator.id}`, {
        headers: getAuthHeaders()
      });
      const onboarding = response.data?.onboarding;
      
      if (!onboarding?.documents_verified) {
        toast.error('Please verify educator documents before activating');
        return;
      }
      
      await handleStatusChange(educator, 'active');
      toast.success(`${educator.name} is now an active educator!`);
    } catch (error) {
      // If no onboarding record, still allow activation
      await handleStatusChange(educator, 'active');
      toast.success(`${educator.name} is now an active educator!`);
    }
  };

  const handleArchive = async (educator) => {
    await handleStatusChange(educator, 'archived');
  };

  const openEditEducatorModal = (educator) => {
    setEditEducatorForm({
      name: educator.name || '',
      email: educator.email || '',
      phone: educator.phone || '',
      skills: educator.skills || [],
      city: educator.city || '',
      experience: educator.experience || '',
      teaching_mode: educator.teaching_mode || ''
    });
    setNewSkillInput('');
    setShowEditEducatorModal(educator);
  };

  const handleAddSkill = () => {
    if (!newSkillInput.trim()) return;
    if (editEducatorForm.skills.includes(newSkillInput.trim())) {
      toast.error('Skill already added');
      return;
    }
    setEditEducatorForm({
      ...editEducatorForm,
      skills: [...editEducatorForm.skills, newSkillInput.trim()]
    });
    setNewSkillInput('');
  };

  const handleRemoveSkill = (skillToRemove) => {
    setEditEducatorForm({
      ...editEducatorForm,
      skills: editEducatorForm.skills.filter(s => s !== skillToRemove)
    });
  };

  const handleSaveEducator = async () => {
    if (!showEditEducatorModal) return;
    try {
      await axios.patch(`${API}/educators/application/${showEditEducatorModal.id}`, {
        name: editEducatorForm.name,
        email: editEducatorForm.email,
        phone: editEducatorForm.phone,
        skills: editEducatorForm.skills,
        city: editEducatorForm.city,
        experience: editEducatorForm.experience,
        teaching_mode: editEducatorForm.teaching_mode
      }, { headers: getAuthHeaders() });
      toast.success('Educator updated successfully');
      setShowEditEducatorModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to update educator');
    }
  };

  const handleSendEmail = async (educator, emailType) => {
    try {
      await axios.post(`${API}/educators/${educator.id}/send-email/${emailType}`, {}, {
        headers: getAuthHeaders()
      });
      toast.success(`${emailType.replace('_', ' ')} email sent to ${educator.email}`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send email');
    }
  };

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/educators/application/${showAssignModal.id}`, {
        assigned_to: userId
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead assigned successfully');
      setShowAssignModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to assign lead');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      toast.error('Please enter a comment');
      return;
    }
    try {
      await axios.post(`${API}/educators/comment/${showCommentModal.id}`, 
        { text: newComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setNewComment('');
      setShowCommentModal(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const handleSaveEdit = async () => {
    if (!viewEducator) return;
    try {
      await axios.patch(`${API}/educators/application/${viewEducator.id}`, {
        name: editData.name,
        phone: editData.phone,
        email: editData.email,
        demo_date: editData.demo_date || null,
        demo_time: editData.demo_time || null,
        notes: editData.notes
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Educator updated successfully');
      setEditMode(false);
      setViewEducator(null);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to update educator');
    }
  };

  const handleAddViewComment = async () => {
    if (!viewComment.trim() || !viewEducator) return;
    try {
      await axios.post(`${API}/educators/comment/${viewEducator.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewEducator data
      const response = await axios.get(`${API}/educators/applications`, { headers: getAuthHeaders() });
      const updated = response.data.find(i => i.id === viewEducator.id);
      if (updated) setViewEducator(updated);
      fetchEducators();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const filteredEducators = educators.filter(edu => {
    const matchesSearch = edu.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      edu.phone?.includes(searchQuery);
    
    // For applicants tab, filter by new and demo_scheduled
    let matchesTab = false;
    if (activeTab === 'applicants') {
      if (applicantSubFilter === 'all') {
        matchesTab = edu.status === 'new' || edu.status === 'demo_scheduled';
      } else {
        matchesTab = edu.status === applicantSubFilter;
      }
      // Apply requirement filter if set
      if (requirementFilter && matchesTab) {
        matchesTab = edu.requirement_id === requirementFilter;
      }
    } else if (activeTab === 'requirements') {
      matchesTab = false; // Requirements tab doesn't show educators
    } else {
      matchesTab = edu.status === activeTab;
    }
    
    // Assignee filter
    let matchesAssignee = true;
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        matchesAssignee = !edu.assigned_to;
      } else {
        matchesAssignee = edu.assigned_to === assigneeFilter;
      }
    }
    
    return matchesSearch && matchesTab && matchesAssignee;
  });

  const getCount = (status) => {
    if (status === 'applicants') {
      return educators.filter(e => e.status === 'new' || e.status === 'demo_scheduled').length;
    }
    if (status === 'requirements') {
      return requirements.length;
    }
    return educators.filter(e => e.status === status).length;
  };

  // Render action buttons based on status
  const renderActionButtons = (educator) => {
    switch (educator.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => {
                setShowScheduleModal(educator);
                setScheduleData({ date: null, time: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`schedule-demo-${educator.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Schedule Demo
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'demo_scheduled':
        return (
          <div className="flex gap-1 flex-wrap">
            {/* Join Demo Button */}
            <a
              href={generateMeetingLink(educator)}
              target="_blank"
              rel="noopener noreferrer"
              className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 font-medium ${
                isDemoJoinable(educator)
                  ? 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] text-white animate-pulse'
                  : 'bg-gradient-to-r from-[#1E3A5F] to-[#D63031] text-white'
              }`}
              data-testid={`join-demo-${educator.id}`}
            >
              <Video className="w-3 h-3" />
              {isDemoJoinable(educator) ? 'Join Now' : 'Join Demo'}
            </a>
            <button
              onClick={() => handleDemoCompleted(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
              data-testid={`demo-completed-${educator.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Complete & Rate
            </button>
            <button
              onClick={() => {
                setShowScheduleModal(educator);
                setScheduleData({ date: null, time: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${educator.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'onboarded':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setViewEducator(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
            >
              <Eye className="w-3 h-3" />
              View Progress
            </button>
            <button
              onClick={() => handleActivate(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`activate-${educator.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Activate
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'active':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => openEditEducatorModal(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-educator-${educator.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => handleArchive(educator)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${educator.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'archived':
        return null;
      
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Educator Applications">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name, email or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="educator-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-10 px-4 border border-slate-200 rounded-lg bg-white flex-1 sm:flex-none text-sm"
            data-testid="assignee-filter"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {teamUsers.filter(u => u.is_active).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {activeTab === 'onboarded' && (
            <Button 
              onClick={() => setShowDirectOnboardModal(true)}
              className="bg-[#D63031] hover:bg-[#c0392b] flex-1 sm:flex-none"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Direct</span> Onboard
            </Button>
          )}
          {activeTab === 'requirements' && (
            <Button 
              onClick={() => {
                setEditingRequirement(null);
                setRequirementForm({
                  title: '', skill: '', city: '', area: '', description: '',
                  positions: 1, days: [], timing_from: '', timing_to: '',
                  pay_amount: '', pay_type: 'per_session', is_active: true
                });
                setShowRequirementModal(true);
              }}
              className="bg-[#D63031] hover:bg-[#c0392b] flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Add</span> Requirement
            </Button>
          )}
          {activeTab === 'active' && (
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAddEducatorModal(true)}
                className="bg-[#D63031] hover:bg-[#c0392b]"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add</span> Educator
              </Button>
              <Button 
                onClick={() => setShowBulkImportModal(true)}
                variant="outline"
                className="border-[#1E3A5F] text-[#1E3A5F]"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Bulk</span> Import
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {MAIN_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => {
              setActiveTab(tab.value);
              if (tab.value === 'onboarded') {
                fetchOnboardingProgress();
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.value
                ? 'bg-[#1E3A5F] text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
            data-testid={`tab-${tab.value}`}
          >
            <span className={`w-2 h-2 rounded-full ${tab.color}`} />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.value ? 'bg-white/20' : 'bg-slate-100'
            }`}>
              {getCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Sub-filter for Applicants tab */}
      {activeTab === 'applicants' && (
        <div className="flex flex-wrap gap-2 mb-6 items-center">
          {requirementFilter && (
            <div className="flex items-center gap-2 bg-[#D63031]/10 text-[#D63031] px-3 py-1.5 rounded-lg text-xs font-medium">
              <span>Filtered by: {requirements.find(r => r.id === requirementFilter)?.title || 'Requirement'}</span>
              <button onClick={() => setRequirementFilter(null)} className="hover:bg-[#D63031]/20 rounded p-0.5">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <button
            onClick={() => { setApplicantSubFilter('all'); setRequirementFilter(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              applicantSubFilter === 'all' && !requirementFilter ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            All ({educators.filter(e => e.status === 'new' || e.status === 'demo_scheduled').length})
          </button>
          <button
            onClick={() => setApplicantSubFilter('new')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              applicantSubFilter === 'new' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Demo Pending ({educators.filter(e => e.status === 'new').length})
          </button>
          <button
            onClick={() => setApplicantSubFilter('demo_scheduled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              applicantSubFilter === 'demo_scheduled' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            Demo Scheduled ({educators.filter(e => e.status === 'demo_scheduled').length})
          </button>
        </div>
      )}

      {/* Onboarding Progress View - Show when onboarding tab is active */}
      {activeTab === 'onboarded' && onboardingData.length > 0 && (
        <div className="mb-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
          <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-orange-500" />
            Onboarding Progress Overview
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {onboardingData.map((item) => {
              const progress = item.progress || 0;
              const steps = item.onboarding?.completed_steps || [];
              const verified = item.onboarding?.documents_verified;
              return (
                <div key={item.educator?.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-[#1E3A5F] rounded-full flex items-center justify-center text-white font-bold">
                      {item.educator?.name?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-[#1E3A5F] truncate">{item.educator?.name}</h4>
                      <p className="text-xs text-slate-500">{steps.length}/7 steps completed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-[#1E3A5F]">{Math.round(progress)}%</p>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full transition-all ${progress >= 100 ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`px-2 py-0.5 rounded-full ${
                      verified ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {verified ? '✓ Docs Verified' : 'Docs Pending'}
                    </span>
                    <button 
                      onClick={() => setViewEducator(educators.find(e => e.id === item.educator?.id))}
                      className="text-[#D63031] hover:underline"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requirements Tab Content */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          {requirements.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
              <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No requirements posted yet</p>
              <Button 
                onClick={() => setShowRequirementModal(true)}
                className="mt-4 bg-[#D63031] hover:bg-[#c0392b]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Requirement
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {requirements.map((req) => {
                const matchingApps = educators.filter(e => e.requirement_id === req.id).length;
                return (
                  <div key={req.id} className={`bg-white rounded-2xl border p-5 ${req.is_active ? 'border-slate-100' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-[#1E3A5F]">{req.title}</h3>
                        <p className="text-sm text-slate-500">{req.skill}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${req.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {req.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-slate-600 mb-3">
                      <p className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" /> {req.city} {req.area && `- ${req.area}`}
                      </p>
                      <p className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" /> {req.positions} position(s)
                      </p>
                      {req.timing_from && (
                        <p className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" /> {req.timing_from} - {req.timing_to}
                        </p>
                      )}
                      {req.pay_amount && (
                        <p className="flex items-center gap-1 text-green-600 font-medium">
                          ₹{req.pay_amount} / {req.pay_type === 'per_session' ? 'session' : 'month'}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <button
                        onClick={() => {
                          setActiveTab('applicants');
                          setApplicantSubFilter('all');
                          // Filter by requirement - we'll add a filter state
                          setRequirementFilter(req.id);
                        }}
                        className="text-xs text-[#D63031] hover:underline flex items-center gap-1"
                        data-testid={`view-applicants-${req.id}`}
                      >
                        <Eye className="w-3 h-3" />
                        View {matchingApps} applicant(s)
                      </button>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingRequirement(req);
                            setRequirementForm(req);
                            setShowRequirementModal(true);
                          }}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-slate-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Educator Cards - Show for applicants, onboarding, active, archived tabs */}
      {activeTab !== 'requirements' && (
        <>
          {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredEducators.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <User className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {requirementFilter 
              ? `No applicants found for "${requirements.find(r => r.id === requirementFilter)?.title || 'this requirement'}"`
              : 'No applications in this section'}
          </p>
          {requirementFilter && (
            <button 
              onClick={() => setRequirementFilter(null)}
              className="mt-3 text-sm text-[#D63031] hover:underline"
            >
              Clear filter to see all applicants
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEducators.map((educator) => (
            <div 
              key={educator.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`educator-card-${educator.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{educator.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Mail className="w-3 h-3" /> {educator.email}
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {educator.phone}
                  </p>
                </div>
                {educator.requirement_title && (
                  <span className="px-2 py-1 rounded text-xs font-medium bg-[#D63031]/10 text-[#D63031]">
                    {educator.requirement_title}
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm text-slate-600 mb-3">
                {educator.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {educator.skills.map((skill, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded text-xs">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
                {educator.city && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {educator.city}
                  </p>
                )}
                {educator.demo_date && (
                  <p className="flex items-center gap-1 text-purple-600 font-medium">
                    <Calendar className="w-3 h-3" />
                    Demo: {educator.demo_date} {educator.demo_time && `at ${educator.demo_time}`}
                  </p>
                )}
                {educator.onboarding_date && (
                  <p className="flex items-center gap-1 text-green-600 font-medium">
                    <CheckCircle2 className="w-3 h-3" />
                    Onboarded: {educator.onboarding_date}
                  </p>
                )}
              </div>

              {/* Notes shown outside */}
              {educator.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Latest Note
                  </p>
                  <p className="text-sm text-amber-900 line-clamp-2">
                    {educator.notes.split('\n\n').pop()?.split('\n').slice(0, 2).join('\n') || educator.notes.slice(-150)}
                  </p>
                </div>
              )}

              {/* Assigned To */}
              {educator.assigned_to && (
                <div className="mb-3 flex items-center gap-1 text-sm text-indigo-600 font-medium">
                  <UserPlus className="w-3 h-3" />
                  Assigned: {getAssignedUserName(educator.assigned_to) || 'Team Member'}
                </div>
              )}

              {/* View, Assign, Comment Buttons */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewEducator(educator)}
                  data-testid={`view-educator-${educator.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                  onClick={() => setShowAssignModal(educator)}
                  data-testid={`assign-educator-${educator.id}`}
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-amber-600 border-amber-200 hover:bg-amber-50"
                  onClick={() => setShowCommentModal(educator)}
                  data-testid={`comment-educator-${educator.id}`}
                >
                  <MessageSquare className="w-4 h-4" />
                  {educator.comments?.length > 0 && (
                    <span className="ml-1 text-xs">{educator.comments.length}</span>
                  )}
                </Button>
              </div>

              {/* Action Buttons based on status */}
              {renderActionButtons(educator)}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* View/Edit Details Dialog */}
      <Dialog open={!!viewEducator} onOpenChange={() => { setViewEducator(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#1E3A5F]" />
                {editMode ? 'Edit Educator' : viewEducator?.name}
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(true);
                  setEditData({
                    name: viewEducator?.name || '',
                    phone: viewEducator?.phone || '',
                    email: viewEducator?.email || '',
                    demo_date: viewEducator?.demo_date || '',
                    demo_time: viewEducator?.demo_time || '',
                    notes: viewEducator?.notes || ''
                  });
                }}>
                  <Edit className="w-4 h-4 mr-1" /> Edit
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>
          {viewEducator && (
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
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                        <Mail className="w-4 h-4" /> {viewEducator.email}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Phone</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                        <Phone className="w-4 h-4" /> {viewEducator.phone}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">City</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1 text-sm">
                        <MapPin className="w-4 h-4" /> {viewEducator.city || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Availability</p>
                      <p className="font-medium text-[#1E3A5F] text-sm">{viewEducator.availability || 'N/A'}</p>
                    </div>
                  </div>

                  {viewEducator.skills?.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">Skills</p>
                      <div className="flex flex-wrap gap-1">
                        {viewEducator.skills.map((skill, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded text-xs font-medium">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewEducator.grades_comfortable?.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">Grades Comfortable</p>
                      <div className="flex flex-wrap gap-1">
                        {viewEducator.grades_comfortable.map((grade, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#D63031]/10 text-[#D63031] rounded text-xs font-medium">
                            {grade}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewEducator.experience && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Experience</p>
                      <p className="text-slate-700 text-sm">{viewEducator.experience}</p>
                    </div>
                  )}

                  {viewEducator.requirement_title && (
                    <div className="bg-[#D63031]/5 rounded-lg p-3">
                      <p className="text-xs text-[#D63031] mb-1">Applied For</p>
                      <p className="font-medium text-[#D63031]">{viewEducator.requirement_title}</p>
                    </div>
                  )}

                  {viewEducator.demo_date && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-purple-500 mb-1">Demo Scheduled</p>
                      <p className="font-medium text-purple-700 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> 
                        {viewEducator.demo_date} {viewEducator.demo_time && `at ${viewEducator.demo_time}`}
                      </p>
                    </div>
                  )}

                  {viewEducator.notes && (
                    <div className="bg-amber-50 rounded-lg p-3">
                      <p className="text-xs text-amber-500 mb-1">Notes</p>
                      <p className="text-amber-900 whitespace-pre-line">{viewEducator.notes}</p>
                    </div>
                  )}

                  {/* Comments Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Comments ({viewEducator.comments?.length || 0})
                    </h4>
                    
                    {viewEducator.comments?.length > 0 && (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto mb-3">
                        {viewEducator.comments.map((comment, idx) => (
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

                  {/* Email Notifications Section */}
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Send Email Notification
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'application_received')}
                        className="text-xs"
                      >
                        <Mail className="w-3 h-3 mr-1" />
                        Application Received
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'demo_scheduled')}
                        className="text-xs text-purple-600 border-purple-200 hover:bg-purple-50"
                      >
                        <Calendar className="w-3 h-3 mr-1" />
                        Demo Scheduled
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'demo_reminder')}
                        className="text-xs text-orange-600 border-orange-200 hover:bg-orange-50"
                      >
                        <Clock className="w-3 h-3 mr-1" />
                        Demo Reminder
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'demo_completed')}
                        className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Demo Completed
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'onboarded')}
                        className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                      >
                        <Star className="w-3 h-3 mr-1" />
                        Onboarded
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSendEmail(viewEducator, 'rejected')}
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Archive className="w-3 h-3 mr-1" />
                        Rejected
                      </Button>
                    </div>
                  </div>

                  {/* Document Verification Section - Only for onboarding educators */}
                  {viewEducator.status === 'onboarded' && (
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-[#1E3A5F] mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Document Verification
                        {selectedOnboarding?.documents_verified && (
                          <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">✓ Verified</span>
                        )}
                      </h4>
                      
                      {!selectedOnboarding ? (
                        <div className="space-y-2">
                          <p className="text-sm text-slate-500">Loading onboarding details...</p>
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#D63031]"></div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Progress Overview */}
                          <div className="bg-slate-50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-slate-700">Progress</span>
                              <span className="text-sm font-bold text-[#1E3A5F]">
                                {Math.round((selectedOnboarding.completed_steps?.length || 0) / 7 * 100)}%
                              </span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-orange-500 transition-all"
                                style={{ width: `${(selectedOnboarding.completed_steps?.length || 0) / 7 * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Step {selectedOnboarding.current_step || selectedOnboarding.completed_steps?.length || 0}/7 • 
                              {selectedOnboarding.quiz_passed ? ' Quiz ✓' : ' Quiz pending'} • 
                              {selectedOnboarding.assessment_passed ? ' Assessment ✓' : ' Assessment pending'}
                            </p>
                          </div>

                          {/* Profile Info */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Profile</h5>
                            <div className="flex gap-3">
                              {selectedOnboarding.profile_photo ? (
                                <img src={selectedOnboarding.profile_photo} alt="Profile" className="w-16 h-16 rounded-lg object-cover" />
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400">
                                  <User className="w-6 h-6" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className="text-sm text-slate-700">{selectedOnboarding.bio || 'No bio provided'}</p>
                              </div>
                            </div>
                          </div>

                          {/* Personal Details */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Personal Details</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500">T-Shirt Size:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.tshirt_size || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Aadhar:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.aadhar_number || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">PAN:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.pan_number || 'N/A'}</span>
                              </div>
                              <div className="col-span-2">
                                <span className="text-slate-500">Address:</span>
                                <span className="ml-1 font-medium">
                                  {selectedOnboarding.address_line1 ? 
                                    `${selectedOnboarding.address_line1}, ${selectedOnboarding.city}, ${selectedOnboarding.state} - ${selectedOnboarding.pincode}` 
                                    : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Emergency Contact */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Emergency Contact</h5>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500">Name:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.emergency_contact_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Phone:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.emergency_contact_phone || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Relation:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.emergency_contact_relation || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Bank Details */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Bank Details</h5>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500">Bank:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.bank_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Account Holder:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.account_holder_name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Account No:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.account_number ? '****' + selectedOnboarding.account_number.slice(-4) : 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">IFSC:</span>
                                <span className="ml-1 font-medium">{selectedOnboarding.ifsc_code || 'N/A'}</span>
                              </div>
                            </div>
                          </div>

                          {/* Contract Status */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Contract</h5>
                            <div className="flex items-center gap-2 text-xs">
                              {selectedOnboarding.contract_accepted ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  <span className="text-green-700">Accepted on {new Date(selectedOnboarding.contract_accepted_at).toLocaleDateString()}</span>
                                  {selectedOnboarding.digital_signature && (
                                    <span className="ml-2 text-slate-500">Signature: {selectedOnboarding.digital_signature}</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-amber-500" />
                                  <span className="text-amber-700">Pending</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Document Links */}
                          <div className="border rounded-lg p-3">
                            <h5 className="font-medium text-[#1E3A5F] mb-2 text-sm">Uploaded Documents</h5>
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { label: 'Profile Photo', key: 'profile_photo' },
                                { label: 'Aadhar Card', key: 'aadhar_document' },
                                { label: 'PAN Card', key: 'pan_document' },
                                { label: 'Bank Document', key: 'bank_document' },
                              ].map(doc => (
                                <div key={doc.key} className="p-2 bg-slate-50 rounded text-xs">
                                  <span className="text-slate-500">{doc.label}: </span>
                                  {selectedOnboarding[doc.key] ? (
                                    <a href={selectedOnboarding[doc.key]} target="_blank" rel="noopener noreferrer" 
                                       className="text-blue-600 hover:underline">
                                      View ↗
                                    </a>
                                  ) : (
                                    <span className="text-red-500">Missing</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          {/* Verification Actions */}
                          {!selectedOnboarding.documents_verified ? (
                            <div className="space-y-2 border-t pt-3">
                              <Textarea
                                value={verificationNotes}
                                onChange={(e) => setVerificationNotes(e.target.value)}
                                placeholder="Add verification notes (optional)..."
                                className="text-sm"
                                rows={2}
                              />
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  onClick={() => handleVerifyDocuments(viewEducator.id, true)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Verify Documents
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => handleVerifyDocuments(viewEducator.id, false)}
                                  className="text-red-600 border-red-200 hover:bg-red-50"
                                >
                                  <Archive className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-green-50 rounded-lg text-green-700 text-sm">
                              ✓ Documents verified on {new Date(selectedOnboarding.documents_verified_at).toLocaleDateString()}
                              {selectedOnboarding.verification_notes && (
                                <p className="text-xs text-green-600 mt-1">Notes: {selectedOnboarding.verification_notes}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span>Status: <span className="font-medium text-[#1E3A5F] capitalize">{viewEducator.status?.replace('_', ' ')}</span></span>
                      <span>Demo Ready: <span className="font-medium text-[#1E3A5F]">{viewEducator.demo_ready ? 'Yes' : 'No'}</span></span>
                      {viewEducator.assigned_to && (
                        <span>| Assigned: {getAssignedUserName(viewEducator.assigned_to)}</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Schedule Demo Modal */}
      <Dialog open={!!showScheduleModal} onOpenChange={() => setShowScheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Demo - {showScheduleModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={scheduleData.date}
                  onSelect={(date) => setScheduleData({...scheduleData, date})}
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
                      scheduleData.time === time 
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => setScheduleData({...scheduleData, time})}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowScheduleModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleScheduleDemo} className="btn-primary flex-1">
                Schedule Demo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Lead - {showAssignModal?.name}
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
              <div className="max-h-64 overflow-y-auto space-y-2">
                {teamUsers.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No team members found. Create team users in Admin → Team Users.</p>
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

      {/* Demo Rating Modal */}
      <Dialog open={!!showRatingModal} onOpenChange={() => setShowRatingModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Rate Demo - {showRatingModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Rating Categories */}
            {Object.entries(RATING_CRITERIA).map(([key, criteria]) => (
              <div key={key} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-[#1E3A5F]">{criteria.label}</h4>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => setRatingData(prev => ({
                          ...prev,
                          [key]: { ...prev[key], score }
                        }))}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                          ratingData[key]?.score >= score
                            ? 'bg-amber-400 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {criteria.subPointers.map(pointer => (
                    <div key={pointer} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                      <span className="text-sm text-slate-600">{pointer}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button
                            key={s}
                            onClick={() => setRatingData(prev => ({
                              ...prev,
                              [key]: {
                                ...prev[key],
                                sub_scores: { ...prev[key]?.sub_scores, [pointer.toLowerCase().replace(/\s+/g, '_')]: s }
                              }
                            }))}
                            className={`w-5 h-5 rounded text-xs ${
                              (ratingData[key]?.sub_scores?.[pointer.toLowerCase().replace(/\s+/g, '_')] || 0) >= s
                                ? 'bg-amber-300 text-white'
                                : 'bg-slate-200 text-slate-400'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Technical Check */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold text-[#1E3A5F]">Technical Check</h4>
              <div className="grid grid-cols-3 gap-3">
                <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={ratingData.technical.webcam}
                    onChange={(e) => setRatingData(prev => ({
                      ...prev,
                      technical: { ...prev.technical, webcam: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Webcam OK</span>
                </label>
                <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                  <input
                    type="checkbox"
                    checked={ratingData.technical.mic}
                    onChange={(e) => setRatingData(prev => ({
                      ...prev,
                      technical: { ...prev.technical, mic: e.target.checked }
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">Mic OK</span>
                </label>
                <select
                  value={ratingData.technical.internet}
                  onChange={(e) => setRatingData(prev => ({
                    ...prev,
                    technical: { ...prev.technical, internet: e.target.value }
                  }))}
                  className="bg-slate-50 rounded-lg px-3 py-2 text-sm border-0"
                >
                  <option value="excellent">Internet: Excellent</option>
                  <option value="good">Internet: Good</option>
                  <option value="average">Internet: Average</option>
                  <option value="poor">Internet: Poor</option>
                </select>
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Feedback / Notes</label>
              <Textarea
                value={ratingData.feedback}
                onChange={(e) => setRatingData(prev => ({ ...prev, feedback: e.target.value }))}
                placeholder="Overall feedback about the demo..."
                className="min-h-[80px]"
              />
            </div>

            {/* Recommendation */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Recommendation</label>
              <div className="flex gap-2">
                {[
                  { value: 'onboard', label: 'Onboard', color: 'bg-green-100 text-green-700 border-green-300' },
                  { value: 'retake', label: 'Retake Demo', color: 'bg-amber-100 text-amber-700 border-amber-300' },
                  { value: 'reject', label: 'Reject', color: 'bg-red-100 text-red-700 border-red-300' }
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setRatingData(prev => ({ ...prev, recommendation: opt.value }))}
                    className={`flex-1 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                      ratingData.recommendation === opt.value
                        ? opt.color
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRatingModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRating} 
                className="flex-1 bg-[#D63031] hover:bg-[#b52828]"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Submit Rating
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Direct Onboard Modal */}
      <Dialog open={showDirectOnboardModal} onOpenChange={setShowDirectOnboardModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Direct Onboard Educator</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500 mb-4">
            Add an educator directly to onboarding (skips the selection process)
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <Input
                value={directOnboardForm.name}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, name: e.target.value})}
                placeholder="Educator name"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Email *</label>
              <Input
                type="email"
                value={directOnboardForm.email}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, email: e.target.value})}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Phone *</label>
              <Input
                value={directOnboardForm.phone}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, phone: e.target.value})}
                placeholder="10-digit phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Skills (comma separated)</label>
              <Input
                value={directOnboardForm.skills}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, skills: e.target.value})}
                placeholder="Music, Dance, Chess"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">City</label>
              <Input
                value={directOnboardForm.city}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, city: e.target.value})}
                placeholder="City"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Experience</label>
              <Input
                value={directOnboardForm.experience}
                onChange={(e) => setDirectOnboardForm({...directOnboardForm, experience: e.target.value})}
                placeholder="e.g., 3 years"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowDirectOnboardModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleDirectOnboard} className="flex-1 bg-[#D63031]">
                <UserPlus className="w-4 h-4 mr-2" />
                Add & Start Onboarding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Requirement Modal */}
      <Dialog open={showRequirementModal} onOpenChange={(open) => {
        if (!open) {
          setShowRequirementModal(false);
          setEditingRequirement(null);
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">
              {editingRequirement ? 'Edit Requirement' : 'Add New Requirement'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <Input
                value={requirementForm.title}
                onChange={(e) => setRequirementForm({ ...requirementForm, title: e.target.value })}
                placeholder="e.g., Robotics Educator for Weekend Classes"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Skill *</label>
                <select
                  value={requirementForm.skill}
                  onChange={(e) => setRequirementForm({ ...requirementForm, skill: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Skill</option>
                  <option value="Robotics">Robotics</option>
                  <option value="Coding">Coding</option>
                  <option value="AI">AI & ML</option>
                  <option value="Entrepreneurship">Entrepreneurship</option>
                  <option value="Financial Literacy">Financial Literacy</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
                <select
                  value={requirementForm.city}
                  onChange={(e) => setRequirementForm({ ...requirementForm, city: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select City</option>
                  {cities.map(c => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Area</label>
              <Input
                value={requirementForm.area}
                onChange={(e) => setRequirementForm({ ...requirementForm, area: e.target.value })}
                placeholder="e.g., Andheri West"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                value={requirementForm.description}
                onChange={(e) => setRequirementForm({ ...requirementForm, description: e.target.value })}
                placeholder="Job description and requirements..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Positions</label>
                <Input
                  type="number"
                  min="1"
                  value={requirementForm.positions}
                  onChange={(e) => setRequirementForm({ ...requirementForm, positions: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pay Type</label>
                <select
                  value={requirementForm.pay_type}
                  onChange={(e) => setRequirementForm({ ...requirementForm, pay_type: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="per_session">Per Session</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pay Amount (₹)</label>
                <Input
                  value={requirementForm.pay_amount}
                  onChange={(e) => setRequirementForm({ ...requirementForm, pay_amount: e.target.value })}
                  placeholder="e.g., 500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={requirementForm.is_active ? 'active' : 'inactive'}
                  onChange={(e) => setRequirementForm({ ...requirementForm, is_active: e.target.value === 'active' })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRequirementModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveRequirement} className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
                {editingRequirement ? 'Update' : 'Create'} Requirement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Single Educator Modal */}
      <Dialog open={showAddEducatorModal} onOpenChange={setShowAddEducatorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Add Active Educator</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
              <Input
                value={addEducatorForm.name}
                onChange={(e) => setAddEducatorForm({ ...addEducatorForm, name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
              <Input
                type="email"
                value={addEducatorForm.email}
                onChange={(e) => setAddEducatorForm({ ...addEducatorForm, email: e.target.value })}
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
              <Input
                value={addEducatorForm.phone}
                onChange={(e) => setAddEducatorForm({ ...addEducatorForm, phone: e.target.value })}
                placeholder="10-digit phone number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
              <select
                value={addEducatorForm.city}
                onChange={(e) => setAddEducatorForm({ ...addEducatorForm, city: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select City</option>
                {cities.map(c => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Skills</label>
              <div className="flex flex-wrap gap-2">
                {['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy'].map(skill => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => {
                      const skills = addEducatorForm.skills || [];
                      if (skills.includes(skill)) {
                        setAddEducatorForm({ ...addEducatorForm, skills: skills.filter(s => s !== skill) });
                      } else {
                        setAddEducatorForm({ ...addEducatorForm, skills: [...skills, skill] });
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-sm ${
                      (addEducatorForm.skills || []).includes(skill)
                        ? 'bg-[#D63031] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {skill}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
              <Input
                value={addEducatorForm.experience}
                onChange={(e) => setAddEducatorForm({ ...addEducatorForm, experience: e.target.value })}
                placeholder="e.g., 3 years"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddEducatorModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddSingleEducator} className="flex-1 bg-[#D63031] hover:bg-[#c0392b]">
                Add Educator
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImportModal} onOpenChange={setShowBulkImportModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">Bulk Import Educators</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm text-slate-600 mb-3">
                Upload a CSV file with educator details. The file should have these columns:
              </p>
              <code className="text-xs bg-slate-200 px-2 py-1 rounded block">
                name, email, phone, skills, city, experience
              </code>
              <Button
                variant="link"
                onClick={downloadSampleCSV}
                className="text-[#D63031] p-0 h-auto mt-2"
              >
                Download Sample CSV
              </Button>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select CSV File</label>
              <input
                type="file"
                accept=".csv"
                onChange={handleBulkImportFile}
                className="w-full text-sm border border-slate-200 rounded-lg p-2"
              />
            </div>

            {bulkImportPreview.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-700 mb-2">Preview (first 5 rows):</p>
                <div className="bg-slate-50 rounded-lg p-3 text-xs overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">Name</th>
                        <th className="text-left p-1">Email</th>
                        <th className="text-left p-1">Phone</th>
                        <th className="text-left p-1">City</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkImportPreview.map((row, idx) => (
                        <tr key={idx} className="border-b border-slate-200">
                          <td className="p-1">{row.name}</td>
                          <td className="p-1">{row.email}</td>
                          <td className="p-1">{row.phone}</td>
                          <td className="p-1">{row.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowBulkImportModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleBulkImport} 
                disabled={!bulkImportFile || bulkImportLoading}
                className="flex-1 bg-[#D63031] hover:bg-[#c0392b]"
              >
                {bulkImportLoading ? 'Importing...' : 'Import Educators'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Educator Modal */}
      <Dialog open={!!showEditEducatorModal} onOpenChange={() => setShowEditEducatorModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#1E3A5F]" />
              Edit Educator: {showEditEducatorModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <Input
                  value={editEducatorForm.name}
                  onChange={(e) => setEditEducatorForm({ ...editEducatorForm, name: e.target.value })}
                  placeholder="Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <Input
                  value={editEducatorForm.phone}
                  onChange={(e) => setEditEducatorForm({ ...editEducatorForm, phone: e.target.value })}
                  placeholder="Phone"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <Input
                  value={editEducatorForm.email}
                  onChange={(e) => setEditEducatorForm({ ...editEducatorForm, email: e.target.value })}
                  placeholder="Email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <Input
                  value={editEducatorForm.city}
                  onChange={(e) => setEditEducatorForm({ ...editEducatorForm, city: e.target.value })}
                  placeholder="City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teaching Mode</label>
                <select
                  value={editEducatorForm.teaching_mode}
                  onChange={(e) => setEditEducatorForm({ ...editEducatorForm, teaching_mode: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select mode</option>
                  <option value="online">Online</option>
                  <option value="offline_home">Offline - At Home</option>
                  <option value="offline_center">Offline - At Center</option>
                  <option value="both">Both Online & Offline</option>
                </select>
              </div>
            </div>

            {/* Skills Management */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Skills</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {editEducatorForm.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-[#1E3A5F]/10 text-[#1E3A5F] rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:bg-red-100 rounded-full p-0.5"
                      data-testid={`remove-skill-${idx}`}
                    >
                      <X className="w-3 h-3 text-red-500" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newSkillInput}
                  onChange={(e) => setNewSkillInput(e.target.value)}
                  placeholder="Add new skill..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                />
                <Button type="button" onClick={handleAddSkill} variant="outline" className="border-[#1E3A5F] text-[#1E3A5F]">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Press Enter or click + to add skill</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Experience</label>
              <Textarea
                value={editEducatorForm.experience}
                onChange={(e) => setEditEducatorForm({ ...editEducatorForm, experience: e.target.value })}
                placeholder="Experience details..."
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowEditEducatorModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSaveEducator} className="flex-1 bg-[#1E3A5F] hover:bg-[#152c47]">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminEducators;
