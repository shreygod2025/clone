import React, { useState } from 'react';
import { MessageCircleQuestion, X, Loader2, Paperclip, Mic, Square, Play, Pause, ChevronLeft, Check } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import axios from 'axios';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL;

// Page-specific query types with categories and sub-categories
const PAGE_QUERY_CONFIG = {
  // Student/Parent pages
  student: {
    label: 'Student / Parent',
    queries: [
      { 
        value: 'course_info', label: 'Course & Programs', icon: '📚',
        subCategories: [
          { value: 'course_content', label: 'Course Content' },
          { value: 'course_pricing', label: 'Pricing & Fees' },
          { value: 'course_schedule', label: 'Schedule & Timing' },
          { value: 'age_eligibility', label: 'Age & Eligibility' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo', label: 'Demo & Trial', icon: '🎯',
        subCategories: [
          { value: 'book_demo', label: 'Book a Demo' },
          { value: 'reschedule', label: 'Reschedule Demo' },
          { value: 'demo_issue', label: 'Demo Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'payment', label: 'Payment & Fees', icon: '💳',
        subCategories: [
          { value: 'fee_structure', label: 'Fee Structure' },
          { value: 'payment_issue', label: 'Payment Issue' },
          { value: 'refund', label: 'Refund Request' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'class_support', label: 'Class Support', icon: '👨‍🏫',
        subCategories: [
          { value: 'class_timing', label: 'Class Timing' },
          { value: 'teacher_feedback', label: 'Teacher Feedback' },
          { value: 'missed_class', label: 'Missed Class' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // School pages
  school: {
    label: 'School Partnership',
    queries: [
      { 
        value: 'partnership', label: 'Partnership Info', icon: '🏫',
        subCategories: [
          { value: 'program_details', label: 'Program Details' },
          { value: 'pricing', label: 'Pricing & Packages' },
          { value: 'implementation', label: 'Implementation' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo', label: 'Demo & Meeting', icon: '🎯',
        subCategories: [
          { value: 'schedule_demo', label: 'Schedule Demo' },
          { value: 'reschedule', label: 'Reschedule Meeting' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'support', label: 'School Support', icon: '🔧',
        subCategories: [
          { value: 'kit_delivery', label: 'Kit Delivery' },
          { value: 'teacher_training', label: 'Teacher Training' },
          { value: 'technical', label: 'Technical Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'contract', label: 'Contract & Renewal', icon: '📄',
        subCategories: [
          { value: 'contract_query', label: 'Contract Query' },
          { value: 'renewal', label: 'Renewal' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Educator pages
  educator: {
    label: 'Educator / Teacher',
    queries: [
      { 
        value: 'job_opportunity', label: 'Job Opportunities', icon: '💼',
        subCategories: [
          { value: 'openings', label: 'Current Openings' },
          { value: 'eligibility', label: 'Eligibility & Requirements' },
          { value: 'salary', label: 'Compensation' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'application', label: 'Application Status', icon: '📋',
        subCategories: [
          { value: 'status_check', label: 'Check Status' },
          { value: 'update_application', label: 'Update Application' },
          { value: 'documents', label: 'Document Query' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'training', label: 'Training & Onboarding', icon: '🎓',
        subCategories: [
          { value: 'training_schedule', label: 'Training Schedule' },
          { value: 'materials', label: 'Training Materials' },
          { value: 'certification', label: 'Certification' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'teaching_support', label: 'Teaching Support', icon: '👨‍🏫',
        subCategories: [
          { value: 'curriculum', label: 'Curriculum Help' },
          { value: 'classroom', label: 'Classroom Issues' },
          { value: 'resources', label: 'Teaching Resources' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Growth Partner / Centers pages
  partner: {
    label: 'Center / Growth Partner',
    queries: [
      { 
        value: 'partnership', label: 'Partnership Info', icon: '🤝',
        subCategories: [
          { value: 'center_setup', label: 'Center Setup' },
          { value: 'investment', label: 'Investment Details' },
          { value: 'requirements', label: 'Requirements' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'application', label: 'Application', icon: '📋',
        subCategories: [
          { value: 'apply', label: 'Apply Now' },
          { value: 'status', label: 'Check Status' },
          { value: 'documents', label: 'Documents' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'support', label: 'Partner Support', icon: '🔧',
        subCategories: [
          { value: 'operations', label: 'Operations Help' },
          { value: 'marketing', label: 'Marketing Support' },
          { value: 'technical', label: 'Technical Support' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
  
  // Admin - Student CRM
  admin_students: {
    label: 'Student Management',
    queries: [
      { 
        value: 'lead_issue', label: 'Lead Issues', icon: '👥',
        subCategories: [
          { value: 'lead_not_visible', label: 'Lead Not Visible' },
          { value: 'duplicate_lead', label: 'Duplicate Lead' },
          { value: 'wrong_assignment', label: 'Wrong Assignment' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'demo_issue', label: 'Demo Issues', icon: '🎯',
        subCategories: [
          { value: 'scheduling', label: 'Scheduling Problem' },
          { value: 'link_issue', label: 'Demo Link Issue' },
          { value: 'recording', label: 'Recording Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'conversion', label: 'Conversion Issues', icon: '✅',
        subCategories: [
          { value: 'payment_tracking', label: 'Payment Tracking' },
          { value: 'status_update', label: 'Status Update' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'data_missing', label: 'Data Missing' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Admin - School CRM
  admin_schools: {
    label: 'School Management',
    queries: [
      { 
        value: 'lead_issue', label: 'Lead Issues', icon: '🏫',
        subCategories: [
          { value: 'lead_not_visible', label: 'Lead Not Visible' },
          { value: 'duplicate', label: 'Duplicate Lead' },
          { value: 'assignment', label: 'Assignment Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'onboarding', label: 'Onboarding Issues', icon: '📋',
        subCategories: [
          { value: 'workflow', label: 'Workflow Issue' },
          { value: 'tracking', label: 'Tracking Issue' },
          { value: 'documents', label: 'Document Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'kit_delivery', label: 'Kit & Delivery', icon: '📦',
        subCategories: [
          { value: 'tracking', label: 'Delivery Tracking' },
          { value: 'missing_items', label: 'Missing Items' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'data_issue', label: 'Data Issue' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Admin - Educator CRM
  admin_educators: {
    label: 'Educator Management',
    queries: [
      { 
        value: 'application', label: 'Application Issues', icon: '📋',
        subCategories: [
          { value: 'not_visible', label: 'Application Not Visible' },
          { value: 'status_issue', label: 'Status Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'assignment', label: 'Assignment Issues', icon: '👨‍🏫',
        subCategories: [
          { value: 'wrong_assignment', label: 'Wrong Assignment' },
          { value: 'schedule_conflict', label: 'Schedule Conflict' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'data_issue', label: 'Data Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Admin - Team
  admin_team: {
    label: 'Team Management',
    queries: [
      { 
        value: 'user_management', label: 'User Issues', icon: '👥',
        subCategories: [
          { value: 'access_issue', label: 'Access Issue' },
          { value: 'role_permission', label: 'Role/Permission' },
          { value: 'login_issue', label: 'Login Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Admin - Growth Partners
  admin_gp: {
    label: 'Growth Partner Management',
    queries: [
      { 
        value: 'application', label: 'Application Issues', icon: '📋',
        subCategories: [
          { value: 'not_visible', label: 'Not Visible' },
          { value: 'status_issue', label: 'Status Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'onboarding', label: 'Onboarding Issues', icon: '🚀',
        subCategories: [
          { value: 'workflow', label: 'Workflow Issue' },
          { value: 'documents', label: 'Document Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Admin - General (Orders, Reports, Support, etc.)
  admin_general: {
    label: 'Admin Panel',
    queries: [
      { 
        value: 'reports', label: 'Reports Issues', icon: '📊',
        subCategories: [
          { value: 'data_incorrect', label: 'Data Incorrect' },
          { value: 'export_issue', label: 'Export Issue' },
          { value: 'filter_issue', label: 'Filter Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'orders', label: 'Orders & Payments', icon: '💳',
        subCategories: [
          { value: 'payment_tracking', label: 'Payment Tracking' },
          { value: 'invoice_issue', label: 'Invoice Issue' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'technical', label: 'Technical Issues', icon: '🔧',
        subCategories: [
          { value: 'page_error', label: 'Page Error' },
          { value: 'slow_loading', label: 'Slow Loading' },
          { value: 'feature_bug', label: 'Feature Bug' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feature_request', label: 'Feature Request' },
          { value: 'feedback', label: 'Feedback' },
          { value: 'general', label: 'General' },
        ]
      },
    ]
  },
  
  // Default/General
  general: {
    label: 'General',
    queries: [
      { 
        value: 'course_info', label: 'Course Information', icon: '📚',
        subCategories: [
          { value: 'programs', label: 'Programs' },
          { value: 'pricing', label: 'Pricing' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'partnership', label: 'Partnership', icon: '🤝',
        subCategories: [
          { value: 'school', label: 'School Partnership' },
          { value: 'center', label: 'Center Partnership' },
          { value: 'other', label: 'Other' },
        ]
      },
      { 
        value: 'careers', label: 'Careers', icon: '💼',
        subCategories: [
          { value: 'teaching', label: 'Teaching Jobs' },
          { value: 'other', label: 'Other Roles' },
        ]
      },
      { 
        value: 'other', label: 'Other', icon: '❓',
        subCategories: [
          { value: 'feedback', label: 'Feedback' },
          { value: 'complaint', label: 'Complaint' },
          { value: 'general', label: 'General Query' },
        ]
      },
    ]
  },
};

// Get page config based on URL
const getPageConfig = (path) => {
  if (path.includes('/admin/students')) return PAGE_QUERY_CONFIG.admin_students;
  if (path.includes('/admin/schools')) return PAGE_QUERY_CONFIG.admin_schools;
  if (path.includes('/admin/educators')) return PAGE_QUERY_CONFIG.admin_educators;
  if (path.includes('/admin/team') || path.includes('/admin/users')) return PAGE_QUERY_CONFIG.admin_team;
  if (path.includes('/admin/growth-partners')) return PAGE_QUERY_CONFIG.admin_gp;
  if (path.includes('/admin')) return PAGE_QUERY_CONFIG.admin_general;
  if (path.includes('/student')) return PAGE_QUERY_CONFIG.student;
  if (path.includes('/school')) return PAGE_QUERY_CONFIG.school;
  if (path.includes('/educator')) return PAGE_QUERY_CONFIG.educator;
  if (path.includes('/centers') || path.includes('/growth-partner')) return PAGE_QUERY_CONFIG.partner;
  return PAGE_QUERY_CONFIG.general;
};

const RaiseQueryButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [formData, setFormData] = useState({
    query_type: '',
    related_to: '',
    message: '',
    name: '',
    phone: '',
    email: '',
  });
  
  const [attachments, setAttachments] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordTime, setRecordTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef(null);
  const timerRef = React.useRef(null);

  const currentPath = window.location.pathname;
  const pageConfig = getPageConfig(currentPath);
  const selectedQueryType = pageConfig.queries.find(q => q.value === formData.query_type);
  const totalSteps = isLoggedIn ? 3 : 4;

  const handleOpen = () => {
    const token = localStorage.getItem('oll_token');
    const loggedIn = !!token;
    setIsLoggedIn(loggedIn);
    
    const storedUser = localStorage.getItem('oll_user');
    let user = null;
    if (storedUser) {
      try { user = JSON.parse(storedUser); } catch (e) {}
    }
    setUserData(user);
    
    setFormData({
      query_type: '',
      related_to: '',
      message: '',
      name: user?.name || user?.full_name || '',
      phone: user?.phone || '',
      email: user?.email || '',
    });
    setAttachments([]);
    setAudioBlob(null);
    setAudioUrl(null);
    setStep(1);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep(1);
  };

  // Auto-advance when selecting category
  const handleCategorySelect = (value) => {
    setFormData({ ...formData, query_type: value, related_to: '' });
    setStep(2); // Auto-advance to sub-category
  };

  // Auto-advance when selecting sub-category
  const handleSubCategorySelect = (value) => {
    setFormData({ ...formData, related_to: value });
    setStep(3); // Auto-advance to description
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordTime(0);
      timerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (err) {
      toast.error('Unable to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`);
        continue;
      }
      const fd = new FormData();
      fd.append('file', file);
      try {
        const res = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setAttachments(prev => [...prev, { name: file.name, url: res.data.url, type: file.type }]);
      } catch (err) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = async () => {
    if (!formData.message.trim()) {
      toast.error('Please describe your query');
      return;
    }

    setLoading(true);
    try {
      let allAttachments = [...attachments];
      if (audioBlob) {
        const fd = new FormData();
        fd.append('file', audioBlob, 'voice-note.webm');
        const uploadRes = await axios.post(`${API}/upload`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        allAttachments.push({ name: 'Voice Note', url: uploadRes.data.url, type: 'audio/webm', isVoiceNote: true });
      }

      const queryTypeLabel = selectedQueryType?.label || 'General Query';
      const subCategoryLabel = selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label || '';

      await axios.post(`${API}/inquiry/query`, {
        inquiry_type: 'student',
        action_type: 'query',
        name: formData.name || userData?.name || 'Anonymous',
        phone: formData.phone || userData?.phone || '',
        email: formData.email || userData?.email || '',
        query_type: queryTypeLabel,
        related_to: subCategoryLabel,
        query_details: formData.message,
        priority: 'normal',
        source: `quick_help_${currentPath.replace(/\//g, '_').substring(0, 50)}`,
        page_context: pageConfig.label,
        attachments: allAttachments,
      });

      toast.success('Query submitted! Our team will get back to you soon.');
      handleClose();
    } catch (err) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = () => {
    return formData.message.trim().length > 0;
  };

  const handleNext = () => {
    if (step === 3 && isLoggedIn) {
      handleSubmit();
    } else if (step === totalSteps) {
      handleSubmit();
    } else {
      setStep(step + 1);
    }
  };

  return (
    <>
      {/* Glassmorphism Sticky Button - White text/icon */}
      <button
        onClick={handleOpen}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 
          bg-[#1E3A5F]/90 backdrop-blur-lg 
          text-white rounded-full shadow-lg 
          hover:bg-[#1E3A5F] hover:shadow-xl hover:scale-105
          transition-all duration-300"
        data-testid="raise-query-btn"
      >
        <MessageCircleQuestion className="w-5 h-5 text-white" />
        <span className="font-medium text-sm text-white">Need Help?</span>
      </button>

      {/* Query Dialog */}
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className={`p-0 overflow-hidden bg-white rounded-2xl ${step === 1 ? 'max-w-sm' : 'max-w-md'}`}>
          {/* Header */}
          <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8a] p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <MessageCircleQuestion className="w-4 h-4" />
                {step === 1 ? 'How can we help?' : pageConfig.label}
              </h2>
              <button onClick={handleClose} className="p-1 hover:bg-white/20 rounded-full transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Progress Steps - Smaller */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }, (_, i) => (
                <React.Fragment key={i}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                    step > i + 1 ? 'bg-green-400 text-white' :
                    step === i + 1 ? 'bg-white text-[#1E3A5F]' :
                    'bg-white/20 text-white/60'
                  }`}>
                    {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`flex-1 h-0.5 ${step > i + 1 ? 'bg-green-400' : 'bg-white/20'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className={`p-4 ${step === 1 ? 'min-h-[200px]' : 'min-h-[260px]'}`}>
            {/* Step 1: Select Query Type - Compact */}
            {step === 1 && (
              <div className="space-y-2">
                {pageConfig.queries.map(type => (
                  <button
                    key={type.value}
                    onClick={() => handleCategorySelect(type.value)}
                    className="w-full p-3 rounded-xl border-2 border-slate-200 hover:border-[#FF6B35] hover:bg-orange-50 
                      text-left transition-all flex items-center gap-3"
                  >
                    <span className="text-xl">{type.icon}</span>
                    <span className="text-sm font-medium text-slate-800">{type.label}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Select Sub-category */}
            {step === 2 && selectedQueryType && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                  <span className="text-xl">{selectedQueryType.icon}</span>
                  <span className="text-sm font-medium text-slate-700">{selectedQueryType.label}</span>
                </div>
                {selectedQueryType.subCategories.map(sub => (
                  <button
                    key={sub.value}
                    onClick={() => handleSubCategorySelect(sub.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                      formData.related_to === sub.value
                        ? 'border-[#FF6B35] bg-orange-50'
                        : 'border-slate-200 hover:border-[#FF6B35] hover:bg-orange-50'
                    }`}
                  >
                    <span className="text-sm font-medium text-slate-700">{sub.label}</span>
                    {formData.related_to === sub.value && <Check className="w-4 h-4 text-[#FF6B35]" />}
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Description */}
            {step === 3 && (
              <div className="space-y-3">
                {/* Selected summary */}
                <div className="bg-slate-50 rounded-lg p-2 text-xs flex items-center gap-2">
                  <span className="text-lg">{selectedQueryType?.icon}</span>
                  <span className="text-slate-600">
                    {selectedQueryType?.label} → {selectedQueryType?.subCategories?.find(s => s.value === formData.related_to)?.label}
                  </span>
                </div>

                <Textarea
                  placeholder="Please describe your issue or question..."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="min-h-[100px] resize-none text-sm"
                  data-testid="query-message"
                />

                {/* Attachments */}
                <div className="flex gap-2">
                  <label className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer text-xs">
                    <Paperclip className="w-3.5 h-3.5 text-slate-600" />
                    <span className="text-slate-600">Attach</span>
                    <input type="file" className="hidden" multiple onChange={handleFileUpload} />
                  </label>
                  
                  {!isRecording && !audioUrl && (
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-1 px-2 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs"
                    >
                      <Mic className="w-3.5 h-3.5 text-slate-600" />
                      <span className="text-slate-600">Voice</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-1 px-2 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs animate-pulse"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                      <span>{formatTime(recordTime)}</span>
                    </button>
                  )}
                </div>

                {/* Audio Preview */}
                {audioUrl && (
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-2">
                    <button
                      onClick={() => {
                        if (isPlaying) audioRef.current?.pause();
                        else audioRef.current?.play();
                        setIsPlaying(!isPlaying);
                      }}
                      className="w-7 h-7 flex items-center justify-center bg-white rounded-full shadow-sm"
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    </button>
                    <span className="text-xs text-slate-600 flex-1">Voice ({formatTime(recordTime)})</span>
                    <button onClick={() => { setAudioUrl(null); setAudioBlob(null); setRecordTime(0); }} className="text-red-500">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <audio ref={audioRef} src={audioUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
                  </div>
                )}

                {/* Attachment Previews */}
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center gap-1 bg-slate-100 rounded px-2 py-1 text-xs">
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[60px] truncate">{att.name}</span>
                        <button onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} className="text-red-500">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Contact Details (non-logged-in only) */}
            {step === 4 && !isLoggedIn && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Share your contact details so we can get back to you.
                </p>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
                  <Input
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
                  <Input
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                  <Input
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-9 text-sm"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer - Back button always visible from step 2 */}
          <div className="p-3 border-t bg-slate-50 flex gap-2">
            {step > 1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 h-9"
              >
                <ChevronLeft className="w-4 h-4" />
                Back
              </Button>
            )}
            {step >= 3 && (
              <Button
                size="sm"
                className="flex-1 bg-[#FF6B35] hover:bg-[#E55A2B] text-white h-9"
                onClick={handleNext}
                disabled={!canSubmit() || loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                {step === totalSteps || (step === 3 && isLoggedIn) ? 'Submit' : 'Next'}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default RaiseQueryButton;
