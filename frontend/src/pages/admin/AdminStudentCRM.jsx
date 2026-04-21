import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Phone, Calendar, Clock, Plus, ChevronRight, ChevronDown, MessageSquare, Archive, CalendarClock, CheckCircle2, X, User, Mail, MapPin, Target, BookOpen, Send, UserPlus, Edit, Save, Video, Navigation, Home, ExternalLink, Bell, Upload, CreditCard, Link2, Copy, Loader2, Trash2, BarChart2, TrendingUp, AlertCircle, Check, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, parseISO, isAfter, isBefore, addHours } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';
import CitySearch from '../../components/CitySearch';
import SocialMediaInternCRM from './SocialMediaInternCRM';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const FOLLOWUP_STATUSES = [
  { value: 'not_contacted',    label: 'Not Contacted',         color: 'bg-slate-100 text-slate-600',    dot: '#94a3b8' },
  { value: 'call_not_picked',  label: 'Call Not Picked',       color: 'bg-amber-50 text-amber-700',     dot: '#f59e0b' },
  { value: 'call_cut',         label: 'Call Cut',              color: 'bg-orange-50 text-orange-700',   dot: '#f97316' },
  { value: 'callback_requested', label: 'Interested - Call Back', color: 'bg-blue-50 text-blue-700', dot: '#3b82f6' },
  { value: 'interested',       label: 'Interested',            color: 'bg-green-50 text-green-700',     dot: '#22c55e' },
  { value: 'non_serviceable',  label: 'Non-Serviceable',       color: 'bg-red-50 text-red-700',         dot: '#ef4444' },
];
const getFollowupStyle = val => FOLLOWUP_STATUSES.find(s => s.value === val) || FOLLOWUP_STATUSES[0];

const STATUS_SECTIONS = [
  { value: 'new', label: 'New Leads', color: 'bg-blue-500' },
  { value: 'demo_completed', label: 'Demo Completed', color: 'bg-purple-500' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
  { value: 'summer_camp', label: '🏕️ Summer Camp', color: 'bg-orange-500' },
  { value: 'social_media_intern', label: '🎬 Social Media Intern', color: 'bg-lime-500' },
];

const SKILLS = ['Robotics', 'Coding', 'AI', 'Entrepreneurship', 'Financial Literacy', 'Other'];

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];
const AGE_GROUPS = ['6-8 years', '9-12 years', '13-16 years', '17+ years'];
const LEARNING_MODES = [
  { value: 'online', label: 'Online' },
  { value: 'offline_home', label: 'Offline at Home' },
  { value: 'offline_center', label: 'Offline at Center' },
];
const LEARNING_GOALS = [
  { value: 'career', label: 'Career Preparation' },
  { value: 'skill_building', label: 'Skill Building' },
  { value: 'competition', label: 'Competition Prep' },
  { value: 'fun', label: 'Fun Learning' },
];

