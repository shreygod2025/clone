import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Building2, Phone, MapPin, Plus, MessageSquare, Calendar, Archive, CalendarClock, CheckCircle2, Video, Users, User, Mail, Layers, DollarSign, UserPlus, Send, Clock, Edit, Save, RefreshCw, X, Upload, Download, FileSpreadsheet, AlertCircle, Gift, FileText, Receipt } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Helper to safely extract error message from API errors
const getErrorMessage = (error, fallback = 'An error occurred') => {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail[0]?.msg || fallback;
  }
  if (typeof detail === 'object' && detail !== null) {
    return detail.msg || detail.message || fallback;
  }
  return error?.message || fallback;
};

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'meeting_done', label: 'Meeting Done', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-orange-500' },
  { value: 'active', label: 'Active Schools', color: 'bg-green-500' },
  { value: 'renewed', label: 'Renewed', color: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'State Board', 'IB'];
const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const AdminSchoolCRM = () => {
  const { getAuthHeaders, user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Main Tab State - dashboard, leads, contacts
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Contacts Management State
  const [allContacts, setAllContacts] = useState([]);
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showEditContactModal, setShowEditContactModal] = useState(null);
  const [editContactData, setEditContactData] = useState({
    name: '', phone: '', email: '', role: '', school_id: '', school_name: '',
    birthday: '', anniversary: '', notes: ''
  });
  
  // Modal states
  const [viewInquiry, setViewInquiry] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showFollowupModal, setShowFollowupModal] = useState(null);
  const [showOnboardModal, setShowOnboardModal] = useState(null);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showEditOnboardingModal, setShowEditOnboardingModal] = useState(null);
  const [showAddMeetingModal, setShowAddMeetingModal] = useState(null);
  const [showOnboardingWorkflowModal, setShowOnboardingWorkflowModal] = useState(null);
  const [showMeetingDoneModal, setShowMeetingDoneModal] = useState(null);
  const [meetingDoneData, setMeetingDoneData] = useState({ 
    notes: '', 
    quoted_price: '',
    followup_type: '', // 'message' or 'meeting'
    followup_date: null, 
    followup_time: '' 
  });
  const [newMeetingData, setNewMeetingData] = useState({ date: null, time: '', type: 'offline', notes: '' });
  const [newComment, setNewComment] = useState('');
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ school_name: '', contact_name: '', phone: '', email: '', meeting_date: '', meeting_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Bulk Import states
  const [bulkImportData, setBulkImportData] = useState([]);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportErrors, setBulkImportErrors] = useState([]);
  
  // Autocomplete states
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState('');
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', meeting_type: 'offline', reason: '' });
  const [convertData, setConvertData] = useState({ 
    amount: '', 
    model: '', 
    book_type: '', 
    kit_type: '', 
    training_type: '',
    programs: []
  });
  const [followupData, setFollowupData] = useState({ date: null, comment: '', auto_email: false });
  const [onboardData, setOnboardData] = useState({
    offering: '', // Select from offerings
    model: '',
    book_type: '', // individual_books, no_books
    kit_type: '', // lab_setup, individual, no_kit
    training_type: '', // student_training, teacher_training
    grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
    total_students: 0,
    total_amount: 0,
    school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
    // Payment details
    payment_mode: 'from_school', // from_school, from_student
    payment_method: '', // cheque, neft, online, cash
    payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
    contract_start: '',
    contract_end: '',
    mou_url: '', // MOU document upload
    is_draft: false,
  });
  const [editOnboardData, setEditOnboardData] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [uploadingMOU, setUploadingMOU] = useState(false);
  const [newLead, setNewLead] = useState({
    school_name: '',
    contact_name: '',
    phone: '',
    countryCode: '+91',
    email: '',
    location: '',
    board: '',
    student_count: '',
    meeting_type: 'offline',
    meeting_date: null,
    meeting_time: '',
    source: 'manual',
    notes: '',
    quoted_price: '',
    selected_offerings: []
  });

  useEffect(() => {
    fetchInquiries();
    fetchTeamUsers();
    fetchOfferings();
  }, []);

  // Extract all contacts from all schools for contact management
  useEffect(() => {
    const contacts = [];
    inquiries.forEach(school => {
      // Add primary contact
      if (school.contact_name && school.phone) {
        contacts.push({
          id: `${school.id}-primary`,
          name: school.contact_name,
          phone: school.phone,
          email: school.email || '',
          role: 'Primary Contact',
          school_id: school.id,
          school_name: school.school_name,
          school_status: school.status,
          birthday: school.contact_birthday || '',
          anniversary: school.contact_anniversary || '',
          notes: school.contact_notes || ''
        });
      }
      // Add additional contacts from onboarding data
      if (school.onboarding_data?.school_contacts) {
        school.onboarding_data.school_contacts.forEach((c, idx) => {
          if (c.name && c.phone) {
            contacts.push({
              id: `${school.id}-contact-${idx}`,
              name: c.name,
              phone: c.phone,
              email: c.email || '',
              role: c.role || 'Additional Contact',
              school_id: school.id,
              school_name: school.school_name,
              school_status: school.status,
              birthday: c.birthday || '',
              anniversary: c.anniversary || '',
              notes: c.notes || ''
            });
          }
        });
      }
    });
    setAllContacts(contacts);
  }, [inquiries]);

  // Get this week's data for dashboard
  const getThisWeekData = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const meetings = inquiries.filter(i => {
      if (!i.meeting_date) return false;
      const meetingDate = new Date(i.meeting_date);
      return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
    }).sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));

    const followups = inquiries.filter(i => {
      if (!i.followup_date) return false;
      const followupDate = new Date(i.followup_date);
      return followupDate >= startOfWeek && followupDate <= endOfWeek;
    }).sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date));

    // Additional meetings (stored in meetings array)
    const additionalMeetings = [];
    inquiries.forEach(i => {
      if (i.meetings && Array.isArray(i.meetings)) {
        i.meetings.forEach(m => {
          const mDate = new Date(m.date);
          if (mDate >= startOfWeek && mDate <= endOfWeek) {
            additionalMeetings.push({
              ...m,
              school_id: i.id,
              school_name: i.school_name,
              contact_name: i.contact_name,
              phone: i.phone
            });
          }
        });
      }
    });

    return { meetings, followups, additionalMeetings };
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

  const fetchOfferings = async () => {
    try {
      const response = await axios.get(`${API}/school-offerings`);
      setOfferings(response.data || []);
    } catch (error) {
      console.error('Failed to fetch offerings:', error);
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
      const response = await axios.get(`${API}/data-center/autocomplete?q=${encodeURIComponent(query)}&data_type=schools`, {
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
      school_name: suggestion.school_name || '',
      contact_name: suggestion.contact_name || '',
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      location: suggestion.location || '',
      board: suggestion.board || '',
      student_count: suggestion.student_count || '',
      meeting_type: suggestion.meeting_type || 'offline',
    });
    setShowAutocomplete(false);
    toast.info('Form auto-filled from existing record');
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/schools/inquiries`, {
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
      await axios.patch(`${API}/schools/inquiry/${inquiry.id}`, { 
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

  const handleMeetingDone = async (inquiry) => {
    // Open the meeting done modal instead of directly changing status
    setShowMeetingDoneModal(inquiry);
    setMeetingDoneData({ 
      notes: '', 
      quoted_price: inquiry.quoted_price || '', 
      followup_type: '', 
      followup_date: null, 
      followup_time: '' 
    });
  };

  const submitMeetingDone = async () => {
    if (!meetingDoneData.notes.trim()) {
      toast.error('Please enter meeting notes/minutes');
      return;
    }
    if (meetingDoneData.followup_type && (!meetingDoneData.followup_date || !meetingDoneData.followup_time)) {
      toast.error('Please select followup date and time');
      return;
    }
    try {
      // Update status to meeting_done with notes
      const updateData = {
        status: 'meeting_done',
        notes: showMeetingDoneModal.notes 
          ? `${showMeetingDoneModal.notes}\n\n--- Meeting Notes (${format(new Date(), 'dd MMM yyyy')}) ---\n${meetingDoneData.notes}`
          : `--- Meeting Notes (${format(new Date(), 'dd MMM yyyy')}) ---\n${meetingDoneData.notes}`,
        quoted_price: meetingDoneData.quoted_price || showMeetingDoneModal.quoted_price
      };
      
      // If followup is requested
      if (meetingDoneData.followup_type) {
        updateData.followup_type = meetingDoneData.followup_type;
        updateData.followup_date = format(meetingDoneData.followup_date, 'yyyy-MM-dd');
        updateData.followup_time = meetingDoneData.followup_time;
        
        if (meetingDoneData.followup_type === 'meeting') {
          updateData.meeting_date = format(meetingDoneData.followup_date, 'yyyy-MM-dd');
          updateData.meeting_time = meetingDoneData.followup_time;
        }
        
        updateData.status = 'followup';
      }
      
      await axios.patch(`${API}/schools/inquiry/${showMeetingDoneModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      const successMsg = meetingDoneData.followup_type === 'meeting' 
        ? 'Meeting completed & follow-up meeting scheduled!' 
        : meetingDoneData.followup_type === 'message'
          ? 'Meeting completed & follow-up message scheduled!'
          : 'Meeting marked as done!';
      toast.success(successMsg);
      setShowMeetingDoneModal(null);
      setMeetingDoneData({ notes: '', quoted_price: '', followup_type: '', followup_date: null, followup_time: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update meeting status');
    }
  };

  const handleReschedule = async () => {
    if (!rescheduleData.date || !rescheduleData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showRescheduleModal.id}`, {
        meeting_date: format(rescheduleData.date, 'yyyy-MM-dd'),
        meeting_time: rescheduleData.time,
        meeting_type: rescheduleData.meeting_type,
        notes: showRescheduleModal.notes 
          ? `${showRescheduleModal.notes}\n\nMeeting Rescheduled (${rescheduleData.meeting_type}): ${rescheduleData.reason}` 
          : `Meeting Rescheduled (${rescheduleData.meeting_type}): ${rescheduleData.reason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Meeting rescheduled successfully');
      setShowRescheduleModal(null);
      setRescheduleData({ date: null, time: '', meeting_type: 'offline', reason: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  const handleConvert = async () => {
    if (!convertData.amount) {
      toast.error('Please enter the deal amount');
      return;
    }
    if (!convertData.model) {
      toast.error('Please select a model/type');
      return;
    }
    try {
      // First update the school status and basic onboarding info
      await axios.patch(`${API}/schools/inquiry/${showConvertModal.id}`, {
        status: 'converted',
        conversion_amount: convertData.amount,
        initial_onboard_data: {
          model: convertData.model,
          book_type: convertData.book_type,
          kit_type: convertData.kit_type,
          training_type: convertData.training_type,
          programs: convertData.programs
        },
        notes: showConvertModal.notes 
          ? `${showConvertModal.notes}\n\nConverted: ₹${convertData.amount} | Model: ${convertData.model}` 
          : `Converted: ₹${convertData.amount} | Model: ${convertData.model}`
      }, {
        headers: getAuthHeaders()
      });
      
      // Auto-initialize the onboarding workflow
      try {
        const response = await axios.post(`${API}/schools/${showConvertModal.id}/init-onboarding`, {}, {
          headers: getAuthHeaders()
        });
        const trackingUrl = `${window.location.origin}/track/${response.data.tracking_token}`;
        navigator.clipboard.writeText(trackingUrl);
        toast.success('School converted! Tracking link copied to clipboard.');
      } catch (initError) {
        console.log('Onboarding init skipped:', initError);
        toast.success('School converted successfully!');
      }
      
      setShowConvertModal(null);
      setConvertData({ amount: '', model: '', book_type: '', kit_type: '', training_type: '', programs: [] });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to convert');
    }
  };

  const handleArchive = async (inquiry) => {
    await handleStatusChange(inquiry, 'archived');
  };

  const handleOnboardSchool = async (saveAsDraft = false) => {
    if (!showOnboardModal) return;
    
    try {
      // Calculate totals
      const totalStudents = onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
      const totalAmount = onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
      
      // Convert dates to strings - ensure they are proper string format
      const contractStart = onboardData.contract_start 
        ? (typeof onboardData.contract_start === 'string' 
            ? onboardData.contract_start 
            : (onboardData.contract_start instanceof Date 
                ? format(onboardData.contract_start, 'yyyy-MM-dd')
                : String(onboardData.contract_start)))
        : '';
      const contractEnd = onboardData.contract_end 
        ? (typeof onboardData.contract_end === 'string' 
            ? onboardData.contract_end 
            : (onboardData.contract_end instanceof Date 
                ? format(onboardData.contract_end, 'yyyy-MM-dd')
                : String(onboardData.contract_end)))
        : '';
      
      // Format school contacts - combine country code with phone number
      const formattedContacts = onboardData.school_contacts
        .filter(c => c.name && c.phone_number)
        .map(c => ({
          name: String(c.name || ''),
          phone: String((c.country_code || '+91') + (c.phone_number || '')),
          email: String(c.email || ''),
          role: String(c.role || '')
        }));
      
      // Format payment tranches - ensure all values are strings/numbers
      const formattedTranches = onboardData.payment_tranches
        .filter(t => t.amount || t.percentage)
        .map(t => ({
          percentage: String(t.percentage || ''),
          amount: String(t.amount || ''),
          date: String(t.date || ''),
          notes: String(t.notes || '')
        }));
      
      await axios.post(`${API}/schools/onboard`, {
        school_id: showOnboardModal.id,
        offering: String(onboardData.offering || ''),
        model: String(onboardData.model || ''),
        book_type: String(onboardData.book_type || ''),
        kit_type: String(onboardData.kit_type || ''),
        training_type: String(onboardData.training_type || ''),
        grade_pricing: onboardData.grade_pricing.filter(g => g.grade && g.students),
        total_students: totalStudents,
        total_amount: totalAmount,
        school_contacts: formattedContacts,
        payment_mode: String(onboardData.payment_mode || ''),
        payment_method: String(onboardData.payment_method || ''),
        payment_tranches: formattedTranches,
        contract_start: contractStart,
        contract_end: contractEnd,
        mou_url: String(onboardData.mou_url || ''),
        is_draft: saveAsDraft,
      }, { headers: getAuthHeaders() });
      
      // Update school status based on save mode
      if (!saveAsDraft) {
        // Set status to converted
        await axios.patch(`${API}/schools/inquiry/${showOnboardModal.id}`, {
          status: 'converted',
          conversion_amount: String(totalAmount)
        }, { headers: getAuthHeaders() });
        
        // Auto-initialize the onboarding workflow
        try {
          const response = await axios.post(`${API}/schools/${showOnboardModal.id}/init-onboarding`, {}, {
            headers: getAuthHeaders()
          });
          const trackingUrl = `${window.location.origin}/track/${response.data.tracking_token}`;
          navigator.clipboard.writeText(trackingUrl);
          toast.success('School converted! Tracking link copied to clipboard.');
        } catch (initError) {
          console.log('Onboarding init skipped:', initError);
          toast.success('School marked as Converted!');
        }
      } else {
        toast.success('Draft saved! You can continue later.');
      }
      
      setShowOnboardModal(null);
      setOnboardData({
        offering: '', model: '', book_type: '', kit_type: '', training_type: '',
        grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
        total_students: 0, total_amount: 0, school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
        payment_mode: 'from_school', payment_method: '', payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
        contract_start: '', contract_end: '', mou_url: '', is_draft: false
      });
      fetchInquiries();
    } catch (error) {
      console.error('Onboard error:', error);
      toast.error(getErrorMessage(error, 'Failed to save conversion details'));
    }
  };

  const addGradePricing = () => {
    setOnboardData(prev => ({
      ...prev,
      grade_pricing: [...prev.grade_pricing, { grade: '', students: '', price_per_student: '' }]
    }));
  };

  const updateGradePricing = (index, field, value) => {
    setOnboardData(prev => ({
      ...prev,
      grade_pricing: prev.grade_pricing.map((g, i) => i === index ? { ...g, [field]: value } : g)
    }));
  };

  const addSchoolContact = () => {
    setOnboardData(prev => ({
      ...prev,
      school_contacts: [...prev.school_contacts, { name: '', phone_number: '', country_code: '+91', email: '', role: '' }]
    }));
  };

  const updateSchoolContact = (index, field, value) => {
    setOnboardData(prev => ({
      ...prev,
      school_contacts: prev.school_contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  // Payment tranche helpers
  const addPaymentTranche = () => {
    setOnboardData(prev => ({
      ...prev,
      payment_tranches: [...prev.payment_tranches, { amount: '', percentage: '', date: '', notes: '' }]
    }));
  };

  const updatePaymentTranche = (index, field, value) => {
    const totalAmount = onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
    
    setOnboardData(prev => {
      const newTranches = prev.payment_tranches.map((t, i) => {
        if (i !== index) return t;
        const updated = { ...t, [field]: value };
        
        // Auto-calculate based on input
        if (field === 'percentage' && value && totalAmount > 0) {
          updated.amount = Math.round((parseFloat(value) / 100) * totalAmount).toString();
        } else if (field === 'amount' && value && totalAmount > 0) {
          updated.percentage = ((parseFloat(value) / totalAmount) * 100).toFixed(1);
        }
        
        return updated;
      });
      return { ...prev, payment_tranches: newTranches };
    });
  };

  const removePaymentTranche = (index) => {
    if (onboardData.payment_tranches.length > 1) {
      setOnboardData(prev => ({
        ...prev,
        payment_tranches: prev.payment_tranches.filter((_, i) => i !== index)
      }));
    }
  };

  // MOU file upload handler
  const handleMOUUpload = async (file) => {
    if (!file) return;
    setUploadingMOU(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'mou');
      const response = await axios.post(`${API}/upload?type=mou`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setOnboardData(prev => ({ ...prev, mou_url: response.data.url }));
      toast.success('MOU uploaded successfully');
    } catch (error) {
      console.error('MOU upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload MOU'));
    } finally {
      setUploadingMOU(false);
    }
  };

  // Calculate onboarding progress for drafts
  const calculateOnboardingProgress = (inquiry) => {
    if (!inquiry.onboarding_id || inquiry.onboarding_status !== 'draft') return null;
    let progress = 0;
    const steps = [];
    
    // Check which fields are filled (we'd need to fetch onboarding data, but for now use inquiry data)
    if (inquiry.model) { progress += 15; steps.push('Model selected'); }
    if (inquiry.total_students > 0) { progress += 20; steps.push('Students added'); }
    // Basic progress based on onboarding started
    if (inquiry.onboarding_id) { progress += 25; steps.push('Onboarding started'); }
    
    return { progress: Math.min(progress, 100), steps };
  };

  const handleAddLead = async () => {
    if (!newLead.school_name || !newLead.contact_name || !newLead.phone) {
      toast.error('School name, contact name and phone are required');
      return;
    }
    const fullPhone = newLead.countryCode === '+91' ? newLead.phone : `${newLead.countryCode}${newLead.phone}`;
    try {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: newLead.school_name,
        contact_name: newLead.contact_name,
        email: newLead.email || `${newLead.phone}@school.oll`,
        phone: fullPhone,
        location: newLead.location,
        school_size: newLead.student_count || '',
        fee_range: '',
        board: newLead.board,
        meeting_type: newLead.meeting_type,
        meeting_date: newLead.meeting_date ? format(newLead.meeting_date, 'yyyy-MM-dd') : null,
        meeting_time: newLead.meeting_time,
        programs_interested: [],
        support_needed: [],
        source: newLead.source,
        notes: newLead.notes,
        quoted_price: newLead.quoted_price,
        selected_offerings: newLead.selected_offerings,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({ 
        school_name: '', 
        contact_name: '', 
        phone: '', 
        countryCode: '+91',
        email: '',
        location: '', 
        board: '', 
        student_count: '',
        meeting_type: 'offline', 
        meeting_date: null,
        meeting_time: '',
        source: 'manual', 
        notes: '',
        quoted_price: '',
        selected_offerings: []
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
      await axios.post(`${API}/schools/comment/${showCommentModal.id}`, 
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

  const handleSaveEdit = async () => {
    if (!viewInquiry) return;
    try {
      await axios.patch(`${API}/schools/inquiry/${viewInquiry.id}`, {
        school_name: editData.school_name,
        contact_name: editData.contact_name,
        phone: editData.phone,
        email: editData.email,
        meeting_date: editData.meeting_date || null,
        meeting_time: editData.meeting_time || null,
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
      await axios.post(`${API}/schools/comment/${viewInquiry.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewInquiry data
      const response = await axios.get(`${API}/schools/inquiries`, { headers: getAuthHeaders() });
      const updatedInquiry = response.data.find(i => i.id === viewInquiry.id);
      if (updatedInquiry) setViewInquiry(updatedInquiry);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // Add additional meeting (followup meeting)
  const handleAddMeeting = async () => {
    if (!newMeetingData.date || !newMeetingData.time) {
      toast.error('Please select date and time');
      return;
    }
    try {
      const meetingEntry = {
        id: `meeting-${Date.now()}`,
        date: format(newMeetingData.date, 'yyyy-MM-dd'),
        time: newMeetingData.time,
        type: newMeetingData.type,
        notes: newMeetingData.notes,
        created_at: new Date().toISOString(),
        status: 'scheduled'
      };
      
      const existingMeetings = showAddMeetingModal.meetings || [];
      await axios.patch(`${API}/schools/inquiry/${showAddMeetingModal.id}`, {
        meetings: [...existingMeetings, meetingEntry]
      }, { headers: getAuthHeaders() });
      
      toast.success('Followup meeting added');
      setShowAddMeetingModal(null);
      setNewMeetingData({ date: null, time: '', type: 'offline', notes: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add meeting');
    }
  };

  // Update contact details
  const handleUpdateContact = async () => {
    if (!editContactData.name || !editContactData.phone) {
      toast.error('Name and phone are required');
      return;
    }
    try {
      // Update the contact in the school's data
      const school = inquiries.find(i => i.id === editContactData.school_id);
      if (!school) {
        toast.error('School not found');
        return;
      }

      const isPrimary = showEditContactModal.id.endsWith('-primary');
      
      if (isPrimary) {
        // Update primary contact
        await axios.patch(`${API}/schools/inquiry/${editContactData.school_id}`, {
          contact_name: editContactData.name,
          phone: editContactData.phone,
          email: editContactData.email,
          contact_birthday: editContactData.birthday,
          contact_anniversary: editContactData.anniversary,
          contact_notes: editContactData.notes
        }, { headers: getAuthHeaders() });
      } else {
        // Update additional contact in onboarding_data
        const contacts = school.onboarding_data?.school_contacts || [];
        const contactIdx = parseInt(showEditContactModal.id.split('-contact-')[1]);
        if (contacts[contactIdx]) {
          contacts[contactIdx] = {
            ...contacts[contactIdx],
            name: editContactData.name,
            phone: editContactData.phone,
            email: editContactData.email,
            role: editContactData.role,
            birthday: editContactData.birthday,
            anniversary: editContactData.anniversary,
            notes: editContactData.notes
          };
          await axios.patch(`${API}/schools/inquiry/${editContactData.school_id}`, {
            onboarding_data: { ...school.onboarding_data, school_contacts: contacts }
          }, { headers: getAuthHeaders() });
        }
      }
      
      toast.success('Contact updated');
      setShowEditContactModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update contact');
    }
  };

  // Initialize onboarding workflow for a converted school
  const handleInitOnboarding = async (school) => {
    try {
      const response = await axios.post(`${API}/schools/${school.id}/init-onboarding`, {}, {
        headers: getAuthHeaders()
      });
      toast.success('Onboarding workflow started!');
      // Copy tracking link
      const trackingUrl = `${window.location.origin}/track/${response.data.tracking_token}`;
      navigator.clipboard.writeText(trackingUrl);
      toast.success('Tracking link copied to clipboard!');
      fetchInquiries();
      // Open the workflow modal
      const updatedSchool = { ...school, onboarding_workflow: response.data.school.onboarding_workflow };
      setShowOnboardingWorkflowModal(updatedSchool);
    } catch (error) {
      toast.error('Failed to initialize onboarding');
    }
  };

  // Update an onboarding step
  const handleUpdateOnboardingStep = async (schoolId, stepKey, data) => {
    try {
      await axios.patch(`${API}/schools/${schoolId}/onboarding-step/${stepKey}`, data, {
        headers: getAuthHeaders()
      });
      toast.success('Step updated');
      fetchInquiries();
      // Refresh modal data
      const response = await axios.get(`${API}/schools/${schoolId}/onboarding`, {
        headers: getAuthHeaders()
      });
      if (showOnboardingWorkflowModal) {
        setShowOnboardingWorkflowModal({
          ...showOnboardingWorkflowModal,
          onboarding_workflow: response.data.workflow
        });
      }
    } catch (error) {
      toast.error('Failed to update step');
    }
  };

  // Add a query during onboarding
  const handleAddOnboardingQuery = async (schoolId, queryData) => {
    try {
      await axios.post(`${API}/schools/${schoolId}/onboarding-query`, queryData, {
        headers: getAuthHeaders()
      });
      toast.success('Query added');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add query');
    }
  };

  const handleAddFollowup = async () => {
    if (!followupData.date) {
      toast.error('Please select a followup date');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showFollowupModal.id}`, {
        followup_date: format(followupData.date, 'yyyy-MM-dd'),
        followup_comment: followupData.comment,
        followup_auto_email: followupData.auto_email
      }, {
        headers: getAuthHeaders()
      });
      
      // If auto_email is enabled, schedule the email
      if (followupData.auto_email && showFollowupModal.email) {
        try {
          await axios.post(`${API}/schools/schedule-followup-email`, {
            school_id: showFollowupModal.id,
            school_name: showFollowupModal.school_name,
            contact_name: showFollowupModal.contact_name,
            email: showFollowupModal.email,
            followup_date: format(followupData.date, 'yyyy-MM-dd'),
            followup_comment: followupData.comment,
            programs_interested: showFollowupModal.programs_interested || []
          }, { headers: getAuthHeaders() });
          toast.success('Followup scheduled with auto-email!');
        } catch (emailError) {
          console.error('Failed to schedule email:', emailError);
          toast.success('Followup scheduled (email scheduling failed)');
        }
      } else {
        toast.success('Followup scheduled');
      }
      
      setShowFollowupModal(null);
      setFollowupData({ date: null, comment: '', auto_email: false });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add followup');
    }
  };

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/schools/inquiry/${showAssignModal.id}`, {
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

  // Download CSV template for bulk import
  const handleDownloadTemplate = async () => {
    try {
      const response = await axios.get(`${API}/schools/bulk-import/template`, {
        headers: getAuthHeaders()
      });
      const { columns, sample, instructions } = response.data;
      
      // Create CSV content
      let csv = columns.join(',') + '\n';
      csv += columns.map(col => sample[col] || '').join(',') + '\n';
      csv += '\n# Instructions:\n';
      Object.entries(instructions).forEach(([key, value]) => {
        csv += `# ${key}: ${value}\n`;
      });
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'school_import_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch (error) {
      toast.error('Failed to download template');
    }
  };

  // Parse CSV/Excel file
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBulkImportFile(file);
    setBulkImportErrors([]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim() && !line.startsWith('#'));
      
      if (lines.length < 2) {
        toast.error('File must have header row and at least one data row');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
      const data = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
          const row = {};
          headers.forEach((header, idx) => {
            row[header] = values[idx];
          });
          data.push(row);
        }
      }
      
      setBulkImportData(data);
      toast.success(`Parsed ${data.length} schools from file`);
    };
    
    reader.readAsText(file);
  };

  // Submit bulk import
  const handleBulkImport = async () => {
    if (bulkImportData.length === 0) {
      toast.error('No data to import');
      return;
    }
    
    setBulkImporting(true);
    try {
      const response = await axios.post(`${API}/schools/bulk-import`, {
        schools: bulkImportData
      }, {
        headers: getAuthHeaders()
      });
      
      const { imported, skipped, errors } = response.data;
      setBulkImportErrors(errors || []);
      
      if (imported > 0) {
        toast.success(`Successfully imported ${imported} schools`);
        fetchInquiries();
      }
      if (skipped > 0) {
        toast.warning(`${skipped} schools skipped (duplicates or errors)`);
      }
      
      if (errors.length === 0) {
        setShowBulkImportModal(false);
        setBulkImportData([]);
        setBulkImportFile(null);
      }
    } catch (error) {
      toast.error('Failed to import schools');
    } finally {
      setBulkImporting(false);
    }
  };

  // Fetch onboarding data for editing
  const handleEditOnboarding = async (school) => {
    try {
      const response = await axios.get(`${API}/schools/onboarding/${school.id}`, {
        headers: getAuthHeaders()
      });
      setEditOnboardData({
        ...response.data,
        school_id: school.id,
        school_name: school.school_name,
        contact_name: school.contact_name,
        phone: school.phone,
        email: school.email,
        location: school.location,
        board: school.board,
      });
      setShowEditOnboardingModal(school);
    } catch (error) {
      // If no onboarding record, create one from school data
      setEditOnboardData({
        school_id: school.id,
        school_name: school.school_name,
        contact_name: school.contact_name,
        phone: school.phone,
        email: school.email,
        location: school.location,
        board: school.board,
        offering: '',
        model: school.model || '',
        book_type: '',
        kit_type: '',
        training_type: '',
        grade_pricing: [],
        total_students: school.total_students || 0,
        total_amount: 0,
        school_contacts: [{ name: school.contact_name || '', phone: school.phone || '', email: school.email || '', role: 'Primary Contact' }],
        payment_mode: 'from_school',
        payment_method: '',
        payment_tranches: [],
        contract_start: '',
        contract_end: '',
      });
      setShowEditOnboardingModal(school);
    }
  };

  // Save edited onboarding data
  const handleSaveEditOnboarding = async () => {
    if (!editOnboardData) return;
    
    try {
      // Update school inquiry basic info
      await axios.patch(`${API}/schools/inquiry/${editOnboardData.school_id}`, {
        school_name: editOnboardData.school_name,
        contact_name: editOnboardData.contact_name,
        phone: editOnboardData.phone,
        email: editOnboardData.email,
        location: editOnboardData.location,
        board: editOnboardData.board,
        model: editOnboardData.model,
        total_students: editOnboardData.total_students,
      }, {
        headers: getAuthHeaders()
      });
      
      // Update onboarding record if exists
      if (editOnboardData.id) {
        await axios.put(`${API}/schools/onboarding/${editOnboardData.id}`, {
          offering: editOnboardData.offering,
          model: editOnboardData.model,
          book_type: editOnboardData.book_type,
          kit_type: editOnboardData.kit_type,
          training_type: editOnboardData.training_type,
          grade_pricing: editOnboardData.grade_pricing,
          total_students: editOnboardData.total_students,
          total_amount: editOnboardData.total_amount,
          school_contacts: editOnboardData.school_contacts,
          payment_mode: editOnboardData.payment_mode,
          payment_method: editOnboardData.payment_method,
          payment_tranches: editOnboardData.payment_tranches,
          contract_start: editOnboardData.contract_start,
          contract_end: editOnboardData.contract_end,
        }, {
          headers: getAuthHeaders()
        });
      }
      
      toast.success('School details updated successfully');
      setShowEditOnboardingModal(null);
      setEditOnboardData(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update school details');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inq.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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
          className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
      </>
    );

    // Followup button - shown in all sections except converted
    const followupButton = inquiry.status !== 'converted' && (
      <button
        onClick={() => {
          setShowFollowupModal(inquiry);
          setFollowupData({ 
            date: inquiry.followup_date ? new Date(inquiry.followup_date) : null, 
            comment: inquiry.followup_comment || '' 
          });
        }}
        className="text-xs px-3 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 flex items-center gap-1 font-medium"
        data-testid={`followup-${inquiry.id}`}
      >
        <Clock className="w-3 h-3" />
        Followup
      </button>
    );

    switch (inquiry.status) {
      case 'new':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleMeetingDone(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`meeting-done-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Meeting Done
            </button>
            <button
              onClick={() => {
                setShowRescheduleModal(inquiry);
                setRescheduleData({ date: null, time: '', meeting_type: inquiry.meeting_type || 'offline', reason: '' });
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${inquiry.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule
            </button>
            {followupButton}
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
      
      case 'meeting_done':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setShowOnboardModal(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Mark Converted
            </button>
            {followupButton}
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
          </div>
        );
      
      case 'active':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleEditOnboarding(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => handleStatusChange(inquiry, 'renewed')}
              className="text-xs px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 flex items-center gap-1 font-medium"
              data-testid={`renew-${inquiry.id}`}
            >
              <RefreshCw className="w-3 h-3" />
              Renewed
            </button>
            <button
              onClick={() => handleStatusChange(inquiry, 'lost')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`lost-${inquiry.id}`}
            >
              <X className="w-3 h-3" />
              Lost
            </button>
            {baseButtons}
          </div>
        );
      
      case 'renewed':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleEditOnboarding(inquiry)}
              className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => handleStatusChange(inquiry, 'lost')}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`lost-${inquiry.id}`}
            >
              <X className="w-3 h-3" />
              Lost
            </button>
            {baseButtons}
          </div>
        );
      
      case 'lost':
        return (
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => handleStatusChange(inquiry, 'active')}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`reactivate-${inquiry.id}`}
            >
              <RefreshCw className="w-3 h-3" />
              Reactivate
            </button>
            {baseButtons}
          </div>
        );
      
      case 'archived':
        return <div className="flex gap-1 flex-wrap">{followupButton}{baseButtons}</div>;
      
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="School CRM">
      {/* Main Tab Navigation */}
      <div className="flex gap-4 mb-6 border-b border-slate-200">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: CalendarClock },
          { id: 'leads', label: 'Leads & Schools', icon: Building2 },
          { id: 'contacts', label: 'Contact Management', icon: Users },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? 'border-[#1E3A5F] text-[#1E3A5F]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid={`tab-${tab.id}`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-blue-700">{getThisWeekData().meetings.length}</div>
              <div className="text-sm text-blue-600">Meetings This Week</div>
            </div>
            <div className="bg-cyan-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-cyan-700">{getThisWeekData().followups.length}</div>
              <div className="text-sm text-cyan-600">Followups Due</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-green-700">{inquiries.filter(i => i.status === 'active').length}</div>
              <div className="text-sm text-green-600">Active Schools</div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="text-2xl font-bold text-purple-700">{inquiries.filter(i => i.status === 'new').length}</div>
              <div className="text-sm text-purple-600">New Leads</div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* This Week's Meetings */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                This Week&apos;s Meetings
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getThisWeekData().meetings.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No meetings scheduled this week</p>
                ) : (
                  getThisWeekData().meetings.map((meeting, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-[#1E3A5F]">{meeting.school_name}</p>
                        <p className="text-xs text-slate-500">{meeting.contact_name} • {meeting.phone}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded ${meeting.meeting_type === 'online' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {meeting.meeting_type === 'online' ? 'Online' : 'Offline'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[#D63031]">{format(new Date(meeting.meeting_date), 'EEE, MMM d')}</p>
                        <p className="text-xs text-slate-500">{meeting.meeting_time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Followup Schedule */}
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="font-semibold text-[#1E3A5F] mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Followup Schedule
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getThisWeekData().followups.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No followups scheduled this week</p>
                ) : (
                  getThisWeekData().followups.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div>
                        <p className="font-medium text-sm text-[#1E3A5F]">{item.school_name}</p>
                        <p className="text-xs text-slate-500">{item.contact_name}</p>
                        {item.followup_comment && (
                          <p className="text-xs text-slate-400 mt-1 truncate max-w-xs">{item.followup_comment}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-cyan-600">{format(new Date(item.followup_date), 'EEE, MMM d')}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_SECTIONS.find(s => s.value === item.status)?.color || 'bg-slate-100'} text-white`}>
                          {STATUS_SECTIONS.find(s => s.value === item.status)?.label || item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leads Tab */}
      {activeTab === 'leads' && (
        <>
          {/* Header Actions */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search by school name, contact or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="school-search"
              />
            </div>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm"
              data-testid="school-assignee-filter"
            >
              <option value="all">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {teamUsers.filter(u => u.is_active).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {activeSection === 'active' && (
              <Button
                onClick={() => setShowBulkImportModal(true)}
                variant="outline"
                className="flex items-center gap-2"
                data-testid="bulk-import-btn"
              >
                <FileSpreadsheet className="w-4 h-4" /> Bulk Import
              </Button>
            )}
            <Button
              onClick={() => setShowAddForm(true)}
              className="btn-primary flex items-center gap-2"
              data-testid="add-school-lead-btn"
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
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">No leads in this section</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`school-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{inquiry.school_name}</h3>
                  <p className="text-sm text-slate-500">{inquiry.contact_name}</p>
                  {inquiry.assigned_to && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Assigned: {getAssignedUserName(inquiry.assigned_to) || 'Team Member'}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    inquiry.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {inquiry.source || 'website'}
                  </span>
                  {inquiry.meeting_type && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 ${
                      inquiry.meeting_type === 'online' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {inquiry.meeting_type === 'online' ? <Video className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      {inquiry.meeting_type === 'online' ? 'Online' : 'Offline'}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1 text-sm text-slate-600 mb-3">
                <p className="flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {inquiry.phone}
                </p>
                {inquiry.location && (
                  <p className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-400" /> {inquiry.location}
                  </p>
                )}
                {inquiry.board && (
                  <p><span className="text-slate-400">Board:</span> {inquiry.board}</p>
                )}
                {inquiry.meeting_date && (
                  <p className="flex items-center gap-1 text-[#D63031] font-medium">
                    <Calendar className="w-3 h-3" />
                    Meeting: {inquiry.meeting_date} {inquiry.meeting_time && `at ${inquiry.meeting_time}`}
                  </p>
                )}
                {inquiry.conversion_amount && (
                  <p className="text-green-600 font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ₹{inquiry.conversion_amount}
                  </p>
                )}
                {inquiry.quoted_price && !inquiry.conversion_amount && (
                  <p className="text-blue-600 font-medium flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    Quoted: ₹{Number(inquiry.quoted_price).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Selected Offerings */}
              {inquiry.selected_offerings?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  <span className="text-xs text-slate-500 mr-1">Offerings:</span>
                  {inquiry.selected_offerings.map((offeringId, idx) => {
                    const offering = offerings.find(o => o.id === offeringId);
                    return offering ? (
                      <span key={idx} className="px-2 py-0.5 bg-purple-100 rounded text-xs text-purple-700">
                        {offering.title}
                      </span>
                    ) : null;
                  })}
                </div>
              )}

              {inquiry.programs_interested?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {inquiry.programs_interested.map((p, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Comments shown outside */}
              {inquiry.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Comments
                  </p>
                  <p className="text-sm text-amber-900 whitespace-pre-line">{inquiry.notes}</p>
                </div>
              )}

              {/* Followup shown outside - only for non-converted */}
              {inquiry.status !== 'converted' && inquiry.followup_date && (
                <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-cyan-700 font-medium mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Followup: {inquiry.followup_date}
                  </p>
                  {inquiry.followup_comment && (
                    <p className="text-sm text-cyan-900">{inquiry.followup_comment}</p>
                  )}
                </div>
              )}

              {/* Draft Progress Bar - Show if onboarding is in draft state */}
              {inquiry.onboarding_status === 'draft' && inquiry.onboarding_id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-yellow-700 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Onboarding Draft
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs text-yellow-700 hover:bg-yellow-100"
                      onClick={() => setShowOnboardModal(inquiry)}
                    >
                      Continue →
                    </Button>
                  </div>
                  <div className="w-full bg-yellow-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-500 h-2 rounded-full transition-all" 
                      style={{ width: `${inquiry.total_students ? 60 : 25}%` }}
                    />
                  </div>
                  <p className="text-xs text-yellow-600 mt-1">
                    {inquiry.total_students ? `${inquiry.total_students} students added` : 'Click Continue to complete'}
                  </p>
                </div>
              )}

              {/* Onboarding Progress - Show for converted schools with onboarding_workflow */}
              {inquiry.onboarding_workflow && inquiry.status === 'converted' && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-purple-700 font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Onboarding Progress
                    </p>
                    <button
                      onClick={() => setShowOnboardingWorkflowModal(inquiry)}
                      className="text-xs text-purple-600 hover:text-purple-800 font-medium"
                    >
                      View Details →
                    </button>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-purple-200 rounded-full h-2 mb-2">
                    <div 
                      className="bg-purple-500 h-2 rounded-full transition-all" 
                      style={{ 
                        width: `${(Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length / 9 * 100).toFixed(0)}%` 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-purple-600">
                      {Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length}/9 steps
                    </span>
                    <span className="text-purple-700 font-medium capitalize">
                      {typeof (inquiry.onboarding_workflow.current_step || 'payment_collection') === 'string' 
                        ? (inquiry.onboarding_workflow.current_step || 'payment_collection').replace(/_/g, ' ')
                        : 'In Progress'}
                    </span>
                  </div>
                  {/* Tracking Link */}
                  {inquiry.onboarding_workflow.tracking_token && (
                    <button
                      onClick={() => {
                        const url = `${window.location.origin}/track/${inquiry.onboarding_workflow.tracking_token}`;
                        navigator.clipboard.writeText(url);
                        toast.success('Tracking link copied!');
                      }}
                      className="mt-2 text-xs text-purple-500 hover:text-purple-700 flex items-center gap-1"
                    >
                      <Gift className="w-3 h-3" /> Copy tracking link
                    </button>
                  )}
                </div>
              )}

              {/* View Button */}
              <div className="flex gap-2 mb-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewInquiry(inquiry)}
                  data-testid={`view-school-${inquiry.id}`}
                >
                  <Eye className="w-4 h-4 mr-1" /> View
                </Button>
                {/* Add Meeting button for relevant statuses */}
                {['meeting_done', 'converted', 'active', 'renewed'].includes(inquiry.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddMeetingModal(inquiry)}
                    data-testid={`add-meeting-${inquiry.id}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Action Buttons based on status */}
              {renderActionButtons(inquiry)}
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* Contacts Tab */}
      {activeTab === 'contacts' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search contacts by name, phone, school..."
                value={contactSearchQuery}
                onChange={(e) => setContactSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="contact-search"
              />
            </div>
          </div>

          {/* Contacts Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Contact</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">School</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Role</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Birthday</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allContacts
                  .filter(c => 
                    c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                    c.phone.includes(contactSearchQuery) ||
                    c.school_name?.toLowerCase().includes(contactSearchQuery.toLowerCase())
                  )
                  .map((contact) => (
                    <tr key={contact.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-[#1E3A5F]">{contact.name}</p>
                          <p className="text-xs text-slate-500">{contact.phone}</p>
                          {contact.email && <p className="text-xs text-slate-400">{contact.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm">{contact.school_name}</p>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_SECTIONS.find(s => s.value === contact.school_status)?.color || 'bg-slate-100'} text-white`}>
                          {STATUS_SECTIONS.find(s => s.value === contact.school_status)?.label || contact.school_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{contact.role}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {contact.birthday || '-'}
                        {contact.anniversary && <p className="text-xs text-slate-400">Anniversary: {contact.anniversary}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setShowEditContactModal(contact);
                            setEditContactData({
                              name: contact.name,
                              phone: contact.phone,
                              email: contact.email || '',
                              role: contact.role,
                              school_id: contact.school_id,
                              school_name: contact.school_name,
                              birthday: contact.birthday || '',
                              anniversary: contact.anniversary || '',
                              notes: contact.notes || ''
                            });
                          }}
                          data-testid={`edit-contact-${contact.id}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {allContacts.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No contacts found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View/Edit Details Dialog */}
      <Dialog open={!!viewInquiry} onOpenChange={() => { setViewInquiry(null); setEditMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#1E3A5F]" />
                {editMode ? 'Edit Lead' : viewInquiry?.school_name}
              </div>
              {!editMode && (
                <Button variant="outline" size="sm" onClick={() => {
                  setEditMode(true);
                  setEditData({
                    school_name: viewInquiry?.school_name || '',
                    contact_name: viewInquiry?.contact_name || '',
                    phone: viewInquiry?.phone || '',
                    email: viewInquiry?.email || '',
                    meeting_date: viewInquiry?.meeting_date || '',
                    meeting_time: viewInquiry?.meeting_time || '',
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                      <Input
                        value={editData.school_name}
                        onChange={(e) => setEditData({...editData, school_name: e.target.value})}
                        placeholder="School name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                      <Input
                        value={editData.contact_name}
                        onChange={(e) => setEditData({...editData, contact_name: e.target.value})}
                        placeholder="Contact person"
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Date</label>
                      <Input
                        type="date"
                        value={editData.meeting_date}
                        onChange={(e) => setEditData({...editData, meeting_date: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Time</label>
                      <select
                        value={editData.meeting_time}
                        onChange={(e) => setEditData({...editData, meeting_time: e.target.value})}
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
                      <p className="text-xs text-slate-500 mb-1">Contact Person</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <User className="w-4 h-4" /> {viewInquiry.contact_name}
                      </p>
                    </div>
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
                      <p className="text-xs text-slate-500 mb-1">Location</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {viewInquiry.location || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Board</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.board || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">School Size</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.school_size || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Fee Range</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.fee_range || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Meeting Type</p>
                      <p className={`font-medium flex items-center gap-1 ${viewInquiry.meeting_type === 'online' ? 'text-green-600' : 'text-orange-600'}`}>
                        {viewInquiry.meeting_type === 'online' ? <Video className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                        {viewInquiry.meeting_type === 'online' ? 'Online Meeting' : 'Offline Meeting'}
                      </p>
                    </div>
                  </div>

                  {viewInquiry.programs_interested?.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-2">Programs Interested</p>
                      <div className="flex flex-wrap gap-1">
                        {viewInquiry.programs_interested.map((p, idx) => (
                          <span key={idx} className="px-2 py-1 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize font-medium">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {viewInquiry.meeting_date && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-500 mb-1">Meeting Scheduled</p>
                      <p className="font-medium text-blue-700 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> 
                        {viewInquiry.meeting_date} {viewInquiry.meeting_time && `at ${viewInquiry.meeting_time}`}
                      </p>
                    </div>
                  )}

                  {viewInquiry.conversion_amount && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-500 mb-1">Conversion Details</p>
                      <p className="font-medium text-green-700">
                        Deal Amount: ₹{viewInquiry.conversion_amount}
                      </p>
                    </div>
                  )}

                  {/* Onboarding Details - Show for converted/active/renewed */}
                  {viewInquiry.onboarding_data && ['converted', 'active', 'renewed'].includes(viewInquiry.status) && (
                    <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                      <p className="text-sm font-semibold text-purple-800 border-b border-purple-200 pb-2">Onboarding Details</p>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {viewInquiry.onboarding_data.model && (
                          <div>
                            <p className="text-xs text-purple-600">Partnership Model</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.model.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.kit_type && (
                          <div>
                            <p className="text-xs text-purple-600">Kit Type</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.kit_type.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.book_type && (
                          <div>
                            <p className="text-xs text-purple-600">Book Type</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.book_type.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.training_type && (
                          <div>
                            <p className="text-xs text-purple-600">Training Type</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.training_type.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.total_students > 0 && (
                          <div>
                            <p className="text-xs text-purple-600">Total Students</p>
                            <p className="font-medium text-purple-800">{viewInquiry.onboarding_data.total_students}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.total_amount > 0 && (
                          <div>
                            <p className="text-xs text-purple-600">Total Amount</p>
                            <p className="font-medium text-purple-800">₹{viewInquiry.onboarding_data.total_amount?.toLocaleString()}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.payment_mode && (
                          <div>
                            <p className="text-xs text-purple-600">Payment Mode</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.payment_mode.replace(/_/g, ' ')}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.payment_method && (
                          <div>
                            <p className="text-xs text-purple-600">Payment Method</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.payment_method}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.contract_start && (
                          <div>
                            <p className="text-xs text-purple-600">Contract Start</p>
                            <p className="font-medium text-purple-800">{viewInquiry.onboarding_data.contract_start}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.contract_end && (
                          <div>
                            <p className="text-xs text-purple-600">Contract End</p>
                            <p className="font-medium text-purple-800">{viewInquiry.onboarding_data.contract_end}</p>
                          </div>
                        )}
                      </div>

                      {/* Grade-wise Pricing */}
                      {viewInquiry.onboarding_data.grade_pricing?.length > 0 && (
                        <div className="border-t border-purple-200 pt-3">
                          <p className="text-xs text-purple-600 mb-2">Grade-wise Pricing</p>
                          <div className="space-y-1">
                            {viewInquiry.onboarding_data.grade_pricing.map((gp, idx) => (
                              <div key={idx} className="flex justify-between text-sm text-purple-800 bg-white/50 px-2 py-1 rounded">
                                <span>Grade {gp.grade}: {gp.students} students</span>
                                <span className="font-medium">₹{gp.price_per_student}/student</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* School Contacts */}
                      {viewInquiry.onboarding_data.school_contacts?.length > 0 && (
                        <div className="border-t border-purple-200 pt-3">
                          <p className="text-xs text-purple-600 mb-2">School Team Contacts</p>
                          <div className="space-y-1">
                            {viewInquiry.onboarding_data.school_contacts.map((c, idx) => (
                              <div key={idx} className="text-sm text-purple-800 bg-white/50 px-2 py-1 rounded flex items-center gap-2">
                                <span className="font-medium">{c.name}</span>
                                <span className="text-purple-600">({c.role})</span>
                                <span>{c.phone}</span>
                                {c.email && <span className="text-purple-500">{c.email}</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* MOU Document */}
                      {viewInquiry.onboarding_data.mou_url && (
                        <div className="border-t border-purple-200 pt-3">
                          <p className="text-xs text-purple-600 mb-2">MOU Document</p>
                          <div className="flex items-center gap-2">
                            <a 
                              href={viewInquiry.onboarding_data.mou_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-white/50 px-3 py-2 rounded border border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                              View MOU
                            </a>
                            <a 
                              href={viewInquiry.onboarding_data.mou_url} 
                              download
                              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 bg-white/50 px-3 py-2 rounded border border-green-200"
                            >
                              <Download className="w-4 h-4" />
                              Download MOU
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Tracking Link */}
                      {viewInquiry.onboarding_workflow?.tracking_token && (
                        <div className="border-t border-purple-200 pt-3">
                          <p className="text-xs text-purple-600 mb-2">Public Tracking Link</p>
                          <button
                            onClick={() => {
                              const url = `${window.location.origin}/track/${viewInquiry.onboarding_workflow.tracking_token}`;
                              navigator.clipboard.writeText(url);
                              toast.success('Tracking link copied!');
                            }}
                            className="text-sm text-purple-600 hover:text-purple-800 flex items-center gap-2 bg-white/50 px-3 py-2 rounded"
                          >
                            <Gift className="w-4 h-4" />
                            Copy Tracking Link
                          </button>
                        </div>
                      )}
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

      {/* Reschedule Meeting Modal */}
      <Dialog open={!!showRescheduleModal} onOpenChange={() => setShowRescheduleModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Meeting - {showRescheduleModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Meeting Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    rescheduleData.meeting_type === 'offline' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setRescheduleData({...rescheduleData, meeting_type: 'offline'})}
                >
                  <Users className="w-4 h-4" />
                  Offline
                </button>
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    rescheduleData.meeting_type === 'online' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setRescheduleData({...rescheduleData, meeting_type: 'online'})}
                >
                  <Video className="w-4 h-4" />
                  Online
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select New Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={rescheduleData.date}
                  onSelect={(date) => setRescheduleData({...rescheduleData, date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 30) || date.getDay() === 0}
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Rescheduling</label>
              <Textarea
                placeholder="Enter reason..."
                value={rescheduleData.reason}
                onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                className="min-h-[80px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowRescheduleModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleReschedule} className="btn-primary flex-1">
                Reschedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Meeting Done Modal */}
      <Dialog open={!!showMeetingDoneModal} onOpenChange={() => setShowMeetingDoneModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Meeting Completed - {showMeetingDoneModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Meeting Notes/Minutes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Notes / Minutes *</label>
              <Textarea
                placeholder="Enter key discussion points, outcomes, and action items..."
                value={meetingDoneData.notes}
                onChange={(e) => setMeetingDoneData({...meetingDoneData, notes: e.target.value})}
                className="min-h-[120px]"
                data-testid="meeting-notes"
              />
            </div>

            {/* Quoted Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quoted Price (₹)</label>
              <Input
                type="number"
                placeholder="Enter quoted price discussed in meeting"
                value={meetingDoneData.quoted_price}
                onChange={(e) => setMeetingDoneData({...meetingDoneData, quoted_price: e.target.value})}
                data-testid="meeting-quoted-price"
              />
              {showMeetingDoneModal?.quoted_price && (
                <p className="text-xs text-slate-500 mt-1">Previous: ₹{Number(showMeetingDoneModal.quoted_price).toLocaleString()}</p>
              )}
            </div>

            {/* Follow-up Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Schedule Follow-up</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setMeetingDoneData({...meetingDoneData, followup_type: '', followup_date: null, followup_time: ''})}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    !meetingDoneData.followup_type 
                      ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-sm font-medium">No Follow-up</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingDoneData({...meetingDoneData, followup_type: 'message'})}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    meetingDoneData.followup_type === 'message' 
                      ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Message</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMeetingDoneData({...meetingDoneData, followup_type: 'meeting'})}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    meetingDoneData.followup_type === 'meeting' 
                      ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Meeting</span>
                </button>
              </div>
            </div>

            {/* Followup Date & Time (shown when followup type is selected) */}
            {meetingDoneData.followup_type && (
              <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-sm font-medium text-blue-800">
                  {meetingDoneData.followup_type === 'meeting' ? 'Follow-up Meeting Details' : 'Follow-up Message Schedule'}
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="single"
                      selected={meetingDoneData.followup_date}
                      onSelect={(date) => setMeetingDoneData({...meetingDoneData, followup_date: date})}
                      disabled={(date) => date < new Date() || date > addDays(new Date(), 60) || date.getDay() === 0}
                      className="rounded-xl border border-slate-200 bg-white"
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
                          meetingDoneData.followup_time === time 
                            ? 'border-blue-500 bg-blue-100 text-blue-700' 
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                        onClick={() => setMeetingDoneData({...meetingDoneData, followup_time: time})}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowMeetingDoneModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={submitMeetingDone} className="btn-primary flex-1" data-testid="submit-meeting-done">
                {meetingDoneData.followup_type === 'meeting' 
                  ? 'Complete & Schedule Meeting' 
                  : meetingDoneData.followup_type === 'message'
                    ? 'Complete & Schedule Message'
                    : 'Mark as Done'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Convert Modal */}
      <Dialog open={!!showConvertModal} onOpenChange={() => setShowConvertModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Convert School - {showConvertModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Deal Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Deal Amount (₹) *</label>
              <Input
                type="number"
                placeholder="Enter deal amount"
                value={convertData.amount}
                onChange={(e) => setConvertData({...convertData, amount: e.target.value})}
                data-testid="convert-amount"
              />
            </div>

            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Partnership Model *</label>
              <select
                value={convertData.model}
                onChange={(e) => setConvertData({...convertData, model: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                data-testid="convert-model"
              >
                <option value="">Select model</option>
                <option value="robotics_lab">Robotics Lab Setup</option>
                <option value="stem_curriculum">STEM Curriculum Integration</option>
                <option value="after_school">After School Program</option>
                <option value="teacher_training">Teacher Training Only</option>
                <option value="full_partnership">Full School Partnership</option>
              </select>
            </div>

            {/* Quick Setup Options */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Kit Type</label>
                <select
                  value={convertData.kit_type}
                  onChange={(e) => setConvertData({...convertData, kit_type: e.target.value})}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="lab_setup">Lab Setup</option>
                  <option value="individual">Individual Kit</option>
                  <option value="no_kit">No Kit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Book Type</label>
                <select
                  value={convertData.book_type}
                  onChange={(e) => setConvertData({...convertData, book_type: e.target.value})}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="individual_books">Individual Books</option>
                  <option value="no_books">No Books</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Training</label>
                <select
                  value={convertData.training_type}
                  onChange={(e) => setConvertData({...convertData, training_type: e.target.value})}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="student_training">Student</option>
                  <option value="teacher_training">Teacher</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>

            {/* Programs from Inquiry */}
            {convertData.programs?.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-500 mb-2">Programs Interested:</p>
                <div className="flex flex-wrap gap-1">
                  {convertData.programs.map((p, i) => (
                    <span key={i} className="px-2 py-0.5 bg-[#1E3A5F]/10 rounded text-xs text-[#1E3A5F] capitalize">{p}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
              <p className="font-medium mb-1">What happens next?</p>
              <ul className="text-xs space-y-1 text-green-600">
                <li>• School moves to Converted status</li>
                <li>• Onboarding workflow is auto-initialized</li>
                <li>• Public tracking link is created & copied</li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowConvertModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleConvert} className="btn-primary flex-1" data-testid="convert-submit">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Convert & Start Onboarding
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New School Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Auto-fill hint */}
            <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded-lg">
              💡 Type at least 3 characters in School Name, Phone, or Email to auto-fill from existing records
            </div>
            
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-2">School Name *</label>
              <Input
                placeholder="School name"
                value={newLead.school_name}
                onChange={(e) => {
                  setNewLead({...newLead, school_name: e.target.value});
                  searchAutocomplete(e.target.value, 'school_name');
                }}
                onFocus={() => newLead.school_name.length >= 3 && searchAutocomplete(newLead.school_name, 'school_name')}
                data-testid="new-school-name"
              />
              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteField === 'school_name' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleAutocompleteFill(s)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                    >
                      <p className="font-medium text-sm">{s.school_name || s.name}</p>
                      <p className="text-xs text-slate-500">{s.phone} • {s.location || 'No location'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Contact Name *</label>
                <Input
                  placeholder="Contact person"
                  value={newLead.contact_name}
                  onChange={(e) => setNewLead({...newLead, contact_name: e.target.value})}
                  data-testid="new-school-contact"
                />
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
                  data-testid="new-school-phone"
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
                        <p className="font-medium text-sm">{s.school_name || s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.location || 'No location'}</p>
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
                data-testid="new-school-email"
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
                      <p className="font-medium text-sm">{s.school_name || s.name}</p>
                      <p className="text-xs text-slate-500">{s.phone} • {s.location || 'No location'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <select
                  value={newLead.location}
                  onChange={(e) => setNewLead({...newLead, location: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-school-city"
                >
                  <option value="">Select city</option>
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Board</label>
                <select
                  value={newLead.board}
                  onChange={(e) => setNewLead({...newLead, board: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-school-board"
                >
                  <option value="">Select board</option>
                  {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Est. Students</label>
                <Input
                  type="number"
                  placeholder="Student count"
                  value={newLead.student_count}
                  onChange={(e) => setNewLead({...newLead, student_count: e.target.value})}
                  data-testid="new-school-students"
                />
              </div>
            </div>
            
            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Preferred Meeting Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    newLead.meeting_type === 'offline' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setNewLead({...newLead, meeting_type: 'offline'})}
                >
                  <Users className="w-4 h-4" />
                  Offline Meeting
                </button>
                <button
                  type="button"
                  className={`flex-1 p-3 rounded-lg border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                    newLead.meeting_type === 'online' 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => setNewLead({...newLead, meeting_type: 'online'})}
                >
                  <Video className="w-4 h-4" />
                  Online Meeting
                </button>
              </div>
            </div>

            {/* Meeting Date & Time */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-slate-900 mb-3">Meeting Scheduling</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Date</label>
                  <div className="border rounded-lg p-2">
                    <CalendarComponent
                      mode="single"
                      selected={newLead.meeting_date}
                      onSelect={(date) => setNewLead({...newLead, meeting_date: date})}
                      disabled={(date) => date < new Date()}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={`p-2 rounded-lg border text-sm ${
                          newLead.meeting_time === time 
                            ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setNewLead({...newLead, meeting_time: time})}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Offerings Selection */}
            {offerings.length > 0 && (
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-slate-900 mb-3">Offerings Interested In</h4>
                <div className="space-y-3 max-h-[200px] overflow-y-auto">
                  {offerings.map(offering => (
                    <label
                      key={offering.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        newLead.selected_offerings.includes(offering.id)
                          ? 'border-[#1E3A5F] bg-blue-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={newLead.selected_offerings.includes(offering.id)}
                        onChange={() => {
                          const current = newLead.selected_offerings;
                          if (current.includes(offering.id)) {
                            setNewLead({...newLead, selected_offerings: current.filter(id => id !== offering.id)});
                          } else {
                            setNewLead({...newLead, selected_offerings: [...current, offering.id]});
                          }
                        }}
                        className="mt-1 w-4 h-4 rounded border-slate-300"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{offering.title}</p>
                        {offering.category && (
                          <span className="text-xs text-slate-500 capitalize">{offering.category}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Quoted Price */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Quoted Price (₹)</label>
              <Input
                type="number"
                placeholder="Enter quoted price"
                value={newLead.quoted_price}
                onChange={(e) => setNewLead({...newLead, quoted_price: e.target.value})}
                data-testid="new-school-quoted-price"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
              <select
                value={newLead.source}
                onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                data-testid="new-school-source"
              >
                <option value="manual">Manual Entry</option>
                <option value="referral">Referral</option>
                <option value="event">Event / Conference</option>
                <option value="cold_call">Cold Call</option>
                <option value="website">Website</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <Textarea
                placeholder="Additional notes..."
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                className="min-h-[80px]"
                data-testid="new-school-notes"
              />
            </div>
            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLead} className="btn-primary flex-1" data-testid="save-new-school">
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
            <DialogTitle>Add Comment - {showCommentModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              data-testid="school-comment-input"
            />
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCommentModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddComment} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-school-comment">
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
              Assign Lead - {showAssignModal?.school_name}
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
                    data-testid={`school-assign-to-${teamUser.id}`}
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

      {/* Followup Modal */}
      <Dialog open={!!showFollowupModal} onOpenChange={() => setShowFollowupModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-600" />
              Schedule Followup - {showFollowupModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showFollowupModal?.followup_date && (
              <div className="bg-cyan-50 rounded-lg p-3">
                <p className="text-sm text-cyan-700">
                  Current followup: <strong>{showFollowupModal.followup_date}</strong>
                </p>
                {showFollowupModal.followup_comment && (
                  <p className="text-xs text-cyan-600 mt-1">{showFollowupModal.followup_comment}</p>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Followup Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={followupData.date}
                  onSelect={(date) => setFollowupData(prev => ({...prev, date}))}
                  disabled={(date) => date < new Date()}
                  className="rounded-xl border border-slate-200"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Followup Note</label>
              <Textarea
                value={followupData.comment}
                onChange={(e) => setFollowupData(prev => ({...prev, comment: e.target.value}))}
                placeholder="Add a note for this followup..."
                className="min-h-[80px]"
                data-testid="followup-comment"
              />
            </div>
            
            {/* Auto Email Checkbox */}
            <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="auto_email_followup"
                checked={followupData.auto_email}
                onChange={(e) => setFollowupData(prev => ({...prev, auto_email: e.target.checked}))}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                data-testid="auto-email-checkbox"
              />
              <label htmlFor="auto_email_followup" className="cursor-pointer">
                <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Send AI-generated followup email
                </span>
                <span className="text-xs text-slate-500 block mt-0.5">
                  Personalized email will be sent at 9 AM on {followupData.date ? format(followupData.date, 'MMM d, yyyy') : 'the followup date'}
                </span>
                {!showFollowupModal?.email && (
                  <span className="text-xs text-orange-600 block mt-1">
                    ⚠️ No email address on file for this school
                  </span>
                )}
              </label>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowFollowupModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddFollowup} className="flex-1 bg-cyan-600 hover:bg-cyan-700" data-testid="submit-followup">
                <Clock className="w-4 h-4 mr-2" />
                Set Followup
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* School Onboarding Modal */}
      <Dialog open={!!showOnboardModal} onOpenChange={() => setShowOnboardModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-600" />
              Conversion Details: {showOnboardModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Offering Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Select Offering *</label>
                <select
                  value={onboardData.offering}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, offering: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select from offerings</option>
                  {offerings.map(o => (
                    <option key={o.id} value={o.id}>{o.title || o.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Model/Type *</label>
                <select
                  value={onboardData.model}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select model</option>
                  <option value="robotics_lab">Robotics Lab Setup</option>
                  <option value="stem_curriculum">STEM Curriculum Integration</option>
                  <option value="after_school">After School Program</option>
                  <option value="teacher_training">Teacher Training</option>
                  <option value="full_partnership">Full School Partnership</option>
                </select>
              </div>
            </div>
            
            {/* New Fields: Book Type, Kit Type, Training Type */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Book Type</label>
                <select
                  value={onboardData.book_type}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, book_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select book type</option>
                  <option value="individual_books">Individual Books</option>
                  <option value="no_books">No Books</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Kit Type *</label>
                <select
                  value={onboardData.kit_type}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, kit_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select kit type</option>
                  <option value="lab_setup">Lab Setup</option>
                  <option value="individual">Individual Kit</option>
                  <option value="no_kit">No Kit</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Training Type *</label>
                <select
                  value={onboardData.training_type}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, training_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select training type</option>
                  <option value="student_training">Student Training</option>
                  <option value="teacher_training">Teacher Training</option>
                  <option value="both">Both (Student & Teacher)</option>
                </select>
              </div>
            </div>

            {/* MOU Upload */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                MOU Document (Optional)
              </label>
              <div className="mt-2">
                {onboardData.mou_url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      MOU uploaded
                    </span>
                    <a 
                      href={onboardData.mou_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View
                    </a>
                    <button 
                      onClick={() => setOnboardData(prev => ({ ...prev, mou_url: '' }))}
                      className="text-xs text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={(e) => handleMOUUpload(e.target.files[0])}
                      className="text-sm"
                      disabled={uploadingMOU}
                    />
                    {uploadingMOU && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Grade-wise Pricing */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Grade-wise Student Count & Pricing</label>
                <Button variant="ghost" size="sm" onClick={addGradePricing} className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" /> Add Grade
                </Button>
              </div>
              <div className="space-y-2">
                {onboardData.grade_pricing.map((gp, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2">
                    <Input
                      placeholder="Grade (e.g., 1-5)"
                      value={gp.grade}
                      onChange={(e) => updateGradePricing(idx, 'grade', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="No. of students"
                      value={gp.students}
                      onChange={(e) => updateGradePricing(idx, 'students', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Price/student"
                      value={gp.price_per_student}
                      onChange={(e) => updateGradePricing(idx, 'price_per_student', e.target.value)}
                    />
                    <div className="flex items-center justify-center text-sm text-slate-600">
                      ₹{((parseInt(gp.students) || 0) * (parseFloat(gp.price_per_student) || 0)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm">
                <span className="font-medium">Total: </span>
                {onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0)} students • 
                ₹{onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0).toLocaleString()}
              </div>
            </div>

            {/* School Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">School Team Contacts</label>
                <Button variant="ghost" size="sm" onClick={addSchoolContact} className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {onboardData.school_contacts.map((contact, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name *"
                        value={contact.name}
                        onChange={(e) => updateSchoolContact(idx, 'name', e.target.value)}
                      />
                      <select
                        value={contact.role}
                        onChange={(e) => updateSchoolContact(idx, 'role', e.target.value)}
                        className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="">Select Role *</option>
                        <option value="principal">Principal</option>
                        <option value="trustee_owner">Trustee/Owner</option>
                        <option value="director">Director</option>
                        <option value="coordinator">Coordinator</option>
                        <option value="accounts">Accounts</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <PhoneInput
                        value={contact.phone_number || ''}
                        onChange={(val) => updateSchoolContact(idx, 'phone_number', val)}
                        countryCode={contact.country_code || '+91'}
                        onCountryCodeChange={(code) => updateSchoolContact(idx, 'country_code', code)}
                        placeholder="Phone *"
                      />
                      <Input
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => updateSchoolContact(idx, 'email', e.target.value)}
                      />
                    </div>
                    {onboardData.school_contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setOnboardData(prev => ({
                          ...prev,
                          school_contacts: prev.school_contacts.filter((_, i) => i !== idx)
                        }))}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Remove Contact
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Payment Details */}
            <div className="bg-slate-50 p-4 rounded-lg space-y-4">
              <p className="text-sm font-semibold text-slate-700">Payment Details</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">Payment Mode (Who pays?)</label>
                  <select
                    value={onboardData.payment_mode}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="from_school">From School</option>
                    <option value="from_student">From Student</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={onboardData.payment_method}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="">Select method</option>
                    <option value="cheque">Cheque</option>
                    <option value="neft">NEFT/RTGS</option>
                    <option value="online">Online</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
              
              {/* Payment Tranches */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Payment Tranches</label>
                  <Button variant="ghost" size="sm" onClick={addPaymentTranche} className="text-blue-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Tranche
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-2">Enter % or amount - the other will auto-calculate</p>
                <div className="space-y-2">
                  {onboardData.payment_tranches.map((tranche, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="%"
                          value={tranche.percentage}
                          onChange={(e) => updatePaymentTranche(idx, 'percentage', e.target.value)}
                          className="pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={tranche.amount}
                          onChange={(e) => updatePaymentTranche(idx, 'amount', e.target.value)}
                          className="pl-6"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      </div>
                      <Input
                        type="date"
                        value={tranche.date}
                        onChange={(e) => updatePaymentTranche(idx, 'date', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Notes"
                        value={tranche.notes}
                        onChange={(e) => updatePaymentTranche(idx, 'notes', e.target.value)}
                      />
                      {onboardData.payment_tranches.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removePaymentTranche(idx)} className="text-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Contract Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Contract Start</label>
                <Input
                  type="date"
                  value={onboardData.contract_start}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, contract_start: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contract End</label>
                <Input
                  type="date"
                  value={onboardData.contract_end}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, contract_end: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowOnboardModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button variant="outline" onClick={() => handleOnboardSchool(true)} className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50">
                Save as Draft
              </Button>
              <Button onClick={() => handleOnboardSchool(false)} className="flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Mark as Converted
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Modal */}
      <Dialog open={showBulkImportModal} onOpenChange={setShowBulkImportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              Bulk Import Schools
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Download Template */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-2">Step 1: Download Template</h4>
              <p className="text-sm text-blue-600 mb-3">
                Download the CSV template with all required columns and sample data.
              </p>
              <Button 
                variant="outline" 
                onClick={handleDownloadTemplate}
                className="flex items-center gap-2"
                data-testid="download-template-btn"
              >
                <Download className="w-4 h-4" />
                Download CSV Template
              </Button>
            </div>

            {/* Upload File */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-800 mb-2">Step 2: Upload Your File</h4>
              <p className="text-sm text-slate-600 mb-3">
                Upload CSV or Excel file with your school data. Schools will be added directly to Active Schools.
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                data-testid="bulk-import-file"
              />
              {bulkImportFile && (
                <p className="text-sm text-green-600 mt-2">
                  ✓ File loaded: {bulkImportFile.name}
                </p>
              )}
            </div>

            {/* Preview */}
            {bulkImportData.length > 0 && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-100">
                <h4 className="font-medium text-green-800 mb-2">Step 3: Review & Import</h4>
                <p className="text-sm text-green-600 mb-3">
                  Found <strong>{bulkImportData.length} schools</strong> ready to import.
                </p>
                <div className="max-h-40 overflow-y-auto bg-white rounded border p-2 mb-3">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-1">School Name</th>
                        <th className="text-left p-1">Contact</th>
                        <th className="text-left p-1">Phone</th>
                        <th className="text-left p-1">Location</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkImportData.slice(0, 10).map((school, idx) => (
                        <tr key={idx} className="border-b last:border-0">
                          <td className="p-1">{school.school_name}</td>
                          <td className="p-1">{school.contact_name}</td>
                          <td className="p-1">{school.phone}</td>
                          <td className="p-1">{school.location}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {bulkImportData.length > 10 && (
                    <p className="text-xs text-slate-500 mt-2 text-center">
                      ... and {bulkImportData.length - 10} more
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {bulkImportErrors.length > 0 && (
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Import Errors
                </h4>
                <div className="max-h-32 overflow-y-auto text-sm text-red-600">
                  {bulkImportErrors.map((err, idx) => (
                    <p key={idx}>Row {err.row}: {err.error}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowBulkImportModal(false);
                  setBulkImportData([]);
                  setBulkImportFile(null);
                  setBulkImportErrors([]);
                }} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleBulkImport}
                disabled={bulkImportData.length === 0 || bulkImporting}
                className="flex-1 bg-green-600 hover:bg-green-700"
                data-testid="import-schools-btn"
              >
                {bulkImporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import {bulkImportData.length} Schools
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Onboarding Modal */}
      <Dialog open={!!showEditOnboardingModal} onOpenChange={() => { setShowEditOnboardingModal(null); setEditOnboardData(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5" />
              Edit School: {showEditOnboardingModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          
          {editOnboardData && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="font-medium text-slate-800 mb-3">School Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">School Name *</label>
                    <Input
                      value={editOnboardData.school_name || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, school_name: e.target.value }))}
                      data-testid="edit-school-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Contact Name</label>
                    <Input
                      value={editOnboardData.contact_name || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, contact_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Phone</label>
                    <Input
                      value={editOnboardData.phone || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Email</label>
                    <Input
                      value={editOnboardData.email || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Location</label>
                    <select
                      value={editOnboardData.location || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select City</option>
                      {CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Board</label>
                    <select
                      value={editOnboardData.board || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, board: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select Board</option>
                      {BOARDS.map(board => (
                        <option key={board} value={board}>{board}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Offering Details */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-3">Program Details</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Offering</label>
                    <select
                      value={editOnboardData.offering || ''}
                      onChange={(e) => {
                        const selected = offerings.find(o => o.id === e.target.value);
                        setEditOnboardData(prev => ({ 
                          ...prev, 
                          offering: e.target.value,
                          model: selected?.name || prev.model
                        }));
                      }}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Offering</option>
                      {offerings.map(off => (
                        <option key={off.id} value={off.id}>{off.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Model</label>
                    <Input
                      value={editOnboardData.model || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Book Type</label>
                    <select
                      value={editOnboardData.book_type || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, book_type: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Book Type</option>
                      <option value="individual_books">Individual Books</option>
                      <option value="no_books">No Books</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Kit Type</label>
                    <select
                      value={editOnboardData.kit_type || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, kit_type: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Kit Type</option>
                      <option value="lab_setup">Lab Setup</option>
                      <option value="individual">Individual Kit</option>
                      <option value="no_kit">No Kit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Training Type</label>
                    <select
                      value={editOnboardData.training_type || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, training_type: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Training Type</option>
                      <option value="student_training">Student Training</option>
                      <option value="teacher_training">Teacher Training</option>
                      <option value="both">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Total Students</label>
                    <Input
                      type="number"
                      value={editOnboardData.total_students || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, total_students: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-3">Payment Details</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Total Amount (₹)</label>
                    <Input
                      type="number"
                      value={editOnboardData.total_amount || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Payment Mode</label>
                    <select
                      value={editOnboardData.payment_mode || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, payment_mode: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="from_school">From School</option>
                      <option value="from_student">From Student</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Payment Method</label>
                    <select
                      value={editOnboardData.payment_method || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Method</option>
                      <option value="cheque">Cheque</option>
                      <option value="neft">NEFT/RTGS</option>
                      <option value="online">Online</option>
                      <option value="cash">Cash</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Contract Dates */}
              <div className="bg-amber-50 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 mb-3">Contract Period</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Contract Start</label>
                    <Input
                      type="date"
                      value={editOnboardData.contract_start || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, contract_start: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Contract End</label>
                    <Input
                      type="date"
                      value={editOnboardData.contract_end || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, contract_end: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="outline" 
                  onClick={() => { setShowEditOnboardingModal(null); setEditOnboardData(null); }} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEditOnboarding}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  data-testid="save-edit-school-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Meeting Modal */}
      <Dialog open={!!showAddMeetingModal} onOpenChange={() => setShowAddMeetingModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Followup Meeting - {showAddMeetingModal?.school_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewMeetingData({ ...newMeetingData, type: 'offline' })}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    newMeetingData.type === 'offline'
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Offline
                </button>
                <button
                  type="button"
                  onClick={() => setNewMeetingData({ ...newMeetingData, type: 'online' })}
                  className={`flex-1 py-2 px-4 rounded-lg border text-sm font-medium transition-all ${
                    newMeetingData.type === 'online'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Online
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
              <CalendarComponent
                mode="single"
                selected={newMeetingData.date}
                onSelect={(date) => setNewMeetingData({ ...newMeetingData, date })}
                disabled={(date) => date < new Date()}
                className="rounded-lg border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setNewMeetingData({ ...newMeetingData, time })}
                    className={`py-2 px-3 rounded-lg border text-sm ${
                      newMeetingData.time === time
                        ? 'bg-[#1E3A5F] text-white border-[#1E3A5F]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <Textarea
                value={newMeetingData.notes}
                onChange={(e) => setNewMeetingData({ ...newMeetingData, notes: e.target.value })}
                placeholder="Meeting agenda or notes..."
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={handleAddMeeting} className="w-full btn-primary">
              <Plus className="w-4 h-4 mr-2" /> Add Meeting
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Modal */}
      <Dialog open={!!showEditContactModal} onOpenChange={() => setShowEditContactModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Contact - {showEditContactModal?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  value={editContactData.name}
                  onChange={(e) => setEditContactData({ ...editContactData, name: e.target.value })}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={editContactData.phone}
                  onChange={(e) => setEditContactData({ ...editContactData, phone: e.target.value })}
                  placeholder="Phone number"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={editContactData.email}
                onChange={(e) => setEditContactData({ ...editContactData, email: e.target.value })}
                placeholder="Email address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
              <Input
                value={editContactData.role}
                onChange={(e) => setEditContactData({ ...editContactData, role: e.target.value })}
                placeholder="e.g., Principal, Coordinator"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">School</label>
              <Input
                value={editContactData.school_name}
                disabled
                className="bg-slate-50"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Birthday</label>
                <Input
                  type="date"
                  value={editContactData.birthday}
                  onChange={(e) => setEditContactData({ ...editContactData, birthday: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Anniversary</label>
                <Input
                  type="date"
                  value={editContactData.anniversary}
                  onChange={(e) => setEditContactData({ ...editContactData, anniversary: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <Textarea
                value={editContactData.notes}
                onChange={(e) => setEditContactData({ ...editContactData, notes: e.target.value })}
                placeholder="Additional notes about this contact..."
                className="min-h-[80px]"
              />
            </div>
            <Button onClick={handleUpdateContact} className="w-full btn-primary">
              <Save className="w-4 h-4 mr-2" /> Save Contact
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Onboarding Workflow Modal */}
      <Dialog open={!!showOnboardingWorkflowModal} onOpenChange={() => setShowOnboardingWorkflowModal(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Onboarding Workflow - {showOnboardingWorkflowModal?.school_name}</span>
              {showOnboardingWorkflowModal?.onboarding_workflow?.tracking_token && (
                <button
                  onClick={() => {
                    const url = `${window.location.origin}/track/${showOnboardingWorkflowModal.onboarding_workflow.tracking_token}`;
                    navigator.clipboard.writeText(url);
                    toast.success('Tracking link copied!');
                  }}
                  className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  Copy Tracking Link
                </button>
              )}
            </DialogTitle>
          </DialogHeader>
          
          {showOnboardingWorkflowModal?.onboarding_workflow && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ 
                    width: `${Object.values(showOnboardingWorkflowModal.onboarding_workflow.steps || {}).filter(s => s.completed).length / 9 * 100}%` 
                  }}
                />
              </div>
              
              {/* Steps Grid */}
              <div className="space-y-4">
                {Object.entries(showOnboardingWorkflowModal.onboarding_workflow.steps || {}).map(([key, step]) => (
                  <div 
                    key={key}
                    className={`border rounded-xl p-4 ${step.completed ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleUpdateOnboardingStep(
                            showOnboardingWorkflowModal.id,
                            key,
                            { completed: !step.completed }
                          )}
                          className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                            step.completed 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-slate-300 hover:border-green-400'
                          }`}
                        >
                          {step.completed && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <div>
                          <h4 className={`font-medium ${step.completed ? 'text-green-800' : 'text-slate-800'}`}>
                            {step.title}
                          </h4>
                          <p className="text-sm text-slate-500">{step.description}</p>
                          {step.completed_date && (
                            <p className="text-xs text-green-600 mt-1">
                              Completed: {format(new Date(step.completed_date), 'MMM d, yyyy h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Step-specific fields */}
                    <div className="mt-4 pl-9 space-y-3">
                      {/* Payment Collection */}
                      {key === 'payment_collection' && (
                        <div className="space-y-3">
                          {/* Show Payment Tranches from onboarding_data */}
                          {showOnboardingWorkflowModal?.onboarding_data?.payment_tranches?.length > 0 ? (
                            <div className="space-y-2">
                              <label className="text-xs text-slate-500 font-medium">Payment Tranches</label>
                              {showOnboardingWorkflowModal.onboarding_data.payment_tranches.map((tranche, idx) => {
                                const tranchePayment = showOnboardingWorkflowModal.payments?.find(p => p.tranche_index === idx);
                                return (
                                  <div key={idx} className="bg-white border rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="font-medium text-slate-700">Tranche {idx + 1}</span>
                                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        tranchePayment?.status === 'paid' 
                                          ? 'bg-green-100 text-green-700' 
                                          : 'bg-yellow-100 text-yellow-700'
                                      }`}>
                                        {tranchePayment?.status || 'pending'}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                      {tranche.percentage && (
                                        <div>
                                          <span className="text-slate-500">%:</span>
                                          <span className="ml-1 font-medium">{tranche.percentage}%</span>
                                        </div>
                                      )}
                                      <div>
                                        <span className="text-slate-500">Amount:</span>
                                        <span className="ml-1 font-medium text-green-600">₹{(tranche.amount || 0).toLocaleString()}</span>
                                      </div>
                                      <div>
                                        <span className="text-slate-500">Due:</span>
                                        <span className="ml-1 font-medium">
                                          {tranche.date ? format(new Date(tranche.date), 'MMM d, yyyy') : '-'}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Download buttons */}
                                    <div className="flex items-center gap-3 mt-2 pt-2 border-t">
                                      {tranchePayment?.invoice_url ? (
                                        <a 
                                          href={tranchePayment.invoice_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                                        >
                                          <Download className="w-3 h-3" /> Invoice
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 text-xs">No invoice</span>
                                      )}
                                      {tranchePayment?.receipt_url ? (
                                        <a 
                                          href={tranchePayment.receipt_url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-green-600 text-xs flex items-center gap-1 hover:underline"
                                        >
                                          <Download className="w-3 h-3" /> Receipt
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 text-xs">No receipt</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg">
                              No payment tranches defined. Set up tranches when converting the school.
                            </div>
                          )}
                          
                          <p className="text-xs text-blue-600 mt-2">
                            <a href="/admin/orders" className="hover:underline">
                              → Manage payments in Orders → School Payments
                            </a>
                          </p>
                        </div>
                      )}
                      
                      {/* Kit Delivery */}
                      {key === 'kit_delivery' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500">Dispatch Date</label>
                              <Input
                                type="date"
                                value={step.data?.dispatch_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { dispatch_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Delivery Date</label>
                              <Input
                                type="date"
                                value={step.data?.delivery_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { delivery_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Tracking Link</label>
                            <Input
                              value={step.data?.tracking_link || ''}
                              onChange={(e) => handleUpdateOnboardingStep(
                                showOnboardingWorkflowModal.id, key,
                                { data: { tracking_link: e.target.value } }
                              )}
                              placeholder="Enter tracking URL"
                              className="h-9"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Technical Check - Checklist */}
                      {key === 'technical_check' && step.data?.checklist && (
                        <div className="space-y-2">
                          {step.data.checklist.map((item, idx) => (
                            <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={() => {
                                  const newChecklist = [...step.data.checklist];
                                  newChecklist[idx].checked = !newChecklist[idx].checked;
                                  handleUpdateOnboardingStep(
                                    showOnboardingWorkflowModal.id, key,
                                    { data: { checklist: newChecklist } }
                                  );
                                }}
                                className="h-4 w-4 rounded border-slate-300"
                              />
                              <span className={item.checked ? 'text-green-700' : 'text-slate-600'}>
                                {item.item}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                      
                      {/* Teacher Training */}
                      {key === 'teacher_training' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500">Training Date</label>
                              <Input
                                type="date"
                                value={step.data?.training_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { training_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Teachers Count</label>
                              <Input
                                type="number"
                                value={step.data?.teachers_count || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { teachers_count: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                          </div>
                          {step.data?.checklist && (
                            <div className="space-y-2">
                              {step.data.checklist.map((item, idx) => (
                                <label key={idx} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={item.checked}
                                    onChange={() => {
                                      const newChecklist = [...step.data.checklist];
                                      newChecklist[idx].checked = !newChecklist[idx].checked;
                                      handleUpdateOnboardingStep(
                                        showOnboardingWorkflowModal.id, key,
                                        { data: { checklist: newChecklist } }
                                      );
                                    }}
                                    className="h-4 w-4 rounded border-slate-300"
                                  />
                                  <span className={item.checked ? 'text-green-700' : 'text-slate-600'}>
                                    {item.item}
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Calendar Making */}
                      {key === 'calendar_making' && (
                        <div className="text-sm text-slate-500">
                          <p>Add holidays, competitions, and exhibition dates for the school year.</p>
                          <Textarea
                            value={step.data?.notes || ''}
                            onChange={(e) => handleUpdateOnboardingStep(
                              showOnboardingWorkflowModal.id, key,
                              { data: { notes: e.target.value } }
                            )}
                            placeholder="Enter calendar notes, dates, events..."
                            className="mt-2 min-h-[60px]"
                          />
                        </div>
                      )}
                      
                      {/* Timetable */}
                      {key === 'timetable_finalization' && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-xs text-slate-500">Sessions per Week</label>
                            <Input
                              type="number"
                              value={step.data?.sessions_per_week || ''}
                              onChange={(e) => handleUpdateOnboardingStep(
                                showOnboardingWorkflowModal.id, key,
                                { data: { sessions_per_week: e.target.value } }
                              )}
                              placeholder="e.g., 2"
                              className="h-9"
                            />
                          </div>
                          <Textarea
                            value={step.data?.notes || ''}
                            onChange={(e) => handleUpdateOnboardingStep(
                              showOnboardingWorkflowModal.id, key,
                              { data: { notes: e.target.value } }
                            )}
                            placeholder="Timetable details, grades covered, etc."
                            className="min-h-[60px]"
                          />
                        </div>
                      )}
                      
                      {/* MOU Signing */}
                      {key === 'mou_signing' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500">MOU Date</label>
                              <Input
                                type="date"
                                value={step.data?.mou_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { mou_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Document Link</label>
                              <Input
                                value={step.data?.document_link || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { document_link: e.target.value } }
                                )}
                                placeholder="MOU document URL"
                                className="h-9"
                              />
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={step.data?.signed_by_school}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { signed_by_school: e.target.checked } }
                                )}
                                className="h-4 w-4 rounded"
                              />
                              Signed by School
                            </label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer">
                              <input
                                type="checkbox"
                                checked={step.data?.signed_by_oll}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { signed_by_oll: e.target.checked } }
                                )}
                                className="h-4 w-4 rounded"
                              />
                              Signed by OLL
                            </label>
                          </div>
                        </div>
                      )}
                      
                      {/* School Confirmation */}
                      {key === 'school_confirmation' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500">Confirmation Date</label>
                              <Input
                                type="date"
                                value={step.data?.confirmation_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { confirmation_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Confirmed By</label>
                              <Input
                                value={step.data?.confirmed_by || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { confirmed_by: e.target.value } }
                                )}
                                placeholder="Name of confirming person"
                                className="h-9"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-xs text-slate-500">Feedback</label>
                            <Textarea
                              value={step.data?.feedback || ''}
                              onChange={(e) => handleUpdateOnboardingStep(
                                showOnboardingWorkflowModal.id, key,
                                { data: { feedback: e.target.value } }
                              )}
                              placeholder="School feedback or notes..."
                              className="min-h-[60px]"
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Distribution - Query Section */}
                      {key === 'distribution_checking' && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs text-slate-500">Distribution Date</label>
                              <Input
                                type="date"
                                value={step.data?.distribution_date || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { distribution_date: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500">Students Count</label>
                              <Input
                                type="number"
                                value={step.data?.students_count || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { students_count: e.target.value } }
                                )}
                                className="h-9"
                              />
                            </div>
                          </div>
                          {step.data?.queries?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-slate-500 mb-2">Queries:</p>
                              {step.data.queries.map((q, idx) => (
                                <div key={idx} className="text-xs bg-slate-100 p-2 rounded mb-1">
                                  <span className="font-medium">{q.type || 'Query'}:</span> {typeof q.description === 'string' ? q.description : JSON.stringify(q.description)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Timeline */}
              <div className="border-t pt-4">
                <h4 className="font-medium text-slate-700 mb-3">Activity Timeline</h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(showOnboardingWorkflowModal.onboarding_workflow.timeline || []).slice().reverse().map((item, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-sm">
                      <div className="w-2 h-2 rounded-full bg-[#1E3A5F] mt-1.5" />
                      <div>
                        <p className="text-slate-700">{typeof item.action === 'string' ? item.action : 'Activity'}</p>
                        <p className="text-xs text-slate-400">
                          {format(new Date(item.date), 'MMM d, h:mm a')} • {item.by}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSchoolCRM;
