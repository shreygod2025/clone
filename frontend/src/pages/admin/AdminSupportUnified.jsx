import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Phone, Mail, Clock, User, MessageSquare, AlertCircle, CreditCard, Wrench, HelpCircle, ThumbsUp, Building2, Send, AlertTriangle, CheckCircle, UserPlus, Plus, Paperclip, Mic, MicOff, X, FileText, Play, Pause, Upload, History, Edit, Trash2, StickyNote, RefreshCw, GraduationCap, Eye, Users, Settings, Bell, Hash, Package, Truck, Calendar, Loader2 } from 'lucide-react';
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
  { value: 'course_info', label: 'Course Info', icon: HelpCircle, color: 'bg-purple-100 text-purple-700' },
  { value: 'ongoing_classes', label: 'Ongoing Classes', icon: HelpCircle, color: 'bg-indigo-100 text-indigo-700' },
  { value: 'technical', label: 'Technical', icon: Wrench, color: 'bg-orange-100 text-orange-700' },
  { value: 'kit_related', label: 'Kit Related', icon: Package, color: 'bg-amber-100 text-amber-800' },
  { value: 'partnership', label: 'Partnership', icon: Building2, color: 'bg-cyan-100 text-cyan-700' },
  { value: 'feedback', label: 'Feedback', icon: ThumbsUp, color: 'bg-yellow-100 text-yellow-700' },
  { value: 'educator_query', label: 'Educator Query', icon: UserPlus, color: 'bg-red-100 text-red-700' },
  { value: 'admission', label: 'Admission', icon: GraduationCap, color: 'bg-teal-100 text-teal-700' },
  { value: 'scheduling', label: 'Scheduling', icon: Clock, color: 'bg-pink-100 text-pink-700' },
  { value: 'other', label: 'Other', icon: AlertCircle, color: 'bg-slate-100 text-slate-700' },
];

// Related To sub-categories based on Query Type
const RELATED_TO_OPTIONS = {
  demo_related: [
    { value: 'demo_booking', label: 'Demo Booking' },
    { value: 'demo_reschedule', label: 'Demo Reschedule' },
    { value: 'demo_cancellation', label: 'Demo Cancellation' },
    { value: 'demo_feedback', label: 'Demo Feedback' },
    { value: 'demo_no_show', label: 'Demo No Show' },
    { value: 'other', label: 'Other' },
  ],
  payment: [
    { value: 'payment_pending', label: 'Payment Pending' },
    { value: 'payment_failed', label: 'Payment Failed' },
    { value: 'refund_request', label: 'Refund Request' },
    { value: 'invoice_request', label: 'Invoice Request' },
    { value: 'payment_plan', label: 'Payment Plan / EMI' },
    { value: 'discount_query', label: 'Discount Query' },
    { value: 'other', label: 'Other' },
  ],
  course_info: [
    { value: 'course_content', label: 'Course Content' },
    { value: 'course_duration', label: 'Course Duration' },
    { value: 'course_pricing', label: 'Course Pricing' },
    { value: 'course_eligibility', label: 'Eligibility / Prerequisites' },
    { value: 'course_certification', label: 'Certification' },
    { value: 'batch_timing', label: 'Batch Timing' },
    { value: 'other', label: 'Other' },
  ],
  ongoing_classes: [
    { value: 'class_reschedule', label: 'Class Reschedule' },
    { value: 'class_missed', label: 'Missed Class' },
    { value: 'teacher_issue', label: 'Teacher Issue' },
    { value: 'class_quality', label: 'Class Quality' },
    { value: 'progress_report', label: 'Progress Report' },
    { value: 'batch_change', label: 'Batch Change Request' },
    { value: 'other', label: 'Other' },
  ],
  technical: [
    { value: 'login_issue', label: 'Login Issue' },
    { value: 'app_bug', label: 'App Bug / Error' },
    { value: 'video_issue', label: 'Video / Audio Issue' },
    { value: 'payment_gateway', label: 'Payment Gateway Issue' },
    { value: 'notification_issue', label: 'Notification Issue' },
    { value: 'other', label: 'Other' },
  ],
  kit_related: [
    { value: 'components_missing', label: 'Components Missing' },
    { value: 'delivery_delay', label: 'Delivery Delay' },
    { value: 'component_damaged', label: 'Component Damaged' },
    { value: 'quality_issues', label: 'Quality Issues' },
    { value: 'other', label: 'Other' },
  ],

  partnership: [
    { value: 'school_partnership', label: 'School Partnership' },
    { value: 'center_partnership', label: 'Center Partnership' },
    { value: 'franchise_inquiry', label: 'Franchise Inquiry' },
    { value: 'bulk_enrollment', label: 'Bulk Enrollment' },
    { value: 'corporate_training', label: 'Corporate Training' },
    { value: 'other', label: 'Other' },
  ],
  feedback: [
    { value: 'positive_feedback', label: 'Positive Feedback' },
    { value: 'complaint', label: 'Complaint' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'testimonial', label: 'Testimonial' },
    { value: 'other', label: 'Other' },
  ],
  educator_query: [
    { value: 'application_status', label: 'Application Status' },
    { value: 'payment_query', label: 'Payment / Payout Query' },
    { value: 'schedule_query', label: 'Schedule Query' },
    { value: 'training_support', label: 'Training Support' },
    { value: 'student_issue', label: 'Student Issue' },
    { value: 'other', label: 'Other' },
  ],
  admission: [
    { value: 'new_admission', label: 'New Admission' },
    { value: 'admission_process', label: 'Admission Process' },
    { value: 'document_submission', label: 'Document Submission' },
    { value: 'seat_availability', label: 'Seat Availability' },
    { value: 'other', label: 'Other' },
  ],
  scheduling: [
    { value: 'slot_availability', label: 'Slot Availability' },
    { value: 'preferred_timing', label: 'Preferred Timing' },
    { value: 'teacher_preference', label: 'Teacher Preference' },
    { value: 'batch_inquiry', label: 'Batch Inquiry' },
    { value: 'other', label: 'Other' },
  ],
  other: [
    { value: 'general_inquiry', label: 'General Inquiry' },
    { value: 'career_inquiry', label: 'Career Inquiry' },
    { value: 'media_inquiry', label: 'Media Inquiry' },
    { value: 'other', label: 'Other' },
  ],
};