const AdminStudentCRM = () => {
  const { getAuthHeaders, user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('new');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  
  // Modal states
  const [viewInquiry, setViewInquiry] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(null);
  const [showConvertModal, setShowConvertModal] = useState(null);
  const [showCommentModal, setShowCommentModal] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(null);
  const [showCancelDemoModal, setShowCancelDemoModal] = useState(null);
  const [showOnboardModal, setShowOnboardModal] = useState(null);
  const [showArchiveModal, setShowArchiveModal] = useState(null);
  const [archiveReason, setArchiveReason] = useState('');
  // Summer Camp
  const [summerCampBookings, setSummerCampBookings] = useState([]);
  const [summerCampLoading, setSummerCampLoading] = useState(false);
  // Bulk import
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  // Add Individual Lead modal
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [addLeadSubmitting, setAddLeadSubmitting] = useState(false);
  const [addLeadForm, setAddLeadForm] = useState({
    child_name: '', parent_name: '', parent_phone: '', parent_email: '',
    age_group: 'creators', batch_week: 'week1', mode: 'offline',
    center: 'mira_road', payment_mode: 'cash', send_notifications: true,
  });
  // Tracking links
  const [trackingLinks, setTrackingLinks] = useState([]);
  const [trackingLinksLoading, setTrackingLinksLoading] = useState(false);
  const [newLinkName, setNewLinkName] = useState('');
  const [creatingLink, setCreatingLink] = useState(false);
  const [campSubTab, setCampSubTab] = useState('bookings'); // 'bookings' | 'tracking' | 'dashboard'
  const [selectedDashCenter, setSelectedDashCenter] = useState(null); // null = All Centers
  // Summer Camp CRM Modals
  const [campEditModal, setCampEditModal] = useState(null);
  const [campEditData, setCampEditData] = useState({});
  const [campDeleteModal, setCampDeleteModal] = useState(null);
  const [campStatusModal, setCampStatusModal] = useState(null);
  const [campLostReasonModal, setCampLostReasonModal] = useState(null); // { bookingId }
  const [campLostReason, setCampLostReason] = useState('');
  const [campCommentModal, setCampCommentModal] = useState(null);
  const [campNewComment, setCampNewComment] = useState('');
  const [campCommentTab, setCampCommentTab] = useState('comment'); // 'comment' | 'call'
  const [campCallDate, setCampCallDate] = useState('');
  const [campCallTime, setCampCallTime] = useState('');
  const [campCallComment, setCampCallComment] = useState('');
  const [campCallbackModal, setCampCallbackModal] = useState(null); // {bookingId, pendingStatus}
  const [campCallbackDate, setCampCallbackDate] = useState('');
  const [campCallbackTime, setCampCallbackTime] = useState('');
  const [campFilters, setCampFilters] = useState({ status: '', batch: '', center: '', source: '' });
  const [campSearch, setCampSearch] = useState('');
  const [campDashboard, setCampDashboard] = useState(null);
  const [campDashboardLoading, setCampDashboardLoading] = useState(false);
  const [campSaving, setCampSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [onboardedEducators, setOnboardedEducators] = useState([]);
  const [assignTab, setAssignTab] = useState('team'); // 'team' or 'educator'
  const [batches, setBatches] = useState([]);
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ name: '', phone: '', email: '', demo_date: '', demo_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // Autocomplete states
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState('');
  
  // Form states
  const [rescheduleData, setRescheduleData] = useState({ date: null, time: '', reason: '' });
  const [convertData, setConvertData] = useState({ amount: '', sessions: '', payment_receipt: null });
  const [cancelDemoReason, setCancelDemoReason] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [onboardData, setOnboardData] = useState({
    batch_mode: 'new', // 'new' or 'existing'
    batch_id: '',
    name: '',
    skill: '',
    start_date: '',
    days: [],
    time_slot: '',
    num_sessions: 12,
    educator_id: '',
    educator_name: '',
    mode: 'online',
    payment_receipt: null,
    payment_receipt_url: '',
    amount: '', // Payment amount
    payment_mode: 'receipt', // 'receipt' or 'online'
  });
  const [generatingPaymentLink, setGeneratingPaymentLink] = useState(false);
  const [paymentLinkGenerated, setPaymentLinkGenerated] = useState(null);
  const [newLead, setNewLead] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    email: '',
    skill: '',
    otherSkill: '', // Custom skill when "Other" is selected
    city: '',
    age_group: '',
    learning_mode: 'online',
    learning_goal: '',
    demo_date: null,
    demo_time: '',
    address: '',
    source: 'manual',
    notes: ''
  });

  useEffect(() => {
    fetchInquiries();
    fetchTeamUsers();
    fetchOnboardedEducators();
    fetchBatches();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeSection === 'summer_camp') {
      fetchSummerCampBookings();
      fetchTrackingLinks();
      if (campSubTab === 'dashboard') fetchCampDashboard();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection]);

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

  const fetchBatches = async () => {
    try {
      const response = await axios.get(`${API}/batches?status=active`, {
        headers: getAuthHeaders()
      });
      setBatches(response.data || []);
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const fetchOnboardedEducators = async () => {
    try {
      // Use for_assignment=true to get all educators (not just team member's own)
      const response = await axios.get(`${API}/educators/applications?for_assignment=true`, {
        headers: getAuthHeaders()
      });
      // Filter to educators who can take sessions (onboarded or active)
      const activeEducators = (response.data || []).filter(e => 
        e.status === 'onboarded' || e.status === 'active'
      );
      setOnboardedEducators(activeEducators);
    } catch (error) {
      console.error('Failed to fetch educators:', error);
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
      const response = await axios.get(`${API}/data-center/autocomplete?q=${encodeURIComponent(query)}&data_type=students`, {
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
      name: suggestion.name || '',
      phone: suggestion.phone || '',
      email: suggestion.email || '',
      city: suggestion.city || '',
      age_group: suggestion.age_group || '',
      skill: suggestion.skill || '',
      learning_mode: suggestion.learning_mode || 'online',
      learning_goal: suggestion.learning_goal || '',
      address: suggestion.address || '',
    });
    setShowAutocomplete(false);
    toast.info('Form auto-filled from existing record');
  };

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/students/inquiries`, {
        headers: getAuthHeaders()
      });
      setInquiries(response.data);
    } catch (error) {
      toast.error('Failed to fetch inquiries');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummerCampBookings = async () => {
    setSummerCampLoading(true);
    try {
      const response = await axios.get(`${API}/summer-camp/bookings`, { headers: getAuthHeaders() });
      setSummerCampBookings(response.data);
    } catch {
      toast.error('Failed to fetch summer camp bookings');
    } finally {
      setSummerCampLoading(false);
    }
  };

  const fetchTrackingLinks = async () => {
    setTrackingLinksLoading(true);
    try {
      const res = await axios.get(`${API}/summer-camp/tracking-links`, { headers: getAuthHeaders() });
      setTrackingLinks(res.data);
    } catch {
      toast.error('Failed to load tracking links');
    } finally {
      setTrackingLinksLoading(false);
    }
  };

  const createTrackingLink = async () => {
    if (!newLinkName.trim()) return;
    setCreatingLink(true);
    try {
      const res = await axios.post(`${API}/summer-camp/tracking-links`, { name: newLinkName.trim() }, { headers: getAuthHeaders() });
      setTrackingLinks(prev => [res.data, ...prev]);
      setNewLinkName('');
      toast.success('Tracking link created');
    } catch {
      toast.error('Failed to create link');
    } finally {
      setCreatingLink(false);
    }
  };

  const deleteTrackingLink = async (linkId) => {
    if (!window.confirm('Delete this tracking link?')) return;
    try {
      await axios.delete(`${API}/summer-camp/tracking-links/${linkId}`, { headers: getAuthHeaders() });
      setTrackingLinks(prev => prev.filter(l => l.id !== linkId));
      toast.success('Link deleted');
    } catch {
      toast.error('Failed to delete link');
    }
  };

  // ── Summer Camp CRM Management ──────────────────────────────────────────────

  const fetchCampDashboard = async () => {
    setCampDashboardLoading(true);
    try {
      const res = await axios.get(`${API}/summer-camp/dashboard`, { headers: getAuthHeaders() });
      setCampDashboard(res.data);
    } catch {
      toast.error('Failed to load dashboard');
    } finally {
      setCampDashboardLoading(false);
    }
  };

  const handleEditBooking = async () => {
    if (!campEditModal) return;
    setCampSaving(true);
    try {
      await axios.patch(`${API}/summer-camp/bookings/${campEditModal.id}`, campEditData, { headers: getAuthHeaders() });
      toast.success('Booking updated');
      setCampEditModal(null);
      fetchSummerCampBookings();
    } catch {
      toast.error('Failed to update booking');
    } finally {
      setCampSaving(false);
    }
  };

  const handleForceVerify = async (bookingId) => {
    try {
      const res = await axios.get(`${API}/summer-camp/verify/${bookingId}`, { headers: getAuthHeaders() });
      if (res.data?.status === 'PAID' || res.data?.booking?.crm_status === 'converted') {
        alert('Payment verified! Status updated to Paid/Converted.');
      } else {
        alert(`Cashfree status: ${res.data?.status || 'unknown'}. If payment was made, manually update the status.`);
      }
      fetchCampBookings();
    } catch {
      alert('Verification check failed. Try updating status manually.');
    }
  };

  const handleDeleteBooking = async () => {
    if (!campDeleteModal) return;
    setCampSaving(true);
    try {
      await axios.delete(`${API}/summer-camp/bookings/${campDeleteModal.id}`, { headers: getAuthHeaders() });
      toast.success('Booking deleted');
      setCampDeleteModal(null);
      fetchSummerCampBookings();
    } catch {
      toast.error('Failed to delete booking');
    } finally {
      setCampSaving(false);
    }
  };

  const handleUpdateStatus = async (bookingId, newStatus, lostReason = null) => {
    try {
      const payload = { crm_status: newStatus };
      if (newStatus === 'lost_lead' && lostReason) payload.lost_reason = lostReason;
      await axios.patch(`${API}/summer-camp/bookings/${bookingId}/status`, payload, { headers: getAuthHeaders() });
      toast.success('Status updated');
      setCampStatusModal(null);
      setCampLostReasonModal(null);
      setCampLostReason('');
      fetchSummerCampBookings();
      if (campSubTab === 'dashboard') fetchCampDashboard();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleAddCampComment = async () => {
    if (!campCommentModal || !campNewComment.trim()) return;
    setCampSaving(true);
    try {
      await axios.post(`${API}/summer-camp/bookings/${campCommentModal.id}/comment`,
        { text: campNewComment.trim(), author: user?.name || 'Admin', comment_type: 'comment' },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setCampNewComment('');
      const res = await axios.get(`${API}/summer-camp/bookings`, { headers: getAuthHeaders() });
      setSummerCampBookings(res.data);
      const updated = res.data.find(b => b.id === campCommentModal.id);
      if (updated) setCampCommentModal(updated);
    } catch {
      toast.error('Failed to add comment');
    } finally {
      setCampSaving(false);
    }
  };

  const handleAddCallLog = async () => {
    if (!campCommentModal || !campCallComment.trim()) return;
    setCampSaving(true);
    try {
      await axios.post(`${API}/summer-camp/bookings/${campCommentModal.id}/comment`,
        {
          text: campCallComment.trim(),
          author: user?.name || 'Admin',
          comment_type: 'call_done',
          call_date: campCallDate || new Date().toISOString().split('T')[0],
          call_time: campCallTime || new Date().toTimeString().slice(0, 5),
        },
        { headers: getAuthHeaders() }
      );
      toast.success('Call logged');
      setCampCallComment('');
      const res = await axios.get(`${API}/summer-camp/bookings`, { headers: getAuthHeaders() });
      setSummerCampBookings(res.data);
      const updated = res.data.find(b => b.id === campCommentModal.id);
      if (updated) setCampCommentModal(updated);
    } catch {
      toast.error('Failed to log call');
    } finally {
      setCampSaving(false);
    }
  };

  const handleFollowupStatusChange = async (bookingId, newStatus, callbackDate = '', callbackTime = '') => {
    try {
      await axios.patch(`${API}/summer-camp/bookings/${bookingId}/followup-status`,
        { followup_status: newStatus, callback_date: callbackDate, callback_time: callbackTime },
        { headers: getAuthHeaders() }
      );
      setSummerCampBookings(prev => prev.map(b =>
        b.id === bookingId
          ? { ...b, followup_status: newStatus, callback_date: callbackDate, callback_time: callbackTime }
          : b
      ));
    } catch {
      toast.error('Failed to update follow-up status');
    }
  };



  const handleStatusChange = async (inquiry, newStatus, additionalData = {}) => {
    try {
      await axios.patch(`${API}/students/inquiry/${inquiry.id}`, { 
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

  const handleAssignEducator = async (educatorId, educatorName) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/students/inquiry/${showAssignModal.id}`, {
        assigned_educator_id: educatorId,
        assigned_educator_name: educatorName
      }, {
        headers: getAuthHeaders()
      });
      toast.success(`Demo assigned to ${educatorName}`);
      setShowAssignModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to assign educator');
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
      await axios.patch(`${API}/students/inquiry/${showRescheduleModal.id}`, {
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
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to reschedule');
    }
  };

  const handleCancelDemo = async () => {
    if (!cancelDemoReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showCancelDemoModal.id}`, {
        demo_date: null,
        demo_time: null,
        demo_cancelled: true,
        notes: showCancelDemoModal.notes 
          ? `${showCancelDemoModal.notes}\n\n[DEMO CANCELLED] ${format(new Date(), 'MMM d, yyyy')}: ${cancelDemoReason}` 
          : `[DEMO CANCELLED] ${format(new Date(), 'MMM d, yyyy')}: ${cancelDemoReason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Demo cancelled successfully');
      setShowCancelDemoModal(null);
      setCancelDemoReason('');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to cancel demo');
    }
  };

  const handleConvert = async () => {
    // This function is now part of onboarding - see handleOnboardStudent
  };

  const handleArchive = (inquiry) => {
    setShowArchiveModal(inquiry);
    setArchiveReason('');
  };

  const confirmArchive = async () => {
    if (!showArchiveModal) return;
    if (!archiveReason) {
      toast.error('Please select a reason for archiving');
      return;
    }
    try {
      await axios.patch(`${API}/students/inquiry/${showArchiveModal.id}`, {
        status: 'archived',
        archive_reason: archiveReason,
        notes: showArchiveModal.notes 
          ? `${showArchiveModal.notes}\n\n--- Archived (${format(new Date(), 'dd MMM yyyy')}) ---\nReason: ${archiveReason}`
          : `--- Archived (${format(new Date(), 'dd MMM yyyy')}) ---\nReason: ${archiveReason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead archived');
      setShowArchiveModal(null);
      setArchiveReason('');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to archive lead');
    }
  };

  const handleReceiptUpload = async (file) => {
    if (!file) return;
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setOnboardData(prev => ({ 
        ...prev, 
        payment_receipt_url: response.data.url || response.data.file_url 
      }));
      toast.success('Receipt uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Setup online payment - saves batch details and amount to student record
  // Student can then pay via their payment page using Cashfree Drop-in checkout
  const handleGeneratePaymentLink = async () => {
    if (!showOnboardModal) return;
    
    // Validate amount
    if (!onboardData.amount || parseFloat(onboardData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    // Validate batch details
    let batchId = onboardData.batch_id;
    let batchName = '';
    
    if (onboardData.batch_mode === 'new') {
      if (!onboardData.start_date || onboardData.days.length === 0 || !onboardData.time_slot || !onboardData.educator_id) {
        toast.error('Please fill all required batch fields first');
        return;
      }
      batchName = onboardData.name || `${showOnboardModal.name}'s Batch`;
    } else {
      if (!batchId) {
        toast.error('Please select a batch first');
        return;
      }
      const selectedBatch = batches.find(b => b.id === batchId);
      batchName = selectedBatch?.name || 'Batch';
    }
    
    setGeneratingPaymentLink(true);
    
    try {
      // If new batch mode, create batch first
      if (onboardData.batch_mode === 'new') {
        const batchResponse = await axios.post(`${API}/batches`, {
          name: batchName,
          skill: onboardData.skill || showOnboardModal.skill,
          start_date: onboardData.start_date,
          days: onboardData.days,
          time_slot: onboardData.time_slot,
          num_sessions: parseInt(onboardData.num_sessions) || 12,
          educator_id: onboardData.educator_id,
          educator_name: onboardData.educator_name,
          mode: onboardData.mode,
        }, { headers: getAuthHeaders() });
        
        batchId = batchResponse.data.id;
        setOnboardData(prev => ({ ...prev, batch_id: batchId }));
      }
      
      // Save pending payment info to student record (NO Cashfree API call here)
      // The student will create the payment session when they click "Pay Fees"
      await axios.patch(`${API}/students/inquiry/${showOnboardModal.id}`, {
        status: 'demo_completed', // Keep as demo_completed until payment is made
        pending_payment: {
          amount: parseFloat(onboardData.amount),
          batch_id: batchId,
          batch_name: batchName,
          status: 'AWAITING_PAYMENT',
          created_at: new Date().toISOString()
        },
        notes: showOnboardModal.notes 
          ? `${showOnboardModal.notes}\n\nOnline payment setup - ₹${onboardData.amount} for ${batchName}` 
          : `Online payment setup - ₹${onboardData.amount} for ${batchName}`
      }, { headers: getAuthHeaders() });
      
      // Generate the payment page URL (NOT a Cashfree link)
      const frontendUrl = window.location.origin;
      const paymentPageUrl = `${frontendUrl}/student/pay/${showOnboardModal.id}`;
      
      setPaymentLinkGenerated({
        payment_link: paymentPageUrl,
        amount: parseFloat(onboardData.amount),
        student_id: showOnboardModal.id,
        batch_name: batchName
      });
      
      toast.success('Payment setup complete! Share the link with the student.');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to setup payment');
      console.error(error);
    } finally {
      setGeneratingPaymentLink(false);
    }
  };

  const handleOnboardStudent = async () => {
    if (!showOnboardModal) return;
    
    // For online payment mode, just close the modal (payment link already generated)
    if (onboardData.payment_mode === 'online') {
      if (!paymentLinkGenerated) {
        toast.error('Please generate a payment link first');
        return;
      }
      toast.success('Payment link shared. Student will be converted automatically after payment.');
      setShowOnboardModal(null);
      setOnboardData({
        batch_mode: 'new', batch_id: '', name: '', skill: '', start_date: '',
        days: [], time_slot: '', num_sessions: 12, educator_id: '', educator_name: '', mode: 'online',
        payment_receipt: null, payment_receipt_url: '', amount: '', payment_mode: 'receipt'
      });
      setPaymentLinkGenerated(null);
      return;
    }
    
    // Validate payment receipt for receipt mode
    if (!onboardData.payment_receipt_url) {
      toast.error('Payment receipt is mandatory');
      return;
    }
    
    // Validate amount
    if (!onboardData.amount || parseFloat(onboardData.amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }
    
    try {
      // First update to converted status with payment info
      await axios.patch(`${API}/students/inquiry/${showOnboardModal.id}`, {
        status: 'converted',
        payment_receipt_url: onboardData.payment_receipt_url,
        conversion_amount: onboardData.amount,
        notes: showOnboardModal.notes 
          ? `${showOnboardModal.notes}\n\nConverted with payment receipt - ₹${onboardData.amount}` 
          : `Converted with payment receipt - ₹${onboardData.amount}`
      }, {
        headers: getAuthHeaders()
      });
      
      let batchId = onboardData.batch_id;
      
      // Create new batch if needed
      if (onboardData.batch_mode === 'new') {
        if (!onboardData.start_date || onboardData.days.length === 0 || !onboardData.time_slot || !onboardData.educator_id) {
          toast.error('Please fill all required fields for new batch');
          return;
        }
        
        const batchResponse = await axios.post(`${API}/batches`, {
          name: onboardData.name || `${showOnboardModal.name}'s Batch`,
          skill: onboardData.skill || showOnboardModal.skill,
          start_date: onboardData.start_date,
          days: onboardData.days,
          time_slot: onboardData.time_slot,
          num_sessions: parseInt(onboardData.num_sessions) || 12,
          educator_id: onboardData.educator_id,
          educator_name: onboardData.educator_name,
          mode: onboardData.mode,
        }, { headers: getAuthHeaders() });
        
        batchId = batchResponse.data.id;
      }
      
      if (!batchId) {
        toast.error('Please select or create a batch');
        return;
      }
      
      // Add student to batch
      await axios.post(`${API}/batches/${batchId}/add-student`, {
        student_id: showOnboardModal.id
      }, { headers: getAuthHeaders() });
      
      toast.success('Student onboarded successfully! Sessions created.');
      setShowOnboardModal(null);
      setOnboardData({
        batch_mode: 'new', batch_id: '', name: '', skill: '', start_date: '',
        days: [], time_slot: '', num_sessions: 12, educator_id: '', educator_name: '', mode: 'online',
        payment_receipt: null, payment_receipt_url: '', amount: '', payment_mode: 'receipt'
      });
      setPaymentLinkGenerated(null);
      fetchInquiries();
      fetchBatches();
    } catch (error) {
      toast.error('Failed to onboard student');
      console.error(error);
    }
  };

  const handleAddLead = async () => {
    if (!newLead.name || !newLead.phone) {
      toast.error('Name and phone are required');
      return;
    }
    const fullPhone = newLead.countryCode === '+91' ? newLead.phone : `${newLead.countryCode}${newLead.phone}`;
    
    // Use otherSkill if skill is "other"
    const finalSkill = newLead.skill === 'other' && newLead.otherSkill ? newLead.otherSkill : newLead.skill;
    
    try {
      await axios.post(`${API}/students/inquiry`, {
        ...newLead,
        skill: finalSkill,
        phone: fullPhone,
        email: newLead.email || `${newLead.phone}@manual.oll`,
        learner_type: 'self',
        demo_date: newLead.demo_date ? format(newLead.demo_date, 'yyyy-MM-dd') : null,
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Lead added successfully');
      setShowAddForm(false);
      setNewLead({
        name: '',
        phone: '',
        countryCode: '+91',
        email: '',
        skill: '',
        otherSkill: '',
        city: '',
        age_group: '',
        learning_mode: 'online',
        learning_goal: '',
        demo_date: null,
        demo_time: '',
        address: '',
        source: 'manual',
        notes: ''
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
      await axios.post(`${API}/students/comment/${showCommentModal.id}`, 
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

  const handleAssignLead = async (userId) => {
    if (!showAssignModal) return;
    try {
      await axios.patch(`${API}/students/inquiry/${showAssignModal.id}`, {
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

  const handleSaveEdit = async () => {
    if (!viewInquiry) return;
    try {
      await axios.patch(`${API}/students/inquiry/${viewInquiry.id}`, {
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
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update lead');
    }
  };

  const handleAddViewComment = async () => {
    if (!viewComment.trim() || !viewInquiry) return;
    try {
      await axios.post(`${API}/students/comment/${viewInquiry.id}`, 
        { text: viewComment },
        { headers: getAuthHeaders() }
      );
      toast.success('Comment added');
      setViewComment('');
      // Refresh the viewInquiry data
      const response = await axios.get(`${API}/students/inquiries`, { headers: getAuthHeaders() });
      const updatedInquiry = response.data.find(i => i.id === viewInquiry.id);
      if (updatedInquiry) setViewInquiry(updatedInquiry);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  const getAssignedUserName = (userId) => {
    if (!userId) return null;
    const teamUser = teamUsers.find(u => u.id === userId);
    return teamUser?.name || null;
  };

  // Helper functions for meeting links and location
  // Generate a Jitsi meeting link for admin (moderator role)
  const generateMeetingLink = (inquiry) => {
    const meetCode = inquiry.id?.slice(-10) || 'demo-meet';
    const roomName = `OLLDemo${meetCode}`;
    const adminName = encodeURIComponent(user?.name || 'OLL Admin');
    
    // Jitsi config for admin/moderator with lobby control enabled
    // Moderators can admit/reject participants from the lobby
    const config = {
      'config.prejoinPageEnabled': true,
      'config.startWithAudioMuted': false,
      'config.startWithVideoMuted': false,
      'config.disableDeepLinking': true,
      'config.enableLobby': true,
      'config.lobbyModeEnabled': true,
      'userInfo.displayName': adminName,
      'userInfo.moderator': true
    };
    
    const configString = Object.entries(config)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join('&');
    
    return `https://meet.jit.si/${roomName}#${configString}`;
  };

  const isDemoJoinable = (inquiry) => {
    if (!inquiry.demo_date || !inquiry.demo_time) return false;
    if (!['new', 'demo_scheduled'].includes(inquiry.status)) return false;
    if (inquiry.learning_mode !== 'online') return false;
    
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
  const isOfflineHome = (inquiry) => inquiry.learning_mode === 'offline_home';

  const generateCenterMapsLink = (inquiry) => {
    const centerName = inquiry.selected_center_name || inquiry.center_name || 'OLL Center';
    const city = inquiry.city || '';
    const query = encodeURIComponent(`${centerName} ${city}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getLocationDisplay = (inquiry) => {
    if (isOnlineMode(inquiry)) {
      return { type: 'online', text: 'Online Class', icon: Video };
    } else if (isOfflineCenter(inquiry)) {
      const centerName = inquiry.selected_center_name || inquiry.center_name || 'OLL Center';
      return { type: 'center', text: `${centerName}, ${inquiry.city || ''}`, icon: MapPin };
    } else if (isOfflineHome(inquiry)) {
      return { type: 'home', text: `At Home - ${inquiry.address || inquiry.city || ''}`, icon: Home };
    }
    return { type: 'unknown', text: inquiry.city || 'Location TBD', icon: MapPin };
  };

  const filteredInquiries = inquiries.filter(inq => {
    const matchesSearch = inq.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

  // ── Export Helpers ───────────────────────────────────────────────────────────
  const exportStudentCRMToExcel = () => {
    const sectionLabel = STATUS_SECTIONS.find(s => s.value === activeSection)?.label || activeSection;
    const rows = (activeSection === 'summer_camp' ? [] : filteredInquiries).map(inq => ({
      'Name': inq.name || '',
      'Phone': inq.phone || '',
      'Email': inq.email || '',
      'Status': inq.status || '',
      'Age Group': inq.age_group || '',
      'Skills': Array.isArray(inq.skills) ? inq.skills.join(', ') : (inq.skill || ''),
      'Learning Mode': inq.learning_mode || '',
      'City': inq.city || '',
      'Demo Date': inq.demo_date || '',
      'Demo Time': inq.demo_time || '',
      'Source': inq.source || '',
      'Assigned To': (teamUsers.find(u => u.id === inq.assigned_to)?.name) || inq.assigned_to || 'Unassigned',
      'Notes': inq.notes || '',
      'Created At': inq.created_at ? inq.created_at.slice(0, 10) : '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sectionLabel.slice(0, 31));
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `Student_CRM_${sectionLabel}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const exportSummerCampToExcel = (bookings) => {
    const rows = bookings.map(b => ({
      'Name': b.student_name || b.name || '',
      'Phone': b.phone || '',
      'Email': b.email || '',
      'Parent Name': b.parent_name || '',
      'Age Group': b.age_group || '',
      'Center': b.center_label || b.center || '',
      'Batch': b.batch_label || b.batch_week || '',
      'CRM Status': b.crm_status || '',
      'Payment Status': b.payment_status || '',
      'Amount Paid (₹)': b.amount || b.payment_amount || '',
      'Source': b.source_name || b.source || 'Direct',
      'Booking Date': b.created_at ? b.created_at.slice(0, 10) : '',
      'Comments': b.comments || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Summer Camp');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `SummerCamp_CRM_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const downloadImportSample = async () => {
    try {
      const res = await axios.get(`${API}/summer-camp/bulk-import-sample`, {
        headers: getAuthHeaders(), responseType: 'blob',
      });
      saveAs(new Blob([res.data]), 'SummerCamp_Import_Sample.xlsx');
    } catch { toast.error('Could not download sample file'); }
  };

  const handleImportFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setImportFile(f);
    setImportResult(null);
    // Parse locally for preview using XLSX
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setImportPreview(rows.slice(0, 5)); // show first 5 rows as preview
      } catch { toast.error('Could not parse file'); }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleBulkImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      const res = await axios.post(`${API}/summer-camp/bulk-import`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data);
      fetchSummerCampBookings();
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleAddIndividualLead = async () => {
    if (!addLeadForm.child_name.trim()) return toast.error('Child name is required');
    if (!addLeadForm.parent_phone.trim()) return toast.error('Parent phone is required');
    setAddLeadSubmitting(true);
    try {
      const res = await axios.post(`${API}/summer-camp/add-lead`, addLeadForm, {
        headers: getAuthHeaders(),
      });
      toast.success(res.data.message || 'Lead added successfully!');
      setShowAddLeadModal(false);
      setAddLeadForm({
        child_name: '', parent_name: '', parent_phone: '', parent_email: '',
        age_group: 'creators', batch_week: 'week1', mode: 'offline',
        center: 'mira_road', payment_mode: 'cash', send_notifications: true,
      });
      fetchSummerCampBookings();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add lead');
    } finally {
      setAddLeadSubmitting(false);
    }
  };

  const getCount = (status) => {
    if (status === 'summer_camp') return summerCampBookings.length;
    if (status === 'social_media_intern') return '';
    return inquiries.filter(i => i.status === status).length;
  };

  // Notify not joined - for student or educator
  const handleNotifyNotJoined = async (inquiry, notifyType) => {
    try {
      await axios.post(`${API}/admin/notify-not-joined/${inquiry.id}`, {
        notify_type: notifyType
      }, { headers: getAuthHeaders() });
      toast.success(`${notifyType === 'student' ? 'Student' : 'Educator'} has been notified`);
    } catch (error) {
      toast.error('Failed to send notification');
    }
  };

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
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Add Note
        </button>
        {/* Not Joined notification buttons */}
        {inquiry.demo_date && inquiry.status === 'new' && (
          <>
            <button
              onClick={() => handleNotifyNotJoined(inquiry, 'student')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-700 flex items-center gap-1 font-medium"
              data-testid={`notify-student-${inquiry.id}`}
              title="Notify student they haven't joined"
            >
              <Bell className="w-3 h-3" />
              Student?
            </button>
            {inquiry.assigned_educator_id && (
              <button
                onClick={() => handleNotifyNotJoined(inquiry, 'educator')}
                className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
                data-testid={`notify-educator-${inquiry.id}`}
                title="Notify educator they haven't joined"
              >
                <Bell className="w-3 h-3" />
                Educator?
              </button>
            )}
          </>
        )}
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
            {inquiry.demo_date && (
              <button
                onClick={() => {
                  setShowCancelDemoModal(inquiry);
                  setCancelDemoReason('');
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
                data-testid={`cancel-demo-${inquiry.id}`}
              >
                <X className="w-3 h-3" />
                Cancel Demo
              </button>
            )}
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
                setOnboardData(prev => ({ 
                  ...prev, 
                  skill: inquiry.skill, 
                  mode: inquiry.learning_mode || 'online',
                  payment_receipt_url: ''
                }));
                setShowOnboardModal(inquiry);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Convert & Onboard
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
        return (
          <div className="flex gap-1 flex-wrap">
            {baseButtons}
            {!inquiry.batch_id && (
              <button
                onClick={() => {
                  setOnboardData(prev => ({ ...prev, skill: inquiry.skill, mode: inquiry.learning_mode || 'online' }));
                  setShowOnboardModal(inquiry);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 flex items-center gap-1 font-medium"
                data-testid={`onboard-${inquiry.id}`}
              >
                <CalendarClock className="w-3 h-3" />
                Onboard
              </button>
            )}
            {inquiry.batch_id && (
              <span className="text-xs px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700 font-medium">
                ✓ In Batch
              </span>
            )}
          </div>
        );
      case 'archived':
        return <div className="flex gap-1 flex-wrap">{baseButtons}</div>;
      
      default:
        return null;
    }
  };

  return (
    <AdminLayout title="Student CRM">
      {/* Header Actions */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Search by name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="student-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm flex-1 sm:flex-none"
            data-testid="assignee-filter"
          >
            <option value="all">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {teamUsers.filter(u => u.is_active).map(u => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          <Button
            onClick={exportStudentCRMToExcel}
            variant="outline"
            className="flex items-center gap-2 flex-1 sm:flex-none justify-center border-slate-300 text-slate-600 hover:bg-slate-50"
            data-testid="export-student-crm-btn"
            disabled={activeSection === 'summer_camp'}
          >
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
            data-testid="add-lead-btn"
          >
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span> Lead
          </Button>
        </div>
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
      {activeSection === 'social_media_intern' ? (
        <SocialMediaInternCRM getAuthHeaders={getAuthHeaders} />
      ) : activeSection === 'summer_camp' ? (
        <div>
          {/* Sub-tabs */}
          <div className="flex gap-2 mb-5">
            {[{ v: 'bookings', l: 'Bookings' }, { v: 'tracking', l: 'Tracking Links' }, { v: 'dashboard', l: 'Dashboard' }].map(t => (
              <button key={t.v} onClick={() => { setCampSubTab(t.v); if (t.v === 'dashboard') fetchCampDashboard(); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${campSubTab === t.v ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {t.l}
              </button>
            ))}
          </div>

          {campSubTab === 'bookings' ? (
            summerCampLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" /></div>
            ) : (
              <>
                {/* Stats Bar — clickable filters */}
                {(() => {
                  const uniqueSources = [...new Set(summerCampBookings.map(b => b.source_name || 'Direct').filter(Boolean))];
                  const uniqueCenters = [...new Set(summerCampBookings.map(b => b.center_label).filter(Boolean))];
                  const kpiCards = [
                    { label: 'All', value: summerCampBookings.length, filterVal: '', color: 'bg-blue-50 border-blue-200 text-blue-700', activeColor: 'bg-blue-600 border-blue-600 text-white' },
                    { label: 'Form Filled', value: summerCampBookings.filter(b => b.crm_status === 'phone_captured').length, filterVal: 'phone_captured', color: 'bg-orange-50 border-orange-200 text-orange-700', activeColor: 'bg-orange-500 border-orange-500 text-white' },
                    { label: 'Leads', value: summerCampBookings.filter(b => b.crm_status === 'lead').length, filterVal: 'lead', color: 'bg-yellow-50 border-yellow-200 text-yellow-700', activeColor: 'bg-yellow-500 border-yellow-500 text-white' },
                    { label: 'Hot Lead', value: summerCampBookings.filter(b => b.crm_status === 'hot_lead').length, filterVal: 'hot_lead', color: 'bg-purple-50 border-purple-200 text-purple-700', activeColor: 'bg-purple-600 border-purple-600 text-white' },
                    { label: '₹500 Reserved', value: summerCampBookings.filter(b => b.crm_status === 'seat_reserved').length, filterVal: 'seat_reserved', color: 'bg-amber-50 border-amber-200 text-amber-700', activeColor: 'bg-amber-500 border-amber-500 text-white' },
                    { label: 'Converted', value: summerCampBookings.filter(b => b.crm_status === 'converted' || b.crm_status === 'payment_offline').length, filterVal: 'converted_all', color: 'bg-green-50 border-green-200 text-green-700', activeColor: 'bg-green-600 border-green-600 text-white' },
                    { label: 'Lost', value: summerCampBookings.filter(b => b.crm_status === 'lost_lead').length, filterVal: 'lost_lead', color: 'bg-red-50 border-red-200 text-red-700', activeColor: 'bg-red-500 border-red-500 text-white' },
                  ];
                  const filteredCampBookings = summerCampBookings.filter(b => {
                    // Search filter (name, phone, booking_ref)
                    if (campSearch.trim()) {
                      const q = campSearch.trim().toLowerCase();
                      const matchSearch =
                        b.child_name?.toLowerCase().includes(q) ||
                        b.parent_name?.toLowerCase().includes(q) ||
                        b.parent_phone?.includes(campSearch.trim()) ||
                        b.booking_ref?.toLowerCase().includes(q);
                      if (!matchSearch) return false;
                    }
                    if (campFilters.status) {
                      if (campFilters.status === 'converted_all') {
                        if (b.crm_status !== 'converted' && b.crm_status !== 'payment_offline' && b.crm_status !== 'seat_reserved') return false;
                      } else if (b.crm_status !== campFilters.status) return false;
                    }
                    if (campFilters.center && b.center_label !== campFilters.center) return false;
                    if (campFilters.source) {
                      const src = b.source_name || 'Direct';
                      if (src !== campFilters.source) return false;
                    }
                    return true;
                  });
                  const setFilter = (key, val) => setCampFilters(prev => ({ ...prev, [key]: val }));

                  return (
                    <>
                      {/* KPI cards + Export button row */}
                      <div className="mb-4">
                        {/* Scrollable KPI cards */}
                        <div className="flex gap-2 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none' }}>
                          {kpiCards.map(k => {
                            const isActive = campFilters.status === k.filterVal;
                            return (
                              <button
                                key={k.label}
                                onClick={() => setFilter('status', isActive ? '' : k.filterVal)}
                                className={`rounded-xl border px-3 py-2.5 text-center transition-all flex flex-col items-center gap-0.5 shrink-0 ${isActive ? k.activeColor + ' shadow-md' : k.color + ' hover:opacity-80'}`}
                                style={{ minWidth: 80 }}
                              >
                                <div className="text-xl font-bold leading-tight">{k.value}</div>
                                <div className="text-[11px] font-semibold whitespace-nowrap flex items-center gap-0.5">
                                  {k.label}
                                  <ChevronDown className={`w-3 h-3 transition-transform ${isActive ? 'rotate-180' : ''}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {/* Action buttons row */}
                        <div className="flex items-center gap-2">
                          <Button
                            onClick={() => exportSummerCampToExcel(filteredCampBookings)}
                            variant="outline"
                            className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 shrink-0"
                            data-testid="export-summer-camp-btn"
                          >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">Export</span> ({filteredCampBookings.length})
                          </Button>
                          <Button
                            onClick={() => { setShowImportModal(true); setImportFile(null); setImportPreview([]); setImportResult(null); }}
                            variant="outline"
                            className="flex items-center gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 shrink-0"
                            data-testid="import-summer-camp-btn"
                          >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Import</span>
                          </Button>
                          <Button
                            onClick={() => setShowAddLeadModal(true)}
                            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white shrink-0"
                            data-testid="add-individual-lead-btn"
                          >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Add Lead</span>
                          </Button>
                        </div>
                      </div>

                      {/* Filter dropdowns */}
                      <div className="flex flex-wrap gap-3 mb-5">
                        {/* Search box */}
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={campSearch}
                            onChange={e => setCampSearch(e.target.value)}
                            placeholder="Search name / phone..."
                            className="h-8 pl-8 pr-8 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-300 w-48"
                            data-testid="camp-search-input"
                          />
                          {campSearch && (
                            <button onClick={() => setCampSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <select
                          value={campFilters.status}
                          onChange={e => setFilter('status', e.target.value)}
                          className="text-xs h-8 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">All Statuses</option>
                          <option value="phone_captured">Form Filled</option>
                          <option value="lead">Lead</option>
                          <option value="hot_lead">Hot Lead</option>
                          <option value="converted_all">Converted (All)</option>
                      <option value="seat_reserved">₹500 Reserved</option>
                          <option value="converted">Paid Online</option>
                          <option value="payment_offline">Cash at Center</option>
                          <option value="lost_lead">Lost</option>
                        </select>

                        <select
                          value={campFilters.batch}
                          onChange={e => setFilter('batch', e.target.value)}
                          className="text-xs h-8 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">All Batches</option>
                          <option value="week1">Batch 1 — May 4-8</option>
                          <option value="week2">Batch 2 — May 11-15</option>
                          <option value="week3">Batch 3 — May 18-22</option>
                          <option value="week4">Batch 4 — May 25-29</option>
                        </select>

                        <select
                          value={campFilters.center}
                          onChange={e => setFilter('center', e.target.value)}
                          className="text-xs h-8 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">All Centers</option>
                          {uniqueCenters.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                          value={campFilters.source}
                          onChange={e => setFilter('source', e.target.value)}
                          className="text-xs h-8 px-3 border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                        >
                          <option value="">All Sources</option>
                          {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

                        {(campFilters.status || campFilters.batch || campFilters.center || campFilters.source || campSearch) && (
                          <button
                            onClick={() => { setCampFilters({ status: '', batch: '', center: '', source: '' }); setCampSearch(''); }}
                            className="text-xs h-8 px-3 border border-red-200 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" /> Clear All
                          </button>
                        )}

                        <span className="ml-auto text-xs text-slate-400 self-center">
                          {filteredCampBookings.length} of {summerCampBookings.length} shown
                        </span>
                      </div>

                      {filteredCampBookings.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                          <p className="text-slate-500">No bookings match the selected filters</p>
                        </div>
                      ) : (
                        <>
                          {/* ── Mobile card view (< md) ── */}
                          <div className="flex flex-col gap-3 md:hidden">
                            {filteredCampBookings.map(booking => (
                              <div key={booking.id} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm" data-testid={`camp-booking-${booking.id}`}>
                                {/* Header row */}
                                <div className="flex items-start justify-between gap-2 mb-3">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold text-[#1E3A5F] text-base">
                                        {booking.child_name || <span className="text-slate-400 italic">—</span>}
                                      </span>
                                      {booking.return_count > 1 && (
                                        <span title={`Filled the form ${booking.return_count} times`} className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200" data-testid={`return-badge-${booking.id}`}>×{booking.return_count}</span>
                                      )}
                                    </div>
                                    <div className="text-xs text-slate-400 font-mono mt-0.5">{booking.booking_ref}</div>
                                  </div>
                                  <button
                                    onClick={() => setCampStatusModal(booking)}
                                    data-testid={`camp-status-${booking.id}`}
                                    className={`text-xs px-2.5 py-1 rounded-full font-bold cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap shrink-0 ${
                                      booking.crm_status === 'converted' ? 'bg-green-50 text-green-700' :
                                      booking.crm_status === 'seat_reserved' ? 'bg-amber-50 text-amber-700' :
                                      booking.crm_status === 'payment_offline' ? 'bg-teal-50 text-teal-700' :
                                      booking.crm_status === 'hot_lead' ? 'bg-purple-50 text-purple-700' :
                                      booking.crm_status === 'phone_captured' ? 'bg-orange-50 text-orange-700' :
                                      booking.crm_status === 'lost_lead' ? 'bg-red-50 text-red-700' :
                                      'bg-yellow-50 text-yellow-700'
                                    }`}
                                  >
                                    {booking.crm_status === 'converted' ? 'Paid Online' :
                                     booking.crm_status === 'seat_reserved' ? '₹500 Reserved' :
                                     booking.crm_status === 'payment_offline' ? 'Pay at Center' :
                                     booking.crm_status === 'hot_lead' ? 'Hot Lead' :
                                     booking.crm_status === 'phone_captured' ? 'Form Filled' :
                                     booking.crm_status === 'lost_lead' ? 'Lost' : 'Lead'}
                                  </button>
                                </div>
                                {/* Details grid */}
                                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs mb-3">
                                  <div>
                                    <span className="text-slate-400 block">Parent</span>
                                    <span className="text-slate-700 font-medium">{booking.parent_name || '—'}</span>
                                    <span className="text-slate-400 block">{booking.parent_phone}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Center</span>
                                    <span className="text-slate-700 font-medium">{booking.center_label}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Batch</span>
                                    <span className="text-slate-700">{booking.batch_dates}</span>
                                  </div>
                                  <div>
                                    <span className="text-slate-400 block">Age Group</span>
                                    <span className="text-slate-700">Ages {booking.age_group_ages}</span>
                                  </div>
                                </div>
                                {/* Tags row */}
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${booking.payment_mode === 'cash' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {booking.payment_mode === 'cash' ? 'Cash' : 'Online'}
                                  </span>
                                  {booking.source_name && booking.source_name !== 'Direct' && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-semibold">{booking.source_name}</span>
                                  )}
                                  <span className="text-xs text-slate-400 capitalize">{booking.batch_type}</span>
                                  <span className="text-xs text-slate-400 ml-auto">{new Date(booking.created_at).toLocaleDateString('en-IN')}</span>
                                </div>
                                {/* Followup status inline select */}
                                <div className="mb-2">
                                  <select
                                    value={booking.followup_status || 'not_contacted'}
                                    onChange={e => {
                                      const val = e.target.value;
                                      if (val === 'callback_requested') {
                                        setCampCallbackModal({ bookingId: booking.id, pendingStatus: val });
                                        setCampCallbackDate(''); setCampCallbackTime('');
                                      } else {
                                        handleFollowupStatusChange(booking.id, val);
                                      }
                                    }}
                                    className={`w-full text-xs font-semibold px-2 py-1.5 rounded-lg border-0 cursor-pointer outline-none ${getFollowupStyle(booking.followup_status || 'not_contacted').color}`}
                                  >
                                    {FOLLOWUP_STATUSES.map(s => (
                                      <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                  </select>
                                </div>
                                {/* Last comment preview */}
                                {booking.comments?.length > 0 && (
                                  <div className="mb-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border-l-2 border-slate-200">
                                    <div className="flex items-center gap-1 mb-0.5">
                                      {booking.comments[booking.comments.length - 1].comment_type === 'call_done' ? (
                                        <Phone className="w-3 h-3 text-green-500 shrink-0" />
                                      ) : (
                                        <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                                      )}
                                      <span className="text-[10px] text-slate-400">{new Date(booking.comments[booking.comments.length - 1].created_at).toLocaleDateString('en-IN')}</span>
                                    </div>
                                    <p className="text-xs text-slate-600 line-clamp-1">{booking.comments[booking.comments.length - 1].text}</p>
                                  </div>
                                )}
                                {/* Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-50">
                                  <button title="Edit" data-testid={`camp-edit-${booking.id}`} onClick={() => { setCampEditModal(booking); setCampEditData({ child_name: booking.child_name || '', parent_name: booking.parent_name || '', parent_phone: booking.parent_phone || '', parent_email: booking.parent_email || '' }); }} className="flex-1 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors flex items-center justify-center gap-1 text-xs font-medium">
                                    <Edit className="w-3.5 h-3.5" /> Edit
                                  </button>
                                  {booking.parent_phone && (
                                    <a href={`tel:${booking.parent_phone}`} title="Call parent" className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors flex items-center justify-center" data-testid={`camp-call-${booking.id}`}>
                                      <Phone className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                  <button title="Comments" data-testid={`camp-comment-${booking.id}`} onClick={() => { setCampCommentModal(booking); setCampNewComment(''); setCampCommentTab('comment'); setCampCallDate(new Date().toISOString().split('T')[0]); setCampCallTime(new Date().toTimeString().slice(0,5)); setCampCallComment(''); }} className="flex-1 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors flex items-center justify-center gap-1 text-xs font-medium relative">
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    Comments
                                    {(booking.comments?.length > 0) && (
                                      <span className="bg-indigo-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{booking.comments.length}</span>
                                    )}
                                  </button>
                                  <button title="Delete" data-testid={`camp-delete-${booking.id}`} onClick={() => setCampDeleteModal(booking)} className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                  {booking.order_id && booking.crm_status !== 'converted' && booking.crm_status !== 'seat_reserved' && (
                                    <button title="Force-verify Cashfree payment" data-testid={`camp-verify-${booking.id}`} onClick={() => handleForceVerify(booking.id)} className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* ── Desktop table view (>= md) ── */}
                          <div className="hidden md:block overflow-x-auto bg-white rounded-2xl border border-slate-100">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide">
                                <th className="px-4 py-3 text-left">Ref</th>
                                <th className="px-4 py-3 text-left">Date</th>
                                <th className="px-4 py-3 text-left">Child</th>
                                <th className="px-4 py-3 text-left">Parent</th>
                                <th className="px-4 py-3 text-left">Age Group</th>
                                <th className="px-4 py-3 text-left">Batch</th>
                                <th className="px-4 py-3 text-left">Center</th>
                                <th className="px-4 py-3 text-left">Payment</th>
                                <th className="px-4 py-3 text-left">Source</th>
                                <th className="px-4 py-3 text-left">Status</th>
                                <th className="px-4 py-3 text-left">Follow-up</th>
                                <th className="px-4 py-3 text-left">Last Activity</th>
                                <th className="px-4 py-3 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredCampBookings.map(booking => (
                                <tr key={booking.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors" data-testid={`camp-booking-${booking.id}`}>
                                  <td className="px-4 py-3 font-mono text-xs text-slate-600 font-bold">{booking.booking_ref}</td>
                                  <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">
                                    {new Date(booking.created_at).toLocaleDateString('en-IN')}
                                  </td>
                                  <td className="px-4 py-3 font-semibold text-[#1E3A5F]">
                                    <div className="flex items-center gap-1.5">
                                      {booking.child_name || <span className="text-slate-400 italic">—</span>}
                                      {booking.return_count > 1 && (
                                        <span
                                          title={`Filled the form ${booking.return_count} times`}
                                          className="inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200"
                                          data-testid={`return-badge-${booking.id}`}
                                        >
                                          ×{booking.return_count}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-slate-700">{booking.parent_name || '—'}</div>
                                    <div className="text-xs text-slate-400">{booking.parent_phone}</div>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                                      Ages {booking.age_group_ages}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="text-xs whitespace-nowrap">{booking.batch_dates}</div>
                                    <div className="text-xs text-slate-400 capitalize">{booking.batch_type}</div>
                                  </td>
                                  <td className="px-4 py-3 text-xs text-slate-600">{booking.center_label}</td>
                                  <td className="px-4 py-3">
                                    <span className={`text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap ${booking.payment_mode === 'cash' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
                                      {booking.payment_mode === 'cash' ? 'Cash' : 'Online'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {booking.source_name && booking.source_name !== 'Direct' ? (
                                      <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-700 font-semibold whitespace-nowrap">
                                        {booking.source_name}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400">Direct</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <button
                                      onClick={() => setCampStatusModal(booking)}
                                      data-testid={`camp-status-${booking.id}`}
                                      className={`text-xs px-2 py-1 rounded-full font-bold cursor-pointer hover:opacity-80 transition-opacity whitespace-nowrap ${
                                        booking.crm_status === 'converted' ? 'bg-green-50 text-green-700' :
                                        booking.crm_status === 'seat_reserved' ? 'bg-amber-50 text-amber-700' :
                                        booking.crm_status === 'payment_offline' ? 'bg-teal-50 text-teal-700' :
                                        booking.crm_status === 'hot_lead' ? 'bg-purple-50 text-purple-700' :
                                        booking.crm_status === 'phone_captured' ? 'bg-orange-50 text-orange-700' :
                                        booking.crm_status === 'lost_lead' ? 'bg-red-50 text-red-700' :
                                        'bg-yellow-50 text-yellow-700'
                                      }`}
                                    >
                                      {booking.crm_status === 'converted' ? 'Paid Online' :
                                       booking.crm_status === 'seat_reserved' ? '₹500 Reserved' :
                                       booking.crm_status === 'payment_offline' ? 'Pay at Center' :
                                       booking.crm_status === 'hot_lead' ? 'Hot Lead' :
                                       booking.crm_status === 'phone_captured' ? 'Form Filled' :
                                       booking.crm_status === 'lost_lead' ? 'Lost' : 'Lead'}
                                    </button>
                                  </td>
                            <td className="px-4 py-3">
                              {/* Follow-up status inline dropdown */}
                              <select
                                value={booking.followup_status || 'not_contacted'}
                                data-testid={`followup-status-${booking.id}`}
                                onChange={e => {
                                  const val = e.target.value;
                                  if (val === 'callback_requested') {
                                    setCampCallbackModal({ bookingId: booking.id, pendingStatus: val });
                                    setCampCallbackDate(''); setCampCallbackTime('');
                                  } else {
                                    handleFollowupStatusChange(booking.id, val);
                                  }
                                }}
                                className={`text-xs font-semibold px-2 py-1 rounded-full border-0 cursor-pointer outline-none ${getFollowupStyle(booking.followup_status || 'not_contacted').color}`}
                                style={{ minWidth: 130 }}
                              >
                                {FOLLOWUP_STATUSES.map(s => (
                                  <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3 max-w-[150px]">
                              {booking.comments?.length > 0 ? (
                                <div>
                                  <div className="flex items-center gap-1 mb-0.5">
                                    {booking.comments[booking.comments.length - 1].comment_type === 'call_done' ? (
                                      <Phone className="w-3 h-3 text-green-500 shrink-0" />
                                    ) : (
                                      <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                                    )}
                                    <span className="text-[10px] text-slate-400">{new Date(booking.comments[booking.comments.length - 1].created_at).toLocaleDateString('en-IN')}</span>
                                  </div>
                                  <p className="text-xs text-slate-600 truncate max-w-[140px]">{booking.comments[booking.comments.length - 1].text}</p>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1 justify-center">
                                <button
                                  title="Edit"
                                  data-testid={`camp-edit-${booking.id}`}
                                  onClick={() => { setCampEditModal(booking); setCampEditData({ child_name: booking.child_name || '', parent_name: booking.parent_name || '', parent_phone: booking.parent_phone || '', parent_email: booking.parent_email || '' }); }}
                                  className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {booking.parent_phone && (
                                  <a href={`tel:${booking.parent_phone}`} title="Call parent" data-testid={`camp-call-${booking.id}`} className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors">
                                    <Phone className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  title="Comments / Call Log"
                                  data-testid={`camp-comment-${booking.id}`}
                                  onClick={() => { setCampCommentModal(booking); setCampNewComment(''); setCampCommentTab('comment'); setCampCallDate(new Date().toISOString().split('T')[0]); setCampCallTime(new Date().toTimeString().slice(0,5)); setCampCallComment(''); }}
                                  className="p-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors relative"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                  {(booking.comments?.length > 0) && (
                                    <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[9px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold">{booking.comments.length}</span>
                                  )}
                                </button>
                                <button
                                  title="Delete"
                                  data-testid={`camp-delete-${booking.id}`}
                                  onClick={() => setCampDeleteModal(booking)}
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                {booking.order_id && booking.crm_status !== 'converted' && (
                                  <button
                                    title="Force-verify Cashfree payment"
                                    data-testid={`camp-verify-${booking.id}`}
                                    onClick={() => handleForceVerify(booking.id)}
                                    className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                            </tbody>
                          </table>
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )
          ) : campSubTab === 'dashboard' ? (
            /* ── Dashboard Tab ── */
            campDashboardLoading ? (
              <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto" /></div>
            ) : !campDashboard ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                <p className="text-slate-500">No data available</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* KPI cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Registrations', value: campDashboard.total_bookings, color: 'bg-blue-50 border-blue-200 text-blue-700' },
                    { label: 'Hot Leads', value: campDashboard.hot_leads || 0, color: 'bg-purple-50 border-purple-200 text-purple-700' },
                    { label: 'Converted (Total)', value: campDashboard.converted, color: 'bg-green-50 border-green-200 text-green-700', sub: `${campDashboard.converted_online || 0} online · ${campDashboard.converted_offline || 0} cash` },
                    { label: 'Online Revenue', value: `₹${(campDashboard.total_revenue || 0).toLocaleString()}`, color: 'bg-orange-50 border-orange-200 text-orange-700' },
                  ].map(k => (
                    <div key={k.label} className={`rounded-xl border p-5 text-center ${k.color}`}>
                      <div className="text-3xl font-bold">{k.value}</div>
                      <div className="text-xs font-medium mt-1">{k.label}</div>
                      {k.sub && <div className="text-xs opacity-70 mt-0.5">{k.sub}</div>}
                    </div>
                  ))}
                </div>

                {/* Conversion Funnel */}
                {campDashboard.funnel && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h3 className="font-bold text-[#1E3A5F] text-base mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-orange-500" /> Conversion Funnel
                    </h3>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Registrations */}
                      <div className="flex-1 min-w-[90px] text-center bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <div className="text-2xl font-bold text-blue-700">{campDashboard.funnel.registrations}</div>
                        <div className="text-xs font-semibold text-blue-600 mt-1">Registrations</div>
                      </div>
                      {/* Arrow + ratio */}
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-semibold">{campDashboard.funnel.reg_to_hot_pct}%</div>
                        <div className="text-slate-300 text-lg">→</div>
                      </div>
                      {/* Hot Leads */}
                      <div className="flex-1 min-w-[90px] text-center bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <div className="text-2xl font-bold text-purple-700">{campDashboard.funnel.hot_leads}</div>
                        <div className="text-xs font-semibold text-purple-600 mt-1">Hot Leads</div>
                      </div>
                      {/* Arrow + ratio */}
                      <div className="text-center">
                        <div className="text-xs text-slate-400 font-semibold">{campDashboard.funnel.hot_to_conv_pct}%</div>
                        <div className="text-slate-300 text-lg">→</div>
                      </div>
                      {/* Converted */}
                      <div className="flex-1 min-w-[90px] text-center bg-green-50 border border-green-200 rounded-xl p-4">
                        <div className="text-2xl font-bold text-green-700">{campDashboard.funnel.converted}</div>
                        <div className="text-xs font-semibold text-green-600 mt-1">Converted</div>
                        <div className="text-xs text-green-500 mt-0.5">{campDashboard.funnel.reg_to_conv_pct}% of reg.</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Age Group Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-bold text-[#1E3A5F] text-base mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-orange-500" />Revenue by Age Group</h3>
                  <div className="divide-y divide-slate-50">
                    {campDashboard.age_summary?.map(ag => (
                      <div key={ag.age_group} className="flex items-center justify-between py-3">
                        <div className="text-sm font-semibold text-slate-700">{ag.label}</div>
                        <div className="text-base font-bold text-green-600">₹{ag.revenue.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Follow-up Status Breakdown */}
                {campDashboard.followup_status && (
                  <div className="bg-white rounded-2xl border border-slate-100 p-5">
                    <h3 className="font-bold text-[#1E3A5F] text-base mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-500" />Follow-up Status
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {FOLLOWUP_STATUSES.map(fs => {
                        const count = campDashboard.followup_status[fs.value] || 0;
                        const total = campDashboard.total_bookings || 1;
                        const pct = Math.round((count / total) * 100);
                        return (
                          <div key={fs.value} className={`rounded-xl p-3 ${fs.color} border`} style={{ borderColor: `${fs.dot}30` }}>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: fs.dot }} />
                              <span className="text-xs font-semibold">{fs.label}</span>
                            </div>
                            <div className="text-2xl font-bold mb-0.5">{count}</div>
                            <div className="text-xs opacity-70">{pct}% of leads</div>
                            <div className="mt-2 h-1.5 rounded-full bg-black/10 overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fs.dot }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Batch Stats — Center sub-tabs + Week × Age Group */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5">
                  <h3 className="font-bold text-[#1E3A5F] text-base mb-3 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-orange-500" />Batch Breakdown — 10 spots per batch per center
                  </h3>

                  {/* Center Sub-Tabs */}
                  {campDashboard.centers?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-5 border-b border-slate-100 pb-3">
                      <button
                        onClick={() => setSelectedDashCenter(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedDashCenter === null ? 'bg-[#1E3A5F] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        All Centers
                      </button>
                      {campDashboard.centers.map(c => (
                        <button
                          key={c}
                          onClick={() => setSelectedDashCenter(c)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedDashCenter === c ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                          {c.replace('OLL ', '').replace(' Center', '')}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-6">
                    {campDashboard.weeks?.map((wk) => {
                      // When a center is selected, compute total registrations for that center this week
                      const wkTotal = selectedDashCenter
                        ? Object.values(wk.age_groups).reduce((s, ag) => s + (ag.by_center?.[selectedDashCenter]?.total ?? 0), 0)
                        : Object.values(wk.age_groups).reduce((s, ag) => s + ag.total, 0);

                      return (
                        <div key={wk.week} className="border border-slate-100 rounded-xl overflow-hidden">
                          {/* Week header */}
                          <div className="bg-slate-50 px-4 py-2.5 flex items-center gap-3 border-b border-slate-100">
                            <span className="font-bold text-[#1E3A5F] text-sm">{wk.week_label}</span>
                            <span className="text-xs text-slate-500 font-mono">{wk.dates}</span>
                            <span className="ml-auto text-xs text-slate-400">{wkTotal} total registrations</span>
                          </div>
                          {/* Age group rows */}
                          <div className="divide-y divide-slate-50">
                            {Object.entries(wk.age_groups).map(([agKey, ag]) => {
                              // Use per-center stats if a center is selected
                              const stats = selectedDashCenter
                                ? (ag.by_center?.[selectedDashCenter] ?? { total: 0, converted: 0, leads: 0, phone_captured: 0, lost: 0, spots_left: 10 })
                                : ag;
                              const spotsTotal = 10;
                              const spotsLeft = selectedDashCenter
                                ? (spotsTotal - (stats.converted ?? 0))
                                : ag.spots_left;
                              const fillPct = Math.round(((stats.converted ?? 0) / spotsTotal) * 100);

                              return (
                                <div key={agKey} className="px-4 py-3 flex flex-wrap items-center gap-3">
                                  {/* Age group label */}
                                  <div className="w-44 shrink-0">
                                    <div className="text-sm font-semibold text-slate-700">Ages {ag.ages}</div>
                                  </div>
                                  {/* Spot fill bar */}
                                  <div className="flex-1 min-w-36">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-slate-500">{stats.converted ?? 0}/{spotsTotal} confirmed</span>
                                      <span className={`text-xs font-bold ml-auto ${spotsLeft <= 2 ? 'text-red-500' : spotsLeft <= 5 ? 'text-yellow-600' : 'text-green-600'}`}>
                                        {spotsLeft} spots left
                                      </span>
                                    </div>
                                    <div className="bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div className="h-2 rounded-full bg-orange-400 transition-all" style={{ width: `${fillPct}%` }} />
                                    </div>
                                  </div>
                                  {/* Stage badges */}
                                  <div className="flex gap-1 shrink-0">
                                    {(stats.leads ?? 0) > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-700 font-semibold">{stats.leads} lead</span>}
                                    {(stats.phone_captured ?? 0) > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-semibold">{stats.phone_captured} form</span>}
                                    {(stats.lost ?? 0) > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-500 font-semibold">{stats.lost} lost</span>}
                                  </div>
                                  {/* Center breakdown — only show in "All Centers" view */}
                                  {!selectedDashCenter && Object.keys(ag.by_center).length > 0 && (
                                    <div className="flex flex-wrap gap-1 w-full mt-1">
                                      {Object.entries(ag.by_center).sort((a, b) => b[1].total - a[1].total).map(([center, cd]) => (
                                        <button
                                          key={center}
                                          onClick={() => setSelectedDashCenter(center)}
                                          className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors"
                                          title={`Click to filter by ${center}`}
                                        >
                                          {center.replace('OLL ', '').replace(' Center', '')} <strong>{cd.total}</strong>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )
          ) : (
            /* ── Tracking Links Tab ── */
            <div>
              {/* Create link */}
              <div className="bg-white rounded-2xl border border-slate-100 p-5 mb-6">
                <h3 className="font-bold text-[#1E3A5F] text-base mb-3">Create Tracking Link</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={newLinkName}
                    onChange={e => setNewLinkName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && createTrackingLink()}
                    placeholder="e.g. Instagram Bio, WhatsApp Campaign, Newspaper Ad"
                    className="flex-1 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                    data-testid="new-tracking-link-input"
                  />
                  <button
                    onClick={createTrackingLink}
                    disabled={creatingLink || !newLinkName.trim()}
                    className="bg-orange-500 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    data-testid="create-tracking-link-btn"
                  >
                    {creatingLink ? 'Creating...' : 'Create Link'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2">A unique URL will be generated that tracks views, leads, and paid bookings from that source.</p>
              </div>

              {/* Links table */}
              {trackingLinksLoading ? (
                <div className="text-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500 mx-auto" /></div>
              ) : trackingLinks.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                  <p className="text-slate-500">No tracking links yet. Create one above.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-500 text-xs uppercase tracking-wide bg-slate-50">
                        <th className="px-4 py-3 text-left">Name</th>
                        <th className="px-4 py-3 text-left">Link</th>
                        <th className="px-4 py-3 text-center">Views</th>
                        <th className="px-4 py-3 text-center">Leads</th>
                        <th className="px-4 py-3 text-center">Conversions</th>
                        <th className="px-4 py-3 text-center">Conv. Rate</th>
                        <th className="px-4 py-3 text-left">Created</th>
                        <th className="px-4 py-3 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trackingLinks.map(link => {
                        const trackUrl = `${window.location.origin}/summer-camp?ref=${link.slug}`;
                        const convRate = link.leads > 0 ? Math.round((link.conversions / link.leads) * 100) : 0;
                        return (
                          <tr key={link.id} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="px-4 py-3 font-semibold text-[#1E3A5F]">{link.name}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-mono truncate max-w-[200px]">/summer-camp?ref={link.slug}</span>
                                <button
                                  onClick={() => { navigator.clipboard.writeText(trackUrl); toast.success('Link copied!'); }}
                                  className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-medium text-slate-600 transition-colors whitespace-nowrap"
                                  data-testid={`copy-link-${link.id}`}
                                >
                                  Copy
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center font-bold text-slate-700">{link.views}</td>
                            <td className="px-4 py-3 text-center font-bold text-yellow-600">{link.leads}</td>
                            <td className="px-4 py-3 text-center font-bold text-green-600">{link.conversions}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-xs font-bold px-2 py-1 rounded-full ${convRate >= 10 ? 'bg-green-50 text-green-700' : convRate > 0 ? 'bg-yellow-50 text-yellow-700' : 'bg-slate-100 text-slate-500'}`}>
                                {convRate}%
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-400">{new Date(link.created_at).toLocaleDateString('en-IN')}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => deleteTrackingLink(link.id)}
                                className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                                data-testid={`delete-link-${link.id}`}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Edit Booking Modal ── */}
          {campEditModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">Edit Booking</h3>
                  <button onClick={() => setCampEditModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: "Child's Name", key: 'child_name' },
                    { label: "Parent's Name", key: 'parent_name' },
                    { label: "Phone Number", key: 'parent_phone' },
                    { label: "Email", key: 'parent_email' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{f.label}</label>
                      <input
                        type="text"
                        value={campEditData[f.key] || ''}
                        onChange={e => setCampEditData(prev => ({ ...prev, [f.key]: e.target.value }))}
                        className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid={`edit-${f.key}`}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 mt-6">
                  <button onClick={() => setCampEditModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={handleEditBooking} disabled={campSaving} data-testid="save-edit-btn"
                    className="flex-1 bg-orange-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors disabled:opacity-50">
                    {campSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Delete Booking Modal ── */}
          {campDeleteModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-bold text-slate-800 text-lg mb-2">Delete Booking?</h3>
                <p className="text-slate-500 text-sm mb-5">
                  This will permanently delete the booking for <strong>{campDeleteModal.child_name || 'this lead'}</strong>. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setCampDeleteModal(null)} className="flex-1 border border-slate-200 text-slate-600 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors">Cancel</button>
                  <button onClick={handleDeleteBooking} disabled={campSaving} data-testid="confirm-delete-btn"
                    className="flex-1 bg-red-500 text-white py-2 rounded-xl text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50">
                    {campSaving ? 'Deleting...' : 'Yes, Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Status Update Modal ── */}
          {campStatusModal && !campLostReasonModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-5">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">Update Lead Stage</h3>
                  <button onClick={() => setCampStatusModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-slate-500 mb-4">{campStatusModal.child_name || 'Lead'} — {campStatusModal.parent_phone}</p>
                <div className="space-y-2">
                  {[
                    { v: 'phone_captured', l: 'Form Filled', desc: 'Phone number captured', color: 'border-orange-300 bg-orange-50 text-orange-700' },
                    { v: 'lead', l: 'Lead Captured', desc: 'Full details submitted', color: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
                    { v: 'hot_lead', l: 'Hot Lead', desc: 'Interested — likely to convert', color: 'border-purple-300 bg-purple-50 text-purple-700' },
                    { v: 'seat_reserved', l: '₹500 Reserved', desc: '₹500 deposit paid — balance at center', color: 'border-amber-300 bg-amber-50 text-amber-700' },
                    { v: 'converted', l: 'Paid Online', desc: 'Full ₹1,999 payment completed', color: 'border-green-300 bg-green-50 text-green-700' },
                    { v: 'payment_offline', l: 'Pay at Center', desc: 'Cash payment at center', color: 'border-teal-300 bg-teal-50 text-teal-700' },
                    { v: 'lost_lead', l: 'Lost Lead', desc: 'Not interested / lost', color: 'border-red-300 bg-red-50 text-red-700' },
                  ].map(s => (
                    <button
                      key={s.v}
                      data-testid={`status-option-${s.v}`}
                      onClick={() => {
                        if (s.v === 'lost_lead') {
                          setCampLostReasonModal({ bookingId: campStatusModal.id });
                          setCampLostReason('');
                        } else {
                          handleUpdateStatus(campStatusModal.id, s.v);
                        }
                      }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                        campStatusModal.crm_status === s.v ? s.color + ' border-current' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">{s.l}</div>
                        <div className="text-xs text-slate-500">{s.desc}</div>
                      </div>
                      {campStatusModal.crm_status === s.v && <Check className="w-4 h-4 text-current" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Lost Reason Modal ── */}
          {campLostReasonModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">Reason for Loss</h3>
                  <button onClick={() => { setCampLostReasonModal(null); setCampLostReason(''); }} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-sm text-slate-500 mb-4">Select the reason this lead was lost:</p>
                <div className="space-y-2 mb-5">
                  {[
                    { v: 'phone_not_picking', l: 'Phone not picking' },
                    { v: 'not_available_dates', l: 'Not available during dates' },
                    { v: 'location_too_far', l: 'Location too far' },
                    { v: 'other', l: 'Other' },
                  ].map(r => (
                    <button
                      key={r.v}
                      data-testid={`lost-reason-${r.v}`}
                      onClick={() => setCampLostReason(r.v)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                        campLostReason === r.v ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{r.l}</span>
                      {campLostReason === r.v && <Check className="w-4 h-4 text-red-500" />}
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setCampLostReasonModal(null); setCampLostReason(''); }}
                    className="flex-1 h-10 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50"
                  >Back</button>
                  <button
                    data-testid="confirm-lost-lead"
                    disabled={!campLostReason}
                    onClick={() => handleUpdateStatus(campLostReasonModal.bookingId, 'lost_lead', campLostReason)}
                    className="flex-1 h-10 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-40 hover:bg-red-600 transition-colors"
                  >Mark as Lost</button>
                </div>
              </div>
            </div>
          )}

          {/* ── Comments / Call Log Modal ── */}
          {campCommentModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-[#1E3A5F] text-lg">Activity Log</h3>
                  <button onClick={() => setCampCommentModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-slate-500 mb-3 font-semibold">{campCommentModal.child_name || 'Lead'} · {campCommentModal.parent_phone}</p>
                {/* Comments list */}
                <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
                  {(!campCommentModal.comments || campCommentModal.comments.length === 0) ? (
                    <p className="text-center text-slate-400 text-sm py-4">No activity yet</p>
                  ) : (
                    [...campCommentModal.comments].reverse().map(c => (
                      <div key={c.id} className={`rounded-xl p-3 ${c.comment_type === 'call_done' ? 'bg-green-50 border border-green-100' : 'bg-slate-50'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <div className="flex items-center gap-1.5">
                            {c.comment_type === 'call_done' ? (
                              <Phone className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="text-xs font-semibold text-slate-700">{c.author}</span>
                            {c.comment_type === 'call_done' && c.call_date && (
                              <span className="text-xs text-green-600 font-medium">{c.call_date} {c.call_time || ''}</span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString('en-IN')}</span>
                        </div>
                        <p className="text-sm text-slate-600">{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                {/* Tabs */}
                <div className="flex rounded-xl bg-slate-100 p-1 mb-4">
                  <button
                    onClick={() => setCampCommentTab('comment')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${campCommentTab === 'comment' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                  >
                    Add Comment
                  </button>
                  <button
                    onClick={() => setCampCommentTab('call')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors ${campCommentTab === 'call' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500'}`}
                  >
                    Log Call
                  </button>
                </div>
                {campCommentTab === 'comment' ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={campNewComment}
                      onChange={e => setCampNewComment(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCampComment()}
                      placeholder="Add a comment..."
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
                      data-testid="new-comment-input"
                    />
                    <button
                      onClick={handleAddCampComment}
                      disabled={campSaving || !campNewComment.trim()}
                      data-testid="add-comment-btn"
                      className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-orange-600 transition-colors"
                    >
                      {campSaving ? '...' : 'Post'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Call Date</label>
                        <input
                          type="date"
                          value={campCallDate}
                          onChange={e => setCampCallDate(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                          data-testid="call-date-input"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs text-slate-500 mb-1 block">Call Time</label>
                        <input
                          type="time"
                          value={campCallTime}
                          onChange={e => setCampCallTime(e.target.value)}
                          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                          data-testid="call-time-input"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={campCallComment}
                        onChange={e => setCampCallComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddCallLog()}
                        placeholder="Notes about the call..."
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                        data-testid="call-comment-input"
                      />
                      <button
                        onClick={handleAddCallLog}
                        disabled={campSaving || !campCallComment.trim()}
                        data-testid="log-call-btn"
                        className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 hover:bg-green-700 transition-colors flex items-center gap-1.5"
                      >
                        <Phone className="w-4 h-4" />
                        {campSaving ? '...' : 'Log'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Callback Date Modal ── */}
          {campCallbackModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-[#1E3A5F] text-base">Schedule Callback</h3>
                  <button onClick={() => setCampCallbackModal(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>
                <p className="text-xs text-slate-500 mb-4">When should we call back?</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Date</label>
                    <input type="date" value={campCallbackDate} onChange={e => setCampCallbackDate(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Time (optional)</label>
                    <input type="time" value={campCallbackTime} onChange={e => setCampCallbackTime(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm" />
                  </div>
                  <button
                    onClick={async () => {
                      await handleFollowupStatusChange(campCallbackModal.bookingId, 'callback_requested', campCallbackDate, campCallbackTime);
                      setCampCallbackModal(null);
                    }}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Confirm Callback
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Bulk Import Modal ── */}
          {showImportModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowImportModal(false); }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Bulk Import Leads</h3>
                    <p className="text-sm text-slate-500 mt-0.5">Upload an XLSX file to import Summer Camp leads</p>
                  </div>
                  <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-5 space-y-5">
                  {/* Step 1: Download sample */}
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="font-semibold text-blue-900 text-sm">Step 1 — Download Sample File</p>
                        <p className="text-xs text-blue-600 mt-1">Only <code className="bg-blue-100 px-1 rounded">parent_phone</code> is required. Everything else is optional.</p>
                        <p className="text-xs text-blue-500 mt-1">age_group: <strong>4-8 / 9-12 / 13-16</strong> &nbsp;|&nbsp; batch_week: week1–week4 &nbsp;|&nbsp; phone: with or without +91</p>
                        <p className="text-xs text-blue-500 mt-1">crm_status: lead · hot_lead · phone_captured · seat_reserved · converted · payment_offline · lost_lead</p>
                      </div>
                      <button
                        onClick={downloadImportSample}
                        className="flex items-center gap-2 bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
                        data-testid="download-sample-btn"
                      >
                        <Download className="w-4 h-4" /> Sample
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Upload file */}
                  <div>
                    <p className="font-semibold text-slate-800 text-sm mb-2">Step 2 — Upload Your XLSX</p>
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <span className="text-sm text-slate-500">{importFile ? importFile.name : 'Click to select .xlsx file'}</span>
                      <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImportFileChange} data-testid="import-file-input" />
                    </label>
                  </div>

                  {/* Preview */}
                  {importPreview.length > 0 && !importResult && (
                    <div>
                      <p className="font-semibold text-slate-800 text-sm mb-2">Preview (first {importPreview.length} rows)</p>
                      <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-50">
                            <tr>{Object.keys(importPreview[0]).map(k => <th key={k} className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{k}</th>)}</tr>
                          </thead>
                          <tbody>
                            {importPreview.map((row, i) => (
                              <tr key={i} className="border-t border-slate-100">
                                {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-slate-700 whitespace-nowrap">{String(v)}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Result */}
                  {importResult && (
                    <div className={`rounded-xl p-4 border ${importResult.imported > 0 ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                      <p className="font-bold text-slate-900 text-sm mb-2">Import Complete</p>
                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <div className="text-center"><div className="text-2xl font-bold text-green-600">{importResult.imported}</div><div className="text-xs text-slate-500">Imported</div></div>
                        <div className="text-center"><div className="text-2xl font-bold text-yellow-600">{importResult.skipped}</div><div className="text-xs text-slate-500">Skipped (duplicate)</div></div>
                        <div className="text-center"><div className="text-2xl font-bold text-red-600">{importResult.errors?.length || 0}</div><div className="text-xs text-slate-500">Errors</div></div>
                      </div>
                      {importResult.errors?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {importResult.errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 mt-2">WhatsApp notifications have been sent based on each lead's status.</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setShowImportModal(false)} className="flex-1">Close</Button>
                    <Button
                      onClick={handleBulkImport}
                      disabled={!importFile || importing || !!importResult}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                      data-testid="confirm-import-btn"
                    >
                      {importing ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importing...</> : 'Import & Notify'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Add Individual Lead Modal ── */}
          {showAddLeadModal && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setShowAddLeadModal(false); }}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white rounded-t-2xl">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Add Individual Lead</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Manually add a summer camp lead. WhatsApp & email will be sent.</p>
                  </div>
                  <button onClick={() => setShowAddLeadModal(false)} className="text-slate-400 hover:text-slate-600 p-1"><X className="w-5 h-5" /></button>
                </div>
                <div className="p-5 space-y-4">
                  {/* Child info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Child Name *</label>
                      <input
                        value={addLeadForm.child_name}
                        onChange={e => setAddLeadForm(f => ({ ...f, child_name: e.target.value }))}
                        placeholder="e.g. Aryan Sharma"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-child-name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Parent Name</label>
                      <input
                        value={addLeadForm.parent_name}
                        onChange={e => setAddLeadForm(f => ({ ...f, parent_name: e.target.value }))}
                        placeholder="e.g. Rahul Sharma"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Parent Phone *</label>
                      <input
                        value={addLeadForm.parent_phone}
                        onChange={e => setAddLeadForm(f => ({ ...f, parent_phone: e.target.value }))}
                        placeholder="+91 98765 43210"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-phone"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Parent Email</label>
                      <input
                        value={addLeadForm.parent_email}
                        onChange={e => setAddLeadForm(f => ({ ...f, parent_email: e.target.value }))}
                        placeholder="parent@email.com"
                        type="email"
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-email"
                      />
                    </div>
                  </div>
                  {/* Camp details */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Age Group</label>
                      <select
                        value={addLeadForm.age_group}
                        onChange={e => setAddLeadForm(f => ({ ...f, age_group: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-age-group"
                      >
                        <option value="">-- Select --</option>
                        <option value="explorers">Explorers (6–8 yrs)</option>
                        <option value="creators">Creators (9–12 yrs)</option>
                        <option value="innovators">Innovators (13–17 yrs)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Batch Week</label>
                      <select
                        value={addLeadForm.batch_week}
                        onChange={e => setAddLeadForm(f => ({ ...f, batch_week: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-batch"
                      >
                        <option value="">-- Select --</option>
                        <option value="week1">Week 1 (May 5–9)</option>
                        <option value="week2">Week 2 (May 12–16)</option>
                        <option value="week3">Week 3 (May 19–23)</option>
                        <option value="week4">Week 4 (May 26–30)</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Mode</label>
                      <select
                        value={addLeadForm.mode}
                        onChange={e => setAddLeadForm(f => ({ ...f, mode: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                      >
                        <option value="offline">Offline (At Center)</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600 mb-1 block">Center</label>
                      <select
                        value={addLeadForm.center}
                        onChange={e => setAddLeadForm(f => ({ ...f, center: e.target.value }))}
                        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
                        data-testid="add-lead-center"
                      >
                        <option value="">-- Select Center --</option>
                        <option value="mira_road">Mira Road</option>
                        <option value="borivali">Borivali</option>
                        <option value="andheri">Andheri</option>
                        <option value="thane">Thane</option>
                        <option value="online">Online</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 mb-1 block">Payment Mode</label>
                    <div className="flex gap-3">
                      {[['cash','Cash at Center'],['cashfree','Online Payment']].map(([val, lbl]) => (
                        <button
                          key={val}
                          onClick={() => setAddLeadForm(f => ({ ...f, payment_mode: val }))}
                          className={`flex-1 text-sm py-2 rounded-lg border font-medium transition-colors ${addLeadForm.payment_mode === val ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                        >
                          {lbl}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* Notifications toggle */}
                  <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Send Notifications</p>
                      <p className="text-xs text-slate-500">WhatsApp + email to parent after adding</p>
                    </div>
                    <button
                      onClick={() => setAddLeadForm(f => ({ ...f, send_notifications: !f.send_notifications }))}
                      className={`relative w-11 h-6 rounded-full transition-colors ${addLeadForm.send_notifications ? 'bg-orange-500' : 'bg-slate-300'}`}
                      data-testid="add-lead-notify-toggle"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${addLeadForm.send_notifications ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
                <div className="flex gap-3 p-5 pt-0">
                  <Button variant="outline" onClick={() => setShowAddLeadModal(false)} className="flex-1">Cancel</Button>
                  <Button
                    onClick={handleAddIndividualLead}
                    disabled={addLeadSubmitting}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                    data-testid="confirm-add-lead-btn"
                  >
                    {addLeadSubmitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Adding...</> : 'Add Lead'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <p className="text-slate-500">No leads in this section</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              data-testid={`inquiry-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{inquiry.name}</h3>
                  <p className="text-sm text-slate-500 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {inquiry.phone}
                  </p>
                  {inquiry.assigned_to && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3" /> Assigned to: {getAssignedUserName(inquiry.assigned_to) || 'Team Member'}
                    </p>
                  )}
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  inquiry.source === 'website' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
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
                    <span className="text-slate-400">Location:</span>{' '}
                    {(() => {
                      const locationInfo = getLocationDisplay(inquiry);
                      return (
                        <span className={`font-medium ${
                          locationInfo.type === 'online' ? 'text-[#1E3A5F]' : 
                          locationInfo.type === 'home' ? 'text-green-600' : 'text-[#D63031]'
                        }`}>
                          {locationInfo.text}
                        </span>
                      );
                    })()}
                  </p>
                )}
                {inquiry.demo_date && (
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    Demo: {inquiry.demo_date} {inquiry.demo_time && `at ${inquiry.demo_time}`}
                  </p>
                )}
                {inquiry.assigned_educator_name && (
                  <p className="flex items-center gap-1 text-green-600">
                    <User className="w-3 h-3" />
                    Educator: {inquiry.assigned_educator_name}
                  </p>
                )}
                {inquiry.conversion_amount && (
                  <p className="text-green-600 font-medium">
                    ₹{inquiry.conversion_amount} • {inquiry.sessions_count} sessions
                  </p>
                )}
              </div>

              {/* Comments shown outside */}
              {inquiry.notes && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
                  <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Latest Note
                  </p>
                  <p className="text-sm text-amber-900 line-clamp-2">
                    {inquiry.notes.split('\n\n').pop()?.split('\n').slice(0, 2).join('\n') || inquiry.notes.slice(-150)}
                  </p>
                </div>
              )}

              {/* View Button + Action Links */}
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
                      <p className="text-xs text-slate-500 mb-1">Learner Type</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.learner_type || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Age Group</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.age_group || 'N/A'}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Learning Goal</p>
                      <p className="font-medium text-[#1E3A5F] flex items-center gap-1">
                        <Target className="w-4 h-4" /> {viewInquiry.learning_goal || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-500 mb-1">Source</p>
                      <p className="font-medium text-[#1E3A5F]">{viewInquiry.source || 'website'}</p>
                    </div>
                  </div>

                  {viewInquiry.demo_date && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-xs text-blue-500 mb-1">Demo Scheduled</p>
                      <p className="font-medium text-blue-700 flex items-center gap-1">
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

      {/* Cancel Demo Modal */}
      <Dialog open={!!showCancelDemoModal} onOpenChange={() => setShowCancelDemoModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Cancel Demo - {showCancelDemoModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {showCancelDemoModal?.demo_date && (
              <div className="bg-slate-50 p-3 rounded-lg text-sm">
                <span className="text-slate-600">Scheduled Demo: </span>
                <span className="font-medium text-slate-800">
                  {showCancelDemoModal.demo_date} {showCancelDemoModal.demo_time && `at ${showCancelDemoModal.demo_time}`}
                </span>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Cancellation <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Enter reason for cancelling the demo..."
                value={cancelDemoReason}
                onChange={(e) => setCancelDemoReason(e.target.value)}
                rows={3}
                data-testid="cancel-demo-reason"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowCancelDemoModal(null)} className="flex-1">
                Go Back
              </Button>
              <Button 
                onClick={handleCancelDemo} 
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                data-testid="confirm-cancel-demo"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel Demo
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Reason Modal */}
      <Dialog open={!!showArchiveModal} onOpenChange={() => setShowArchiveModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-600">
              <Archive className="w-5 h-5" />
              Archive Lead - {showArchiveModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Reason for Archiving <span className="text-red-500">*</span>
              </label>
              <select
                value={archiveReason}
                onChange={(e) => setArchiveReason(e.target.value)}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                data-testid="archive-reason-select"
              >
                <option value="">Select reason</option>
                <option value="Not interested">Not interested</option>
                <option value="Budget constraints">Budget constraints</option>
                <option value="Chose competitor">Chose competitor</option>
                <option value="No response">No response</option>
                <option value="Wrong contact">Wrong contact</option>
                <option value="Age not suitable">Age not suitable</option>
                <option value="Location not serviceable">Location not serviceable</option>
                <option value="Duplicate lead">Duplicate lead</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowArchiveModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={confirmArchive} 
                className="flex-1 bg-slate-600 hover:bg-slate-700 text-white"
                data-testid="confirm-archive"
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive Lead
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Student Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Auto-fill hint */}
            <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded-lg">
              💡 Type at least 3 characters in Name, Phone, or Email to auto-fill from existing records
            </div>
            
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <Input
                  placeholder="Student / Parent name"
                  value={newLead.name}
                  onChange={(e) => {
                    setNewLead({...newLead, name: e.target.value});
                    searchAutocomplete(e.target.value, 'name');
                  }}
                  onFocus={() => newLead.name.length >= 3 && searchAutocomplete(newLead.name, 'name')}
                  data-testid="new-lead-name"
                />
                {/* Autocomplete dropdown */}
                {showAutocomplete && autocompleteField === 'name' && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {autocompleteSuggestions.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAutocompleteFill(s)}
                        className="w-full px-3 py-2 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
                      </button>
                    ))}
                  </div>
                )}
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
                  data-testid="new-lead-phone"
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
                        <p className="font-medium text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
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
                data-testid="new-lead-email"
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
                      <p className="font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-slate-500">{s.phone} • {s.email || 'No email'}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Age & Skill */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Age Group</label>
                <select
                  value={newLead.age_group}
                  onChange={(e) => setNewLead({...newLead, age_group: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-age"
                >
                  <option value="">Select age group</option>
                  {AGE_GROUPS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Skill Interest</label>
                <select
                  value={newLead.skill}
                  onChange={(e) => setNewLead({...newLead, skill: e.target.value, otherSkill: ''})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-skill"
                >
                  <option value="">Select skill</option>
                  {SKILLS.map(s => <option key={s} value={s.toLowerCase()}>{s}</option>)}
                </select>
                {/* Other skill text input */}
                {newLead.skill === 'other' && (
                  <div className="mt-2">
                    <Input
                      placeholder="Please specify the skill"
                      value={newLead.otherSkill}
                      onChange={(e) => setNewLead({...newLead, otherSkill: e.target.value})}
                      className="h-10"
                      data-testid="other-skill-input"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Learning Mode & Goal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Learning Mode</label>
                <select
                  value={newLead.learning_mode}
                  onChange={(e) => setNewLead({...newLead, learning_mode: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-mode"
                >
                  {LEARNING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Learning Goal</label>
                <select
                  value={newLead.learning_goal}
                  onChange={(e) => setNewLead({...newLead, learning_goal: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-goal"
                >
                  <option value="">Select goal</option>
                  {LEARNING_GOALS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                </select>
              </div>
            </div>

            {/* City (always show) & Address (for offline) */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                <CitySearch
                  value={newLead.city}
                  onChange={(city) => setNewLead({...newLead, city})}
                  placeholder="Search city..."
                  data-testid="new-lead-city"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
                <select
                  value={newLead.source}
                  onChange={(e) => setNewLead({...newLead, source: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="new-lead-source"
                >
                  <option value="manual">Manual Entry</option>
                  <option value="referral">Referral</option>
                  <option value="social">Social Media</option>
                  <option value="event">Event</option>
                  <option value="website">Website</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Address for offline home */}
            {newLead.learning_mode === 'offline_home' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <Textarea
                  placeholder="Complete address for home visit"
                  value={newLead.address}
                  onChange={(e) => setNewLead({...newLead, address: e.target.value})}
                  className="min-h-[60px]"
                  data-testid="new-lead-address"
                />
              </div>
            )}

            {/* Demo Date & Time */}
            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-slate-900 mb-3">Demo Scheduling</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Demo Date</label>
                  <div className="border rounded-lg p-2">
                    <CalendarComponent
                      mode="single"
                      selected={newLead.demo_date}
                      onSelect={(date) => setNewLead({...newLead, demo_date: date})}
                      disabled={(date) => date < new Date()}
                      className="rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Demo Time</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TIME_SLOTS.map(time => (
                      <button
                        key={time}
                        type="button"
                        className={`p-2 rounded-lg border text-sm ${
                          newLead.demo_time === time 
                            ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setNewLead({...newLead, demo_time: time})}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <Textarea
                placeholder="Additional notes..."
                value={newLead.notes}
                onChange={(e) => setNewLead({...newLead, notes: e.target.value})}
                className="min-h-[80px]"
                data-testid="new-lead-notes"
              />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleAddLead} className="btn-primary flex-1" data-testid="save-new-lead">
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
            <DialogTitle>Add Comment - {showCommentModal?.name}</DialogTitle>
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
              <Button onClick={handleAddComment} className="flex-1 bg-[#D63031] hover:bg-[#b52828]" data-testid="submit-comment">
                <Send className="w-4 h-4 mr-2" />
                Add Comment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Lead Modal - Updated with Educator Tab */}
      <Dialog open={!!showAssignModal} onOpenChange={() => setShowAssignModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Lead - {showAssignModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Current Assignment Info */}
            {(showAssignModal?.assigned_to || showAssignModal?.assigned_educator_name) && (
              <div className="bg-indigo-50 rounded-lg p-3 space-y-1">
                {showAssignModal?.assigned_to && (
                  <p className="text-sm text-indigo-700">
                    Team: <strong>{getAssignedUserName(showAssignModal.assigned_to) || 'Unknown'}</strong>
                  </p>
                )}
                {showAssignModal?.assigned_educator_name && (
                  <p className="text-sm text-green-700">
                    Educator: <strong>{showAssignModal.assigned_educator_name}</strong>
                  </p>
                )}
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setAssignTab('team')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  assignTab === 'team' 
                    ? 'text-indigo-600 bg-indigo-50 border-b-2 border-indigo-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Team Member
              </button>
              <button
                onClick={() => setAssignTab('educator')}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all ${
                  assignTab === 'educator' 
                    ? 'text-green-600 bg-green-50 border-b-2 border-green-600' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Educator (Demo)
              </button>
            </div>

            {/* Team Members Tab */}
            {assignTab === 'team' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Select Team Member</p>
                <div className="max-h-64 overflow-y-auto space-y-2">
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
              </div>
            )}

            {/* Educators Tab */}
            {assignTab === 'educator' && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-700">Assign Demo to Educator</p>
                <p className="text-xs text-slate-500 mb-2">
                  Skill: <span className="font-medium">{showAssignModal?.skill}</span>
                </p>
                {onboardedEducators.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">No onboarded educators available.</p>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2">
                    {onboardedEducators.map(educator => {
                      const skillMatch = educator.skills?.some(s => 
                        s.toLowerCase().includes(showAssignModal?.skill?.toLowerCase() || '')
                      );
                      return (
                        <button
                          key={educator.id}
                          onClick={() => handleAssignEducator(educator.id, educator.name)}
                          className={`w-full p-3 rounded-lg border text-left transition-all hover:border-green-300 hover:bg-green-50 ${
                            showAssignModal?.assigned_educator_id === educator.id 
                              ? 'border-green-500 bg-green-50' 
                              : skillMatch ? 'border-green-200 bg-green-50/30' : 'border-slate-200'
                          }`}
                          data-testid={`assign-educator-${educator.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900 flex items-center gap-2">
                                {educator.name}
                                {skillMatch && (
                                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">Skill Match</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-500">{educator.skills?.join(', ')}</p>
                              <p className="text-xs text-slate-400">{educator.city}</p>
                            </div>
                            {showAssignModal?.assigned_educator_id === educator.id && (
                              <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">Assigned</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAssignModal(null)} className="flex-1">
                Cancel
              </Button>
              {(showAssignModal?.assigned_to || showAssignModal?.assigned_educator_id) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (assignTab === 'team') handleAssignLead('');
                    else handleAssignEducator('', '');
                  }}
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                >
                  Unassign
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Onboarding Modal */}
      <Dialog open={!!showOnboardModal} onOpenChange={() => setShowOnboardModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-green-600" />
              Convert & Onboard: {showOnboardModal?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Payment Section */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-3">
              {/* Amount Field */}
              <div>
                <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                  Amount (₹) *
                </label>
                <div className="mt-1">
                  <Input
                    type="number"
                    placeholder="Enter payment amount"
                    value={onboardData.amount}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, amount: e.target.value }))}
                    className="bg-white"
                    data-testid="onboard-amount"
                  />
                </div>
              </div>
              
              {/* Payment Mode Selection */}
              <div>
                <label className="text-sm font-medium text-yellow-800 mb-2 block">Payment Method *</label>
                <div className="flex gap-2 bg-white p-1 rounded-lg border border-yellow-200">
                  <button
                    onClick={() => {
                      setOnboardData(prev => ({ ...prev, payment_mode: 'receipt' }));
                      setPaymentLinkGenerated(null);
                    }}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      onboardData.payment_mode === 'receipt' ? 'bg-yellow-100 text-yellow-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    Upload Receipt
                  </button>
                  <button
                    onClick={() => setOnboardData(prev => ({ ...prev, payment_mode: 'online', payment_receipt_url: '' }))}
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      onboardData.payment_mode === 'online' ? 'bg-green-100 text-green-800 shadow-sm' : 'text-slate-600'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    Online Payment
                  </button>
                </div>
              </div>
              
              {/* Receipt Upload (if receipt mode) */}
              {onboardData.payment_mode === 'receipt' && (
                <div>
                  <label className="text-sm font-medium text-yellow-800 flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Payment Receipt *
                  </label>
                  <div className="mt-2">
                    {onboardData.payment_receipt_url ? (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-green-700 flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          Receipt uploaded
                        </span>
                        <a 
                          href={onboardData.payment_receipt_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 underline"
                        >
                          View
                        </a>
                        <button 
                          onClick={() => setOnboardData(prev => ({ ...prev, payment_receipt_url: '' }))}
                          className="text-xs text-red-600 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => handleReceiptUpload(e.target.files[0])}
                          className="text-sm"
                          disabled={uploadingReceipt}
                        />
                        {uploadingReceipt && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Online Payment (if online mode) */}
              {onboardData.payment_mode === 'online' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  {paymentLinkGenerated ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-sm font-medium">Payment link ready!</span>
                      </div>
                      <p className="text-xs text-green-600 mb-2">
                        Share this link with the student. They'll see a "Pay Fees" button and can pay securely via Cashfree.
                      </p>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          value={paymentLinkGenerated.payment_link} 
                          readOnly 
                          className="flex-1 text-xs bg-white border rounded px-2 py-1"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(paymentLinkGenerated.payment_link);
                            toast.success('Payment link copied!');
                          }}
                          className="p-1.5 bg-green-100 rounded hover:bg-green-200"
                        >
                          <Copy className="w-4 h-4 text-green-700" />
                        </button>
                        <a
                          href={paymentLinkGenerated.payment_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 bg-blue-100 rounded hover:bg-blue-200"
                        >
                          <ExternalLink className="w-4 h-4 text-blue-700" />
                        </a>
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        Amount: ₹{paymentLinkGenerated.amount} • Batch: {paymentLinkGenerated.batch_name}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-green-700 mb-2">
                        Setup online payment for the student via Cashfree.
                      </p>
                      <p className="text-xs text-slate-500 mb-3">
                        First select batch details below, then click "Setup Payment". The student will receive a link to pay securely.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Batch Mode Selection */}
            <div className="flex gap-2 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setOnboardData(prev => ({ ...prev, batch_mode: 'new' }))}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  onboardData.batch_mode === 'new' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-600'
                }`}
              >
                Create New Batch
              </button>
              <button
                onClick={() => setOnboardData(prev => ({ ...prev, batch_mode: 'existing' }))}
                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  onboardData.batch_mode === 'existing' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-slate-600'
                }`}
              >
                Join Existing Batch
              </button>
            </div>

            {onboardData.batch_mode === 'existing' ? (
              /* Select Existing Batch */
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700">Select Batch</label>
                {batches.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center bg-slate-50 rounded-lg">
                    No active batches available. Create a new one.
                  </p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {batches.map(batch => (
                      <button
                        key={batch.id}
                        onClick={() => setOnboardData(prev => ({ ...prev, batch_id: batch.id }))}
                        className={`w-full p-3 rounded-lg border text-left transition-all ${
                          onboardData.batch_id === batch.id 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <p className="font-medium text-slate-900">{batch.name}</p>
                        <p className="text-xs text-slate-500">
                          {batch.skill} • {batch.educator_name} • {batch.mode}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {batch.days?.join(', ')} at {batch.time_slot} • {batch.num_sessions} sessions
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* Create New Batch Form */
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Batch Name (optional)</label>
                  <Input
                    value={onboardData.name}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder={`${showOnboardModal?.name}'s Batch`}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">Start Date *</label>
                    <Input
                      type="date"
                      value={onboardData.start_date}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, start_date: e.target.value }))}
                      min={format(new Date(), 'yyyy-MM-dd')}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Time Slot *</label>
                    <select
                      value={onboardData.time_slot}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, time_slot: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                    >
                      <option value="">Select time</option>
                      <option value="09:00 AM">09:00 AM</option>
                      <option value="10:00 AM">10:00 AM</option>
                      <option value="11:00 AM">11:00 AM</option>
                      <option value="12:00 PM">12:00 PM</option>
                      <option value="02:00 PM">02:00 PM</option>
                      <option value="03:00 PM">03:00 PM</option>
                      <option value="04:00 PM">04:00 PM</option>
                      <option value="05:00 PM">05:00 PM</option>
                      <option value="06:00 PM">06:00 PM</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Days *</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                      <button
                        key={day}
                        onClick={() => {
                          setOnboardData(prev => ({
                            ...prev,
                            days: prev.days.includes(day) 
                              ? prev.days.filter(d => d !== day)
                              : [...prev.days, day]
                          }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                          onboardData.days.includes(day)
                            ? 'bg-green-500 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-slate-700">No. of Sessions</label>
                    <Input
                      type="number"
                      value={onboardData.num_sessions}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, num_sessions: e.target.value }))}
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">Mode *</label>
                    <select
                      value={onboardData.mode}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, mode: e.target.value }))}
                      className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                    >
                      <option value="online">Online</option>
                      <option value="offline">Offline</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Assign Educator *</label>
                  <select
                    value={onboardData.educator_id}
                    onChange={(e) => {
                      const edu = onboardedEducators.find(ed => ed.id === e.target.value);
                      setOnboardData(prev => ({ 
                        ...prev, 
                        educator_id: e.target.value,
                        educator_name: edu?.name || ''
                      }));
                    }}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select educator</option>
                    {onboardedEducators.map(edu => (
                      <option key={edu.id} value={edu.id}>{edu.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700">Skill</label>
                  <select
                    value={onboardData.skill}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, skill: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  >
                    <option value="">Select skill</option>
                    <option value="Robotics">Robotics</option>
                    <option value="Coding">Coding</option>
                    <option value="AI">AI</option>
                    <option value="Entrepreneurship">Entrepreneurship</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setShowOnboardModal(null);
                setPaymentLinkGenerated(null);
              }} className="flex-1">
                Cancel
              </Button>
              {onboardData.payment_mode === 'online' ? (
                <>
                  {!paymentLinkGenerated && (
                    <Button 
                      onClick={handleGeneratePaymentLink} 
                      disabled={generatingPaymentLink}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {generatingPaymentLink ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Setting up...
                        </>
                      ) : (
                        <>
                          <CreditCard className="w-4 h-4 mr-2" />
                          Setup Payment
                        </>
                      )}
                    </Button>
                  )}
                  {paymentLinkGenerated && (
                    <Button onClick={handleOnboardStudent} className="flex-1 bg-blue-600 hover:bg-blue-700">
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Done
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={handleOnboardStudent} className="flex-1 bg-green-600 hover:bg-green-700">
                  Onboard Student
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminStudentCRM;