// Default related_to based on inquiry_type (user type)
const DEFAULT_RELATED_TO = {
  student: { query_type: 'course_info', related_to: 'course_content' },
  school: { query_type: 'partnership', related_to: 'school_partnership' },
  educator: { query_type: 'educator_query', related_to: 'application_status' },
  teacher: { query_type: 'educator_query', related_to: 'schedule_query' },
  growth_partner: { query_type: 'partnership', related_to: 'center_partnership' },
  team: { query_type: 'other', related_to: 'general_inquiry' },
};

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
  const [replyAttachment, setReplyAttachment] = useState(null); // {url, filename, original_name, file_type}
  const [newTicket, setNewTicket] = useState({
    name: '', phone: '', email: '', query_type: 'course_info', related_to: 'course_content', inquiry_type: 'student', message: '', priority: 'normal', source: 'admin_created'
  });
  const [multipleUsers, setMultipleUsers] = useState([]); // For creating tickets for multiple users
  
  // Notes, History, Edit, Delete states
  const [showNotesModal, setShowNotesModal] = useState(null);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [showEditModal, setShowEditModal] = useState(null);
  const [showViewersModal, setShowViewersModal] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [editForm, setEditForm] = useState({});
  const [queryHistory, setQueryHistory] = useState([]);
  const [queryNotes, setQueryNotes] = useState([]);
  const [queryReplies, setQueryReplies] = useState([]);
  const [queryViewers, setQueryViewers] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingViewers, setLoadingViewers] = useState(false);
  const [selectedViewerToAdd, setSelectedViewerToAdd] = useState('');

  // ── Raise PO (for kit_related queries) ───────────────────────────
  const [showPOModal, setShowPOModal] = useState(null);
  const [poForm, setPoForm] = useState({
    delivery_date: '',
    contact_person: '',
    contact_number: '',
    delivery_address: '',
    notes: '',
    products: [{ product_name: '', product_id: '', quantity: 1 }],
  });
  const [raisingPO, setRaisingPO] = useState(false);
  const [vendorProducts, setVendorProducts] = useState([]);
  const [productSearch, setProductSearch] = useState({});      // { [rowIdx]: searchText }
  const [productDropdownOpen, setProductDropdownOpen] = useState({});  // { [rowIdx]: boolean }

  const openRaisePOModal = async (query) => {
    setPoForm({
      delivery_date: '',
      contact_person: query.contact_name || query.name || query.parent_name || query.user_name || '',
      contact_number: query.phone || query.contact_phone || query.mobile || '',
      delivery_address: query.address || query.city || query.school_name || '',
      notes: `Replacement for kit issue: ${(query.category_label || query.subcategory_label || query.related_to || query.query_type || '').toString().replace(/_/g, ' ')}`,
      products: [{ product_name: '', product_id: '', quantity: 1 }],
    });
    setProductSearch({});
    setProductDropdownOpen({});
    setShowPOModal(query);
    // Fetch vendor catalog (will be near-instant thanks to backend cache)
    if (vendorProducts.length === 0) {
      try {
        const res = await axios.get(`${API}/support/vendor-products`, { headers: getAuthHeaders() });
        setVendorProducts(res.data.products || []);
      } catch (err) {
        toast.error('Could not load vendor product catalog — you can still type a product name manually.');
      }
    }
  };

  const addPoProductRow = () => {
    setPoForm(p => ({ ...p, products: [...p.products, { product_name: '', product_id: '', quantity: 1 }] }));
  };

  const removePoProductRow = (idx) => {
    setPoForm(p => ({ ...p, products: p.products.filter((_, i) => i !== idx) || [] }));
    setProductSearch(s => { const n = { ...s }; delete n[idx]; return n; });
    setProductDropdownOpen(s => { const n = { ...s }; delete n[idx]; return n; });
  };

  const updatePoProduct = (idx, field, value) => {
    setPoForm(p => {
      const next = [...p.products];
      next[idx] = { ...next[idx], [field]: field === 'quantity' ? Number(value) || 0 : value };
      return { ...p, products: next };
    });
  };

  const selectVendorProduct = (idx, product) => {
    setPoForm(p => {
      const next = [...p.products];
      next[idx] = { ...next[idx], product_name: product.name, product_id: product.id };
      return { ...p, products: next };
    });
    setProductSearch(s => ({ ...s, [idx]: product.name }));
    setProductDropdownOpen(s => ({ ...s, [idx]: false }));
  };

  const handleRaisePO = async () => {
    if (!poForm.delivery_date) return toast.error('Please select a delivery date');
    if (!poForm.delivery_address.trim()) return toast.error('Delivery address is required');
    if (!poForm.contact_person.trim()) return toast.error('Contact person is required');
    if (!poForm.contact_number.trim()) return toast.error('Contact number is required');
    const clean = poForm.products.filter(p => p.product_name?.trim() && p.quantity > 0);
    if (!clean.length) return toast.error('Add at least one product');
    setRaisingPO(true);
    try {
      const res = await axios.post(
        `${API}/support/queries/${showPOModal.id}/raise-po`,
        { ...poForm, products: clean },
        { headers: getAuthHeaders() }
      );
      toast.success(res.data.message || `PO ${res.data.po_number} raised`);
      // Patch the query in state so the Raise PO button turns into the tracking link
      setShowReplyModal(prev => prev ? { ...prev, po_info: res.data.po_info } : prev);
      setShowPOModal(null);
      fetchAllQueries?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to raise PO');
    } finally {
      setRaisingPO(false);
    }
  };


  
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
  const replyFileInputRef = useRef(null);
  
  // Autocomplete states
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteField, setAutocompleteField] = useState('');
  
  // School contact picker states
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('');
  const [schoolSearchResults, setSchoolSearchResults] = useState([]);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolContacts, setSchoolContacts] = useState([]);

  useEffect(() => {
    fetchAllQueries();
    fetchTeamUsers();
    fetchNotificationSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [notificationPhones, setNotificationPhones] = useState([]);
  const [notifPhoneInput, setNotifPhoneInput] = useState('');
  const [savingNotif, setSavingNotif] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [resetingOverdue, setResetingOverdue] = useState(false);
  const [backfillingTickets, setBackfillingTickets] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);

  const fetchNotificationSettings = async () => {
    try {
      const res = await axios.get(`${API}/support/notification-settings`, { headers: getAuthHeaders() });
      setNotificationPhones(res.data.phones || []);
    } catch {}
  };

  const saveNotificationSettings = async () => {
    setSavingNotif(true);
    try {
      const phones = notifPhoneInput.split(',').map(p => p.trim()).filter(Boolean);
      await axios.post(`${API}/support/notification-settings`, { phones }, { headers: getAuthHeaders() });
      setNotificationPhones(phones);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 3000);
    } catch {}
    setSavingNotif(false);
  };

  const resetOverdueFlags = async () => {
    setResetingOverdue(true);
    try {
      const res = await axios.post(`${API}/support/reset-overdue-flags`, {}, { headers: getAuthHeaders() });
      alert(`Reset ${res.data.count} tickets. Overdue notifications will re-trigger on next scheduler check.`);
    } catch {}
    setResetingOverdue(false);
  };

  const backfillTicketIds = async () => {
    setBackfillingTickets(true);
    setBackfillResult(null);
    try {
      const res = await axios.post(`${API}/support/backfill-ticket-numbers`, {}, { headers: getAuthHeaders() });
      setBackfillResult(res.data);
      fetchAllQueries();
    } catch (err) {
      const detail = err.response?.data?.detail
        || err.response?.data?.message
        || err.message
        || 'Request failed';
      setBackfillResult({ error: `Error ${err.response?.status || ''}: ${detail}` });
    }
    setBackfillingTickets(false);
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

  // School search for ticket creation
  const searchSchools = async (query) => {
    setSchoolSearchQuery(query);
    if (!query || query.length < 2) {
      setSchoolSearchResults([]);
      setShowSchoolDropdown(false);
      return;
    }
    try {
      const response = await axios.get(`${API}/schools/inquiries`, {
        headers: getAuthHeaders()
      });
      const allSchools = response.data?.inquiries || response.data || [];
      const filtered = allSchools.filter(s => 
        s.school_name?.toLowerCase().includes(query.toLowerCase()) ||
        s.contact_name?.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 10);
      setSchoolSearchResults(filtered);
      setShowSchoolDropdown(filtered.length > 0);
    } catch (error) {
      console.error('School search error:', error);
    }
  };

  const selectSchool = (school) => {
    setSelectedSchool(school);
    setSchoolSearchQuery(school.school_name || '');
    setShowSchoolDropdown(false);
    // Extract contacts from onboarding_data
    const contacts = school.onboarding_data?.school_contacts || [];
    // Also include the main contact
    const mainContact = { name: school.contact_name, phone: school.phone, email: school.email, role: 'Main Contact' };
    const allContacts = [mainContact, ...contacts].filter(c => c.name || c.phone);
    setSchoolContacts(allContacts);
    // If only one contact, auto-select it
    if (allContacts.length === 1) {
      selectSchoolContact(allContacts[0]);
    }
  };

  const selectSchoolContact = (contact) => {
    setNewTicket({
      ...newTicket,
      name: contact.name || '',
      phone: contact.phone || '',
      email: contact.email || '',
    });
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
        query_type: q.type === 'educator_query' ? q.category : (q.category || q.main_category || q.query_type || 'other'),
        query_details: q.type === 'educator_query' 
          ? `[${q.category_label || ''}] ${q.subcategory_label || ''}: ${q.query || ''}`
          : (q.details || q.reason || q.query_details || q.message || ''),
        inquiry_type: q.inquiry_type || (q.type === 'educator_query' ? 'educator' : 'student'),
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
    if (!replyText.trim() && !replyAttachment) {
      toast.error('Please enter a reply or attach a file');
      return;
    }
    try {
      // Add reply using the new replies endpoint (chat-style)
      if (showReplyModal._source === 'inquiry') {
        await axios.patch(`${API}/inquiry/queries/${showReplyModal.id}`, { 
          status: 'in_progress',
          query_details: `${showReplyModal.query_details}\n\n--- Admin Reply (${format(new Date(), 'MMM d, yyyy h:mm a')}) ---\n${replyText}`
        }, {
          headers: getAuthHeaders()
        });
        toast.success('Reply sent');
        setShowReplyModal(null);
        setReplyText('');
        setReplyAttachment(null);
      } else if (showReplyModal._source === 'user_support') {
        // Use new replies endpoint for chat-style conversation
        await axios.post(`${API}/support/queries/${showReplyModal.id}/replies`, { 
          text: replyText,
          attachment: replyAttachment || null
        }, {
          headers: getAuthHeaders()
        });
        toast.success('Reply sent');
        setReplyText('');
        setReplyAttachment(null);
        // Refresh replies list
        fetchQueryReplies(showReplyModal.id);
      }
      fetchAllQueries();
    } catch (error) {
      console.error('Reply error:', error);
      toast.error('Failed to send reply');
    }
  };

  const handleReplyFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File too large (max 10MB)'); return; }
    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'support_reply');
      const res = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setReplyAttachment({
        url: res.data.url,
        filename: res.data.filename,
        original_name: file.name,
        file_type: file.type
      });
      toast.success('File attached');
    } catch (err) {
      toast.error('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
      e.target.value = '';
    }
  };
  
  // Fetch replies for a query from the backend
  const fetchQueryReplies = async (queryId) => {
    try {
      setLoadingHistory(true);
      const response = await axios.get(`${API}/support/queries/${queryId}`, {
        headers: getAuthHeaders()
      });
      const query = response.data;
      setQueryReplies(query?.replies || []);
      
      // Also update the showReplyModal with fresh data
      if (showReplyModal && showReplyModal.id === queryId) {
        setShowReplyModal(prev => ({ ...prev, ...query, replies: query.replies || [] }));
      }
    } catch (error) {
      console.error('Error fetching replies:', error);
      // Fallback to local data if API fails
      const query = allQueries.find(q => q.id === queryId) || showReplyModal;
      setQueryReplies(query?.replies || []);
    } finally {
      setLoadingHistory(false);
    }
  };

  const [assignDeadline, setAssignDeadline] = useState('');
  const [assignSubmitting, setAssignSubmitting] = useState(false);

  const handleCreateTicket = async () => {
    // Determine the list of users to create tickets for
    const usersToCreate = multipleUsers.length > 0 
      ? multipleUsers 
      : (newTicket.name && newTicket.phone ? [{ name: newTicket.name, phone: newTicket.phone, email: newTicket.email }] : []);
    
    if (usersToCreate.length === 0) {
      toast.error('Please add at least one user (Name and Phone required)');
      return;
    }
    
    // Validate all users have name and phone
    const invalidUsers = usersToCreate.filter(u => !u.name || !u.phone);
    if (invalidUsers.length > 0) {
      toast.error('All users must have Name and Phone');
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
      
      // Create tickets for each user
      let successCount = 0;
      let failCount = 0;
      
      for (const user of usersToCreate) {
        try {
          await axios.post(`${API}/support/queries/create`, {
            ...newTicket,
            name: user.name,
            phone: user.phone,
            email: user.email || '',
            school_name: selectedSchool?.school_name || '',
            school_id: selectedSchool?.id || '',
            attachments: allAttachments
          }, {
            headers: getAuthHeaders()
          });
          successCount++;
        } catch (err) {
          failCount++;
          console.error(`Failed to create ticket for ${user.name}:`, err);
        }
      }
      
      if (successCount > 0) {
        toast.success(`${successCount} ticket${successCount > 1 ? 's' : ''} created successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
      } else {
        toast.error('Failed to create tickets');
      }
      
      setShowCreateModal(false);
      setNewTicket({ name: '', phone: '', email: '', query_type: 'course_info', related_to: 'course_content', inquiry_type: 'student', message: '', priority: 'normal', source: 'admin_created' });
      setMultipleUsers([]);
      setAttachments([]);
      setAudioBlob(null);
      setAudioUrl(null);
      setRecordingTime(0);
      setSelectedSchool(null);
      setSchoolContacts([]);
      setSchoolSearchQuery('');
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to create ticket');
    }
  };

  const handleAssignQuery = async (userId) => {
    if (!showAssignModal || assignSubmitting) return;
    setAssignSubmitting(true);
    try {
      // Use the correct endpoint based on source
      let endpoint;
      if (showAssignModal._source === 'inquiry') {
        endpoint = `${API}/inquiry/queries/${showAssignModal.id}/assign`;
      } else if (showAssignModal._source === 'tracking_page') {
        endpoint = `${API}/support/tracking-tickets/${showAssignModal.id}/assign`;
      } else {
        endpoint = `${API}/support/queries/${showAssignModal.id}/assign`;
      }
      
      await axios.post(endpoint, {
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
      console.error('Assign error:', error.response?.data || error);
      toast.error(error.response?.data?.detail || 'Failed to assign query');
    } finally {
      setAssignSubmitting(false);
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

  // Human-friendly resolution duration (created → resolved_at)
  const formatResolutionTime = (query) => {
    if (!['resolved', 'closed'].includes(query.status)) return null;
    const resolvedAt = query.resolved_at || query.updated_at;
    if (!query.created_at || !resolvedAt) return null;
    const mins = Math.max(0, Math.round((new Date(resolvedAt) - new Date(query.created_at)) / 60000));
    if (mins < 60) return `${mins} min`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    if (hrs < 24) return remMins ? `${hrs}h ${remMins}m` : `${hrs}h`;
    const days = Math.floor(hrs / 24);
    const remHrs = hrs % 24;
    return remHrs ? `${days}d ${remHrs}h` : `${days}d`;
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
  
  // Delete Note handler
  const handleDeleteNote = async (noteId) => {
    if (!showNotesModal || !noteId) return;
    
    if (!window.confirm('Are you sure you want to delete this note?')) return;
    
    try {
      await axios.delete(`${API}/support/queries/${showNotesModal.id}/notes/${noteId}`, {
        headers: getAuthHeaders()
      });
      toast.success('Note deleted');
      fetchAllQueries();
      // Refresh notes
      fetchQueryHistory(showNotesModal.id);
    } catch (error) {
      toast.error('Failed to delete note');
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

  // Fetch Query Viewers
  const fetchQueryViewers = async (query) => {
    setLoadingViewers(true);
    try {
      let endpoint;
      if (query._source === 'inquiry') {
        // For inquiry queries, viewers are stored in the query itself
        setQueryViewers(query.viewers || []);
      } else {
        const response = await axios.get(`${API}/support/queries/${query.id}/viewers`, {
          headers: getAuthHeaders()
        });
        setQueryViewers(response.data.viewers || []);
      }
    } catch (error) {
      console.error('Failed to fetch viewers:', error);
      setQueryViewers([]);
    } finally {
      setLoadingViewers(false);
    }
  };

  // Add Viewer handler
  const handleAddViewer = async () => {
    if (!selectedViewerToAdd || !showViewersModal) {
      toast.error('Please select a viewer');
      return;
    }
    try {
      let endpoint;
      if (showViewersModal._source === 'inquiry') {
        endpoint = `${API}/inquiry/queries/${showViewersModal.id}/viewers`;
      } else {
        endpoint = `${API}/support/queries/${showViewersModal.id}/viewers`;
      }
      
      await axios.post(endpoint, {
        action: 'add',
        viewer_id: selectedViewerToAdd
      }, { headers: getAuthHeaders() });
      
      toast.success('Viewer added successfully');
      setSelectedViewerToAdd('');
      fetchQueryViewers(showViewersModal);
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to add viewer');
    }
  };

  // Remove Viewer handler
  const handleRemoveViewer = async (viewerId) => {
    if (!showViewersModal) return;
    try {
      let endpoint;
      if (showViewersModal._source === 'inquiry') {
        endpoint = `${API}/inquiry/queries/${showViewersModal.id}/viewers`;
      } else {
        endpoint = `${API}/support/queries/${showViewersModal.id}/viewers`;
      }
      
      await axios.post(endpoint, {
        action: 'remove',
        viewer_id: viewerId
      }, { headers: getAuthHeaders() });
      
      toast.success('Viewer removed successfully');
      fetchQueryViewers(showViewersModal);
      fetchAllQueries();
    } catch (error) {
      toast.error('Failed to remove viewer');
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
      // Use the correct endpoint based on source
      let endpoint;
      if (query._source === 'inquiry') {
        endpoint = `${API}/inquiry/queries/${query.id}`;
      } else if (query._source === 'tracking_page') {
        endpoint = `${API}/support/tracking-tickets/${query.id}`;
      } else {
        endpoint = `${API}/support/queries/${query.id}`;
      }
      
      await axios.delete(endpoint, {
        headers: getAuthHeaders()
      });
      toast.success('Query deleted successfully');
      fetchAllQueries();
    } catch (error) {
      console.error('Delete error:', error.response?.data || error);
      toast.error(error.response?.data?.detail || 'Failed to delete query');
    }
  };

  // Combine and filter all queries
  const allQueriesRaw = [...queries, ...legacyTickets];
  
  // Team members can see queries assigned to them OR where they are viewers OR created by them
  const isTeamMember = user?.role === 'team_member';
  const allQueries = isTeamMember 
    ? allQueriesRaw.filter(q => 
        q.assigned_to === user?.id || 
        q.assigned_to === user?.email ||
        q.viewers?.includes(user?.id) ||
        q.viewers?.includes(user?.email) ||
        q.created_by === user?.id ||
        q.created_by === user?.email ||
        q.added_by === user?.id ||
        q.added_by === user?.email
      )
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
      query.query_details?.toLowerCase().includes(q) ||
      (query.ticket_number && (`#${query.ticket_number}`.includes(q) || query.ticket_number.includes(q.replace('#', ''))))
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
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 rounded-xl font-medium flex items-center gap-2 transition-all ${
            activeTab === 'settings'
              ? 'bg-slate-700 text-white shadow-lg'
              : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {/* Filters — hide when on settings tab */}
      {activeTab !== 'settings' && (
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search by name, phone, details, #ticket..."
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
      )} {/* end of filters conditional */}

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : activeTab === 'settings' ? (
        /* ── Notification Settings ── */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-[#1E3A5F] text-base mb-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-500" />WhatsApp Notification Phones
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Comma-separated phone numbers that receive WhatsApp alerts for overdue queries and assignments (when an assignee has no phone configured). Format: 919876543210 (country code + number, no +).
            </p>
            {notificationPhones.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {notificationPhones.map(p => (
                  <span key={p} className="px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-full text-sm font-mono">{p}</span>
                ))}
              </div>
            )}
            <div className="flex gap-3 items-start">
              <input
                type="text"
                value={notifPhoneInput || notificationPhones.join(', ')}
                onChange={e => setNotifPhoneInput(e.target.value)}
                placeholder="e.g. 919920920188, 918369508043"
                className="flex-1 h-10 px-4 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                onClick={saveNotificationSettings}
                disabled={savingNotif}
                className="px-5 h-10 bg-[#1E3A5F] text-white rounded-lg text-sm font-semibold hover:bg-[#2a4f82] transition-colors disabled:opacity-50"
              >
                {notifSaved ? 'Saved!' : savingNotif ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-[#1E3A5F] text-base mb-1 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-red-500" />Reset Overdue Notifications
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              All open tickets that were previously marked as "notified" will be reset so they trigger a fresh WhatsApp alert on the next scheduler run (every 30 minutes). Use this if notifications were misconfigured and you want to re-send them.
            </p>
            <button
              onClick={resetOverdueFlags}
              disabled={resetingOverdue}
              className="px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              {resetingOverdue ? 'Resetting...' : 'Reset Overdue Flags for Open Tickets'}
            </button>
          </div>

          {/* ── Assign Missing Ticket IDs ── */}
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h3 className="font-bold text-[#1E3A5F] text-base mb-1 flex items-center gap-2">
              <Hash className="w-4 h-4 text-indigo-500" />Assign Missing Ticket IDs
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Scans all tickets across every support collection and assigns a sequential ticket ID to any that are missing one. Tickets already having an ID are left untouched. The list refreshes automatically after running.
            </p>
            <button
              onClick={backfillTicketIds}
              disabled={backfillingTickets}
              data-testid="backfill-ticket-ids-btn"
              className="px-5 py-2.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {backfillingTickets ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Scanning & assigning...
                </>
              ) : (
                <>
                  <Hash className="w-4 h-4" />
                  Assign Missing Ticket IDs
                </>
              )}
            </button>
            {backfillResult && (
              <div className={`mt-4 p-4 rounded-xl text-sm ${backfillResult.error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-800'}`}
                data-testid="backfill-result">
                {backfillResult.error ? (
                  <p>{backfillResult.error}</p>
                ) : (
                  <>
                    <p className="font-semibold mb-2">
                      {backfillResult.updated === 0
                        ? 'All tickets already have IDs — nothing to update.'
                        : `${backfillResult.updated} ticket${backfillResult.updated !== 1 ? 's' : ''} assigned new IDs. Next ID: #${backfillResult.next_ticket_number}`}
                    </p>
                    {backfillResult.breakdown && backfillResult.updated > 0 && (
                      <ul className="space-y-1 text-xs text-green-700">
                        {Object.entries(backfillResult.breakdown).filter(([,v]) => v > 0).map(([col, count]) => (
                          <li key={col}>• {col.replace(/_/g, ' ')}: {count} ticket{count !== 1 ? 's' : ''}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
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
                  {/* Ticket Number Badge - prominent */}
                  {query.ticket_number && (
                    <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-slate-800 text-white tracking-wide" data-testid={`ticket-number-${query.id}`}>
                      #{query.ticket_number}
                    </span>
                  )}
                  {isOverdue(query) && (
                    <span className="badge-status bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Overdue
                    </span>
                  )}
                  <span className={`badge-status ${query.status === 'open' ? 'bg-blue-100 text-blue-700' : query.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : query.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                    {query.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                  {formatResolutionTime(query) && (
                    <span
                      className="badge-status bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1"
                      title="Time from created to resolved"
                      data-testid={`resolution-time-${query.id}`}
                    >
                      <Clock className="w-3 h-3" />
                      Resolved in {formatResolutionTime(query)}
                    </span>
                  )}
                  {getQueryTypeBadge(query.query_type)}
                  {/* Related To Sub-category */}
                  {query.related_to && (
                    <span className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600 font-medium">
                      → {(RELATED_TO_OPTIONS[query.query_type] || RELATED_TO_OPTIONS.other).find(r => r.value === query.related_to)?.label || query.related_to?.replace(/_/g, ' ')}
                    </span>
                  )}
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
                {(query.created_by_name || query.added_by_name || query.added_by) && (
                  <span className="text-xs px-2 py-1 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Created by: {query.created_by_name || query.added_by_name || getAssignedUserName(query.added_by) || query.added_by}
                  </span>
                )}
                {query.viewers && query.viewers.length > 0 && (
                  <span className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-700 flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {query.viewers.length} viewer{query.viewers.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {(query.query_details || query.message) && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-1">Original Message:</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{query.query_details || query.message}</p>
                </div>
              )}
              
              {/* Replies Preview */}
              {query.replies && query.replies.length > 0 && (
                <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {query.replies.length} {query.replies.length === 1 ? 'Reply' : 'Replies'}
                  </p>
                  {query.replies.length > 0 && (
                    <p className="text-sm text-blue-800 truncate">
                      Latest: {query.replies[query.replies.length - 1]?.text?.substring(0, 80)}...
                    </p>
                  )}
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
                    onClick={() => {
                      setShowReplyModal(query);
                      fetchQueryReplies(query.id);
                    }}
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
                      setShowViewersModal(query);
                      fetchQueryViewers(query);
                    }}
                    className="flex items-center gap-1 text-violet-600 border-violet-200 hover:bg-violet-50"
                    data-testid={`viewers-${query.id}`}
                  >
                    <Users className="w-4 h-4" />
                    Viewers {query.viewers?.length > 0 && `(${query.viewers.length})`}
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

                  {/* Raise PO — only for kit_related tickets */}
                  {query.query_type === 'kit_related' && (
                    query.po_info?.po_number ? (
                      <a
                        href={query.po_info.tracking_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-md bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
                        data-testid={`view-po-${query.id}`}
                        title={`PO ${query.po_info.po_number} raised · Click to track`}
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        PO {query.po_info.po_number}
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => openRaisePOModal(query)}
                        className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                        data-testid={`raise-po-${query.id}`}
                        title="Raise a PO to the vendor panel for kit replacement"
                      >
                        <Truck className="w-4 h-4" />
                        Raise PO
                      </Button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Reply Modal - Chat Style */}
      <Dialog open={!!showReplyModal} onOpenChange={() => { setShowReplyModal(null); setQueryReplies([]); setReplyAttachment(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0" preventClose>
          <DialogHeader className="flex-shrink-0 p-6 pb-0">
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#D63031]" />
              Query Conversation
              {showReplyModal?.ticket_number && (
                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-md bg-slate-800 text-white ml-1">
                  #{showReplyModal.ticket_number}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {showReplyModal && (
            <div className="flex flex-col flex-1 min-h-0 p-6 pt-4">
              {/* Query Info Header */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 mb-4 flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-slate-800">{showReplyModal.name}</p>
                    <p className="text-xs text-slate-500">{showReplyModal.phone} • {showReplyModal.email || 'No email'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    showReplyModal.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    showReplyModal.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {showReplyModal.status?.replace('_', ' ')}
                  </span>
                </div>
                {/* Original Message - Always Visible */}
                <div className="bg-white rounded-lg p-3 border border-slate-200 mt-3">
                  <p className="text-xs font-medium text-slate-500 mb-1">Original Message</p>
                  <p className="text-sm text-slate-700">{showReplyModal.message || showReplyModal.details || 'No details provided'}</p>
                  <p className="text-xs text-slate-400 mt-2 flex items-center gap-3 flex-wrap">
                    <span>Created {showReplyModal.created_at ? format(new Date(showReplyModal.created_at), 'MMM d, yyyy h:mm a') : ''}</span>
                    {formatResolutionTime(showReplyModal) && (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Clock className="w-3 h-3" /> Resolved in {formatResolutionTime(showReplyModal)}
                        {showReplyModal.resolved_at && (
                          <span className="text-slate-400 font-normal ml-1">({format(new Date(showReplyModal.resolved_at), 'MMM d, h:mm a')})</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>

                {/* Raise PO button — only for kit_related queries */}
                {showReplyModal.query_type === 'kit_related' && (
                  <div className="mt-3 flex items-center justify-between bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-amber-700" />
                      <span className="text-sm text-amber-900 font-medium">Need to send replacement kit components?</span>
                    </div>
                    {showReplyModal.po_info?.po_number ? (
                      <a
                        href={showReplyModal.po_info.tracking_url || '#'}
                        target="_blank"
                        rel="noreferrer"
                        data-testid="view-po-link"
                        className="text-xs font-semibold px-3 py-1.5 rounded-md bg-green-100 text-green-700 border border-green-200 inline-flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" /> PO {showReplyModal.po_info.po_number}
                      </a>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => openRaisePOModal(showReplyModal)}
                        data-testid="raise-po-btn"
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-3 py-1.5 h-auto"
                      >
                        <Truck className="w-3 h-3 mr-1" />
                        Raise PO
                      </Button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Chat Messages Area */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[100px] max-h-[200px] pr-2">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : queryReplies.length === 0 ? (
                  <div className="text-center py-6">
                    <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">No replies yet. Start the conversation!</p>
                  </div>
                ) : (
                  queryReplies.map((reply, idx) => (
                    <div 
                      key={reply.id || idx}
                      className={`flex ${reply.role === 'customer' ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`max-w-[80%] rounded-lg p-3 ${
                        reply.role === 'customer' 
                          ? 'bg-slate-100 text-slate-800' 
                          : 'bg-[#D63031] text-white'
                      }`}>
                        {reply.text && <p className="text-sm">{reply.text}</p>}
                        {/* Attachment */}
                        {reply.attachment && (
                          <div className={`mt-2 flex items-center gap-2 text-xs rounded p-2 ${
                            reply.role === 'customer' ? 'bg-white border border-slate-200' : 'bg-red-700'
                          }`}>
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            <a
                              href={reply.attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`truncate underline ${reply.role === 'customer' ? 'text-blue-600' : 'text-red-100 hover:text-white'}`}
                            >
                              {reply.attachment.original_name || reply.attachment.filename}
                            </a>
                          </div>
                        )}
                        <div className={`flex items-center gap-2 mt-2 text-xs ${
                          reply.role === 'customer' ? 'text-slate-500' : 'text-red-100'
                        }`}>
                          <span className="font-medium">{reply.by || 'Admin'}</span>
                          <span>•</span>
                          <span>{reply.created_at ? format(new Date(reply.created_at), 'MMM d, h:mm a') : ''}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Reply Input - Fixed at bottom */}
              <div className="flex-shrink-0 border-t pt-4 bg-white">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply..."
                  className="w-full min-h-[60px] max-h-[100px] resize-none mb-2"
                  data-testid="reply-input"
                />
                {/* Attachment preview */}
                {replyAttachment && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                    <Paperclip className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <span className="truncate text-slate-700 flex-1">{replyAttachment.original_name}</span>
                    <button onClick={() => setReplyAttachment(null)} className="text-slate-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {/* Attach file button row */}
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="file"
                    ref={replyFileInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
                    onChange={handleReplyFileSelect}
                  />
                  <button
                    type="button"
                    onClick={() => replyFileInputRef.current?.click()}
                    disabled={uploadingAttachment}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    data-testid="reply-attach-btn"
                  >
                    {uploadingAttachment ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Paperclip className="w-3.5 h-3.5" />
                    )}
                    {uploadingAttachment ? 'Uploading...' : 'Attach File'}
                  </button>
                  <span className="text-xs text-slate-400">PDF, DOC, Image, Excel (max 10MB)</span>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => { setShowReplyModal(null); setQueryReplies([]); setReplyAttachment(null); }} className="flex-1">
                    Close
                  </Button>
                  <Button 
                    onClick={handleReply} 
                    disabled={!replyText.trim() && !replyAttachment}
                    className="flex-1 bg-[#D63031] hover:bg-[#b52828]" 
                    data-testid="submit-reply"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Reply
                  </Button>
                </div>
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
                        disabled={assignSubmitting}
                        className={`w-full p-3 rounded-lg border text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 ${
                          showAssignModal.assigned_to === teamUser.id 
                            ? 'border-indigo-500 bg-indigo-50' 
                            : 'border-slate-200'
                        } ${assignSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                <Button variant="outline" onClick={() => { setShowAssignModal(null); setAssignDeadline(''); }} className="flex-1" disabled={assignSubmitting}>
                  Cancel
                </Button>
                {showAssignModal.assigned_to && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleAssignQuery('')}
                    disabled={assignSubmitting}
                    className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  >
                    {assignSubmitting ? 'Processing...' : 'Unassign'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Ticket Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#D63031]" />
              Create Support Ticket
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* User Type Selector - FIRST AT TOP */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-[#1E3A5F] mb-3">User Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {INQUIRY_TYPES.map((type) => {
                  const IconComponent = type.value === 'school' ? Building2 : type.value === 'teacher' ? User : GraduationCap;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => {
                        const defaults = DEFAULT_RELATED_TO[type.value] || DEFAULT_RELATED_TO.student;
                        setNewTicket({ 
                          ...newTicket, 
                          inquiry_type: type.value,
                          query_type: defaults.query_type,
                          related_to: defaults.related_to
                        });
                        // Reset school picker when switching types
                        if (type.value !== 'school') {
                          setSelectedSchool(null);
                          setSchoolContacts([]);
                          setSchoolSearchQuery('');
                          setShowSchoolDropdown(false);
                        }
                      }}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        newTicket.inquiry_type === type.value
                          ? 'border-[#1E3A5F] bg-white text-[#1E3A5F] shadow-sm'
                          : 'border-blue-200 bg-blue-50/50 text-slate-600 hover:border-blue-300 hover:bg-white'
                      }`}
                    >
                      <IconComponent className="w-5 h-5 mx-auto mb-1" />
                      <span className="block text-sm font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
            {/* School Picker - shown when School type is selected */}
            {newTicket.inquiry_type === 'school' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-3">
                <label className="block text-sm font-medium text-[#1E3A5F]">School Name *</label>
                <div className="relative">
                  <Input
                    value={schoolSearchQuery}
                    onChange={(e) => searchSchools(e.target.value)}
                    placeholder="Search school by name..."
                    className="w-full"
                    data-testid="school-search-input"
                  />
                  {showSchoolDropdown && schoolSearchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {schoolSearchResults.map((school, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSchool(school)}
                          className="w-full px-3 py-2 text-left hover:bg-amber-50 border-b last:border-b-0"
                          data-testid={`school-option-${idx}`}
                        >
                          <p className="font-medium text-sm">{school.school_name}</p>
                          <p className="text-xs text-slate-500">{school.location || school.address || ''} {school.status ? `(${school.status})` : ''}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* School Contacts */}
                {selectedSchool && schoolContacts.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[#1E3A5F] mb-2">
                      Select Contact ({schoolContacts.length})
                    </label>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto">
                      {schoolContacts.map((contact, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => selectSchoolContact(contact)}
                          className={`w-full p-2.5 rounded-lg border text-left transition-all ${
                            newTicket.phone === contact.phone && newTicket.name === contact.name
                              ? 'border-[#1E3A5F] bg-blue-50 shadow-sm'
                              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                          }`}
                          data-testid={`school-contact-${idx}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-[#1E3A5F]">{contact.name || 'N/A'}</p>
                              <p className="text-xs text-slate-500">{contact.phone || ''} {contact.email ? `| ${contact.email}` : ''}</p>
                            </div>
                            {contact.role && (
                              <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{contact.role}</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            
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
            
            {/* Add User Button */}
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!newTicket.name || !newTicket.phone) {
                    toast.error('Enter Name and Phone to add user');
                    return;
                  }
                  // Check for duplicate
                  const isDuplicate = multipleUsers.some(u => u.phone === newTicket.phone);
                  if (isDuplicate) {
                    toast.error('User with this phone already added');
                    return;
                  }
                  setMultipleUsers([...multipleUsers, { 
                    name: newTicket.name, 
                    phone: newTicket.phone, 
                    email: newTicket.email 
                  }]);
                  setNewTicket({ ...newTicket, name: '', phone: '', email: '' });
                  toast.success('User added to list');
                }}
                className="flex items-center gap-1 text-green-700 border-green-300 hover:bg-green-50"
              >
                <UserPlus className="w-4 h-4" />
                Add User to List
              </Button>
              {multipleUsers.length > 0 && (
                <span className="text-sm text-slate-500">
                  {multipleUsers.length} user{multipleUsers.length > 1 ? 's' : ''} added
                </span>
              )}
            </div>
            
            {/* List of Added Users */}
            {multipleUsers.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium text-slate-600 mb-2">Users to create tickets for:</p>
                {multipleUsers.map((user, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-slate-200">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium">{user.name}</span>
                      <span className="text-xs text-slate-500">{user.phone}</span>
                      {user.email && <span className="text-xs text-slate-400">• {user.email}</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMultipleUsers(multipleUsers.filter((_, i) => i !== idx));
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Query Type (Category)</label>
                <select
                  value={newTicket.query_type}
                  onChange={(e) => {
                    const newQueryType = e.target.value;
                    const relatedOptions = RELATED_TO_OPTIONS[newQueryType] || RELATED_TO_OPTIONS.other;
                    setNewTicket({ 
                      ...newTicket, 
                      query_type: newQueryType,
                      related_to: relatedOptions[0]?.value || 'other'
                    });
                  }}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {QUERY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Related To (Sub-category)</label>
                <select
                  value={newTicket.related_to || ''}
                  onChange={(e) => setNewTicket({ ...newTicket, related_to: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {(RELATED_TO_OPTIONS[newTicket.query_type] || RELATED_TO_OPTIONS.other).map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
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
                setMultipleUsers([]);
                setAttachments([]);
                setAudioBlob(null);
                setAudioUrl(null);
              }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} className="flex-1 bg-[#D63031] hover:bg-red-600">
                {multipleUsers.length > 0 
                  ? `Create ${multipleUsers.length} Ticket${multipleUsers.length > 1 ? 's' : ''}`
                  : 'Create Ticket'
                }
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
                    <div key={note.id || idx} className="bg-amber-50 border border-amber-200 rounded-lg p-3 group relative">
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded text-red-500"
                        title="Delete note"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <p className="text-sm text-slate-700 pr-8">{note.text}</p>
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" preventClose>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-blue-600" />
              Edit Query
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* User Type Selector */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-[#1E3A5F] mb-2">User Type</label>
              <div className="grid grid-cols-3 gap-2">
                {INQUIRY_TYPES.map((type) => {
                  const IconComponent = type.value === 'school' ? Building2 : type.value === 'teacher' ? User : GraduationCap;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, inquiry_type: type.value })}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        editForm.inquiry_type === type.value
                          ? 'border-[#1E3A5F] bg-white text-[#1E3A5F] shadow-sm'
                          : 'border-blue-200 bg-blue-50/50 text-slate-600 hover:border-blue-300'
                      }`}
                    >
                      <IconComponent className="w-4 h-4 mx-auto mb-1" />
                      <span className="block text-xs font-medium">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            
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
                <label className="text-sm font-medium text-slate-700">Query Type (Category)</label>
                <select
                  value={editForm.query_type || ''}
                  onChange={(e) => {
                    const newQueryType = e.target.value;
                    const relatedOptions = RELATED_TO_OPTIONS[newQueryType] || RELATED_TO_OPTIONS.other;
                    setEditForm({ 
                      ...editForm, 
                      query_type: newQueryType,
                      related_to: relatedOptions[0]?.value || 'other'
                    });
                  }}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {QUERY_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Related To (Sub-category)</label>
                <select
                  value={editForm.related_to || ''}
                  onChange={(e) => setEditForm({ ...editForm, related_to: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  {(RELATED_TO_OPTIONS[editForm.query_type] || RELATED_TO_OPTIONS.other).map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
              <div>
                <label className="text-sm font-medium text-slate-700">Status</label>
                <select
                  value={editForm.status || 'new'}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="new">New</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
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

      {/* Viewers Modal */}
      <Dialog open={!!showViewersModal} onOpenChange={() => { setShowViewersModal(null); setSelectedViewerToAdd(''); setQueryViewers([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-violet-600" />
              Manage Viewers - {showViewersModal?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Created By */}
            {(showViewersModal?.created_by_name || showViewersModal?.added_by_name || showViewersModal?.added_by) && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-xs font-medium text-emerald-700 mb-1">Created By:</p>
                <p className="text-sm text-emerald-800 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {showViewersModal?.created_by_name || showViewersModal?.added_by_name || getAssignedUserName(showViewersModal?.added_by) || showViewersModal?.added_by}
                </p>
              </div>
            )}
            
            {/* Add Viewer */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">Add Viewer</label>
              <div className="flex gap-2">
                <Select value={selectedViewerToAdd} onValueChange={setSelectedViewerToAdd}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamUsers.filter(u => 
                      !queryViewers.some(v => v.id === u.id || v === u.id) &&
                      u.id !== showViewersModal?.created_by &&
                      u.id !== showViewersModal?.added_by
                    ).map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddViewer} className="bg-violet-600 hover:bg-violet-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            {/* Current Viewers */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">
                Current Viewers ({showViewersModal?.viewers?.length || 0})
              </label>
              {loadingViewers ? (
                <div className="text-center py-4">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                </div>
              ) : showViewersModal?.viewers?.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">No viewers added yet</p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {showViewersModal?.viewers?.map((viewerId, idx) => {
                    const viewer = teamUsers.find(u => u.id === viewerId) || queryViewers.find(v => v.id === viewerId);
                    const viewerName = viewer?.name || viewerId;
                    const isCreator = viewerId === showViewersModal?.created_by || viewerId === showViewersModal?.added_by;
                    
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-center justify-between p-2 rounded-lg ${
                          isCreator ? 'bg-emerald-50' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-violet-500" />
                          <span className="text-sm">{viewerName}</span>
                          {isCreator && (
                            <span className="text-xs px-1.5 py-0.5 bg-emerald-200 text-emerald-700 rounded">
                              Creator
                            </span>
                          )}
                        </div>
                        {!isCreator && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveViewer(viewerId)}
                            className="text-red-500 hover:bg-red-50 h-7 w-7 p-0"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            <p className="text-xs text-slate-500">
              Viewers can see this query even if it's not assigned to them. The creator is automatically added as a viewer.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Raise PO Dialog (for kit_related queries) ─────────────────────── */}
      <Dialog open={!!showPOModal} onOpenChange={(open) => !open && setShowPOModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="raise-po-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-600" />
              Raise PO — Kit Replacement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Context line */}
            {showPOModal && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                <div className="flex items-center gap-2 font-semibold mb-0.5">
                  <Package className="w-3.5 h-3.5" />
                  Issue: {(showPOModal.category_label || showPOModal.subcategory_label || (showPOModal.related_to || '').replace(/_/g,' ') || 'Kit Related').toString()}
                </div>
                <div className="text-xs text-amber-700">Ticket #{showPOModal.id?.slice(-8)} · {showPOModal.user_name || showPOModal.name || ''}</div>
              </div>
            )}

            {/* Products */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                <Package className="w-4 h-4" /> Products to Send
                {vendorProducts.length > 0 && (
                  <span className="text-xs font-normal text-slate-400">· {vendorProducts.length} vendor products available</span>
                )}
              </label>
              <div className="space-y-2">
                {poForm.products.map((p, idx) => {
                  const searchText = productSearch[idx] ?? p.product_name ?? '';
                  const filtered = searchText.trim()
                    ? vendorProducts.filter(vp =>
                        vp.name.toLowerCase().includes(searchText.toLowerCase()) ||
                        (vp.sku || '').toLowerCase().includes(searchText.toLowerCase())
                      ).slice(0, 40)
                    : vendorProducts.slice(0, 40);
                  const isOpen = !!productDropdownOpen[idx];
                  return (
                    <div key={idx} className="flex gap-2 items-start">
                      <div className="flex-1 relative">
                        <Input
                          value={searchText}
                          onChange={e => {
                            const v = e.target.value;
                            setProductSearch(s => ({ ...s, [idx]: v }));
                            setProductDropdownOpen(s => ({ ...s, [idx]: true }));
                            // Keep product_name in sync; clear product_id if manually edited
                            updatePoProduct(idx, 'product_name', v);
                            if (p.product_id) updatePoProduct(idx, 'product_id', '');
                          }}
                          onFocus={() => setProductDropdownOpen(s => ({ ...s, [idx]: true }))}
                          onBlur={() => setTimeout(() => setProductDropdownOpen(s => ({ ...s, [idx]: false })), 180)}
                          placeholder={vendorProducts.length ? 'Search vendor catalog… or type a custom name' : 'e.g. Robotics Kit Grade 6'}
                          data-testid={`po-product-name-${idx}`}
                          className="w-full"
                        />
                        {p.product_id && (
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 pointer-events-none">
                            ✓ Vendor SKU
                          </span>
                        )}
                        {isOpen && vendorProducts.length > 0 && (
                          <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-64 overflow-y-auto" data-testid={`po-product-dropdown-${idx}`}>
                            {filtered.length === 0 ? (
                              <div className="px-3 py-2 text-xs text-slate-500 italic">
                                No vendor product matches. You can still submit with this custom name.
                              </div>
                            ) : (
                              filtered.map(vp => (
                                <button
                                  key={vp.id || vp.name}
                                  type="button"
                                  onMouseDown={(e) => { e.preventDefault(); selectVendorProduct(idx, vp); }}
                                  data-testid={`po-product-option-${vp.id || vp.name}`}
                                  className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-slate-100 last:border-b-0 flex items-center justify-between gap-2"
                                >
                                  <div className="min-w-0">
                                    <div className="text-sm text-slate-800 truncate">{vp.name}</div>
                                    {vp.sku && <div className="text-[10px] text-slate-500 font-mono uppercase">{vp.sku}</div>}
                                  </div>
                                  {vp.price != null && (
                                    <span className="text-xs text-slate-500 font-mono whitespace-nowrap">₹{Number(vp.price).toLocaleString('en-IN')}</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                      <Input
                        type="number"
                        min="1"
                        value={p.quantity}
                        onChange={e => updatePoProduct(idx, 'quantity', e.target.value)}
                        placeholder="Qty"
                        data-testid={`po-product-qty-${idx}`}
                        className="w-20 flex-shrink-0"
                      />
                      {poForm.products.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => removePoProductRow(idx)} className="text-red-600 flex-shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addPoProductRow} className="mt-2" data-testid="po-add-product">
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
              </Button>
            </div>

            {/* Delivery Date */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Expected Delivery Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={poForm.delivery_date}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setPoForm(p => ({ ...p, delivery_date: e.target.value }))}
                data-testid="po-delivery-date"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Delivery Address <span className="text-red-500">*</span></label>
              <Textarea
                rows={2}
                value={poForm.delivery_address}
                onChange={e => setPoForm(p => ({ ...p, delivery_address: e.target.value }))}
                placeholder="Full address including city & pincode"
                data-testid="po-address"
              />
            </div>

            {/* Contact person + number */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Contact Person <span className="text-red-500">*</span></label>
                <Input
                  value={poForm.contact_person}
                  onChange={e => setPoForm(p => ({ ...p, contact_person: e.target.value }))}
                  placeholder="Receiver name"
                  data-testid="po-contact-person"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-slate-700 mb-1 block">Contact Number <span className="text-red-500">*</span></label>
                <Input
                  value={poForm.contact_number}
                  onChange={e => setPoForm(p => ({ ...p, contact_number: e.target.value }))}
                  placeholder="10-digit phone"
                  data-testid="po-contact-number"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-1 block">Notes (optional)</label>
              <Textarea
                rows={2}
                value={poForm.notes}
                onChange={e => setPoForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Any special instructions for the vendor"
                data-testid="po-notes"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setShowPOModal(null)} disabled={raisingPO}>
                Cancel
              </Button>
              <Button type="button" onClick={handleRaisePO} disabled={raisingPO} className="bg-amber-600 hover:bg-amber-700 text-white" data-testid="po-confirm-btn">
                {raisingPO ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Raising PO...</>
                ) : (
                  <><CheckCircle className="w-4 h-4 mr-2" /> Raise PO to Vendor</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSupportUnified;
