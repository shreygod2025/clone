import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Building2, Phone, MapPin, Plus, MessageSquare, Calendar, Archive, CalendarClock, CheckCircle2, CheckCircle, Video, Users, User, Mail, Layers, DollarSign, UserPlus, Send, Clock, Edit, Save, RefreshCw, X, Upload, Download, FileSpreadsheet, AlertCircle, Gift, FileText, Receipt, Paperclip, History, Ticket, FileCheck, ChevronDown, ChevronUp, Mic, MicOff, Play, Pause, Trash2 } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';
import Papa from 'papaparse';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TICKET_SOURCE_OPTIONS = [
  { value: 'school_crm', label: 'School CRM' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'Email' },
  { value: 'school_visit', label: 'School Visit' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'referral', label: 'Referral' },
  { value: 'other', label: 'Other' },
];

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
  { value: 'renewal_meeting', label: 'Renewal Meeting', color: 'bg-teal-500' },
  { value: 'renewed', label: 'Renewed', color: 'bg-emerald-500' },
  { value: 'lost', label: 'Lost', color: 'bg-red-500' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-400' },
];

// Ticket query types with FAQ auto-fill
const TICKET_QUERIES = [
  { type: 'kit_delivery', label: 'Kit Delivery Issue', faq: 'We have not received the kit delivery yet / items are missing or damaged. Please help resolve this.' },
  { type: 'payment_query', label: 'Payment Query', faq: 'We have a question regarding payment / invoice / receipt. Please clarify.' },
  { type: 'teacher_training', label: 'Teacher Training', faq: 'We need assistance with teacher training scheduling / materials / additional sessions.' },
  { type: 'technical_support', label: 'Technical Support', faq: 'We are facing technical issues with the equipment / software. Please provide support.' },
  { type: 'curriculum_query', label: 'Curriculum Query', faq: 'We have questions about the curriculum content / lesson plans / assessments.' },
  { type: 'schedule_change', label: 'Schedule Change', faq: 'We need to change the class schedule / timing. Please help update.' },
  { type: 'contract_renewal', label: 'Contract/Renewal', faq: 'We have questions regarding contract terms / renewal options / pricing.' },
  { type: 'feedback_complaint', label: 'Feedback/Complaint', faq: 'We have feedback / concerns about the service that need to be addressed.' },
  { type: 'other', label: 'Other', faq: '' },
];

// Related To sub-categories for school tickets
const TICKET_RELATED_TO_OPTIONS = {
  kit_delivery: [
    { value: 'not_received', label: 'Kit Not Received' },
    { value: 'items_missing', label: 'Items Missing' },
    { value: 'items_damaged', label: 'Items Damaged' },
    { value: 'wrong_items', label: 'Wrong Items Delivered' },
    { value: 'delivery_delay', label: 'Delivery Delay' },
    { value: 'other', label: 'Other' },
  ],
  payment_query: [
    { value: 'invoice_request', label: 'Invoice Request' },
    { value: 'receipt_request', label: 'Receipt Request' },
    { value: 'payment_pending', label: 'Payment Pending' },
    { value: 'payment_failed', label: 'Payment Failed' },
    { value: 'refund_request', label: 'Refund Request' },
    { value: 'emi_query', label: 'EMI / Installment Query' },
    { value: 'other', label: 'Other' },
  ],
  teacher_training: [
    { value: 'training_schedule', label: 'Training Schedule' },
    { value: 'training_materials', label: 'Training Materials' },
    { value: 'additional_session', label: 'Additional Session Needed' },
    { value: 'trainer_feedback', label: 'Trainer Feedback' },
    { value: 'certification', label: 'Certification Query' },
    { value: 'other', label: 'Other' },
  ],
  technical_support: [
    { value: 'equipment_issue', label: 'Equipment Not Working' },
    { value: 'software_bug', label: 'Software Bug / Error' },
    { value: 'login_issue', label: 'Login / Access Issue' },
    { value: 'connectivity', label: 'Connectivity Issue' },
    { value: 'setup_help', label: 'Setup Assistance Needed' },
    { value: 'other', label: 'Other' },
  ],
  curriculum_query: [
    { value: 'lesson_plan', label: 'Lesson Plan Query' },
    { value: 'content_query', label: 'Content Query' },
    { value: 'assessment_help', label: 'Assessment Help' },
    { value: 'grade_alignment', label: 'Grade Alignment' },
    { value: 'additional_resources', label: 'Additional Resources' },
    { value: 'other', label: 'Other' },
  ],
  schedule_change: [
    { value: 'timing_change', label: 'Change Class Timing' },
    { value: 'day_change', label: 'Change Class Day' },
    { value: 'batch_change', label: 'Batch Change' },
    { value: 'temporary_pause', label: 'Temporary Pause' },
    { value: 'resume_classes', label: 'Resume Classes' },
    { value: 'other', label: 'Other' },
  ],
  contract_renewal: [
    { value: 'renewal_query', label: 'Renewal Query' },
    { value: 'pricing_discussion', label: 'Pricing Discussion' },
    { value: 'contract_terms', label: 'Contract Terms' },
    { value: 'upgrade_package', label: 'Upgrade Package' },
    { value: 'cancellation', label: 'Cancellation Request' },
    { value: 'other', label: 'Other' },
  ],
  feedback_complaint: [
    { value: 'positive_feedback', label: 'Positive Feedback' },
    { value: 'service_complaint', label: 'Service Complaint' },
    { value: 'quality_concern', label: 'Quality Concern' },
    { value: 'suggestion', label: 'Suggestion' },
    { value: 'escalation', label: 'Escalation' },
    { value: 'other', label: 'Other' },
  ],
  other: [
    { value: 'general_query', label: 'General Query' },
    { value: 'information_request', label: 'Information Request' },
    { value: 'other', label: 'Other' },
  ],
};

const CITIES = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
const BOARDS = ['CBSE', 'ICSE', 'IGCSE', 'State Board', 'IB'];
const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', 
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', 
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00'
];

// Helper function to get absolute URL for uploads
const getAbsoluteUrl = (url) => {
  if (!url) return '';
  // If already absolute, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // If relative path starting with /api/files or /api/uploads, prepend the API base
  if (url.startsWith('/api/files') || url.startsWith('/api/uploads')) {
    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    return `${baseUrl}${url}`;
  }
  // For other relative paths, also prepend API base
  if (url.startsWith('/')) {
    const baseUrl = process.env.REACT_APP_BACKEND_URL || '';
    return `${baseUrl}${url}`;
  }
  return url;
};

// LMS Setup Section Component
const LMSSetupSection = ({ step, schoolId, onUpdate, authToken }) => {
  const [students, setStudents] = useState(step.data?.students_list || []);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);
  
  const SAMPLE_TEMPLATE_URL = 'https://customer-assets.emergentagent.com/job_oll-multiuser/artifacts/ohnqw227_student_upload_template%20%288%29.xlsx';
  
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];
    
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      toast.error('Please upload a CSV or Excel file');
      return;
    }
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedStudents = results.data
          .filter(row => row.Name && row.Username && row.Password)
          .map(row => ({
            name: row.Name || row.name || '',
            username: row.Username || row.username || '',
            password: row.Password || row.password || '',
            class: row.Class || row.class || ''
          }));
        
        if (parsedStudents.length === 0) {
          toast.error('No valid student data found. Please check the file format.');
          return;
        }
        
        setStudents(parsedStudents);
        setShowPreview(true);
        toast.success(`Parsed ${parsedStudents.length} students`);
      },
      error: (error) => {
        toast.error(`Error parsing file: ${error.message}`);
      }
    });
  };
  
  const handleSaveStudents = async () => {
    if (students.length === 0) {
      toast.error('No students to upload');
      return;
    }
    
    setUploading(true);
    try {
      await axios.post(`${API}/schools/${schoolId}/lms-students`, {
        students: students
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      toast.success(`Successfully uploaded ${students.length} student credentials`);
      onUpdate({ data: { students_list: students, students_uploaded: students.length } });
      setShowPreview(false);
    } catch (err) {
      toast.error('Failed to upload student credentials');
    } finally {
      setUploading(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
          <Users className="w-4 h-4" />
          Upload Student Credentials
        </h4>
        <p className="text-sm text-blue-700 mb-3">
          Upload a CSV/Excel file with student names, usernames, and passwords for LMS access.
        </p>
        
        <div className="flex flex-wrap gap-2 mb-3">
          <a 
            href={SAMPLE_TEMPLATE_URL}
            download
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-300 text-blue-700 rounded-lg text-sm hover:bg-blue-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download Sample Template
          </a>
          
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </Button>
        </div>
        
        {/* Existing Data */}
        {step.data?.students_uploaded > 0 && !showPreview && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">{step.data.students_uploaded} students uploaded</span>
            </div>
            {step.data?.upload_date && (
              <p className="text-xs text-green-600 mt-1">
                Uploaded on {format(new Date(step.data.upload_date), 'MMM d, yyyy h:mm a')}
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Preview Table */}
      {showPreview && students.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b flex items-center justify-between">
            <span className="font-medium text-sm">{students.length} Students to Upload</span>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => { setShowPreview(false); setStudents([]); }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleSaveStudents}
                disabled={uploading}
                className="bg-green-600 hover:bg-green-700"
              >
                {uploading ? 'Uploading...' : 'Save & Upload'}
              </Button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Username</th>
                  <th className="text-left px-3 py-2 font-medium">Password</th>
                  <th className="text-left px-3 py-2 font-medium">Class</th>
                </tr>
              </thead>
              <tbody>
                {students.slice(0, 50).map((student, idx) => (
                  <tr key={idx} className="border-t hover:bg-slate-50">
                    <td className="px-3 py-2">{student.name}</td>
                    <td className="px-3 py-2 font-mono text-xs">{student.username}</td>
                    <td className="px-3 py-2 font-mono text-xs">{student.password}</td>
                    <td className="px-3 py-2">{student.class || '-'}</td>
                  </tr>
                ))}
                {students.length > 50 && (
                  <tr className="border-t bg-slate-50">
                    <td colSpan={4} className="px-3 py-2 text-center text-slate-500 text-xs">
                      ... and {students.length - 50} more students
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminSchoolCRM = () => {
  const { getAuthHeaders, user } = useAuth();
  const [inquiries, setInquiries] = useState([]);
  const [teamUsers, setTeamUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchAllStatuses, setSearchAllStatuses] = useState(false);
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
  const [showLostReasonModal, setShowLostReasonModal] = useState(null);
  const [lostReason, setLostReason] = useState('');
  const [showRenewalMeetingModal, setShowRenewalMeetingModal] = useState(null);
  const [renewalMeetingData, setRenewalMeetingData] = useState({ date: null, time: '', type: 'offline', notes: '', link: '', address: '' });
  const [showRenewalConvertModal, setShowRenewalConvertModal] = useState(null);
  const [renewalConvertData, setRenewalConvertData] = useState({
    offering: '',
    model: '',
    book_type: '',
    kit_type: '',
    training_type: '',
    pricing_type: 'per_student', // 'per_student', 'fixed', 'both'
    fixed_price: '',
    grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
    total_students: 0,
    total_amount: 0,
    school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
    payment_mode: 'from_school',
    payment_method: '',
    payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
    contract_start: '',
    contract_end: '',
    mou_url: '',
    parent_circular_url: '',
    payment_link: '',
    // School share fields
    school_share_type: 'none', // 'none', 'percentage', 'amount'
    school_share_calc: 'lumpsum', // 'per_student', 'lumpsum'
    school_share_value: '',
    school_share_amount: 0,
    // GP share fields
    gp_share_type: 'none', // 'none', 'percentage', 'amount'
    gp_share_calc: 'lumpsum', // 'per_student', 'lumpsum'
    gp_share_value: '',
    gp_share_amount: 0
  });
  const [uploadingRenewalMOU, setUploadingRenewalMOU] = useState(false);
  const [meetingDoneData, setMeetingDoneData] = useState({ 
    notes: '', 
    quoted_price: '',
    followup_type: '', // 'message' or 'meeting'
    followup_date: null, 
    followup_time: '' 
  });
  const [newMeetingData, setNewMeetingData] = useState({ date: null, time: '', type: 'offline', notes: '' });
  const [newComment, setNewComment] = useState('');
  
  // Relationship Manager & Ticket states
  const [showAssignRMModal, setShowAssignRMModal] = useState(null);
  const [relationshipManagers, setRelationshipManagers] = useState([]);
  const [showRaiseTicketModal, setShowRaiseTicketModal] = useState(null);
  const [ticketData, setTicketData] = useState({ 
    query_type: '', related_to: '', subject: '', description: '', priority: 'medium', 
    contact_name: '', contact_phone: '', contact_email: '', source: 'school_crm',
    user_type: 'school' // school, teacher, student
  });
  
  // Ticket Attachments & Voice Note
  const [ticketAttachments, setTicketAttachments] = useState([]);
  const [ticketRecording, setTicketRecording] = useState(false);
  const [ticketAudioBlob, setTicketAudioBlob] = useState(null);
  const [ticketAudioUrl, setTicketAudioUrl] = useState(null);
  const [ticketRecordTime, setTicketRecordTime] = useState(0);
  const [ticketUploading, setTicketUploading] = useState(false);
  const ticketMediaRecorderRef = useRef(null);
  const ticketAudioChunksRef = useRef([]);
  const ticketRecordingIntervalRef = useRef(null);
  const ticketAudioPlayerRef = useRef(null);
  const ticketFileInputRef = useRef(null);
  
  // Document upload states
  const [showDocumentsModal, setShowDocumentsModal] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  
  // View/Edit states
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ school_name: '', contact_name: '', phone: '', email: '', meeting_date: '', meeting_time: '', notes: '' });
  const [viewComment, setViewComment] = useState('');
  
  // School History states
  const [schoolHistory, setSchoolHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistoryTab, setShowHistoryTab] = useState(false);
  
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
  const [followupData, setFollowupData] = useState({ 
    followup_type: '', // 'message' or 'meeting'
    date: null, 
    time: '',
    comment: '', 
    auto_email: false,
    mode: '', // 'online' or 'offline' (for meeting only)
    meeting_link: '', // if online
    address: '' // if offline
  });
  // Contact Management Filters
  const [contactCityFilter, setContactCityFilter] = useState('all');
  const [contactRoleFilter, setContactRoleFilter] = useState('all');
  const [contactStageFilter, setContactStageFilter] = useState('all');
  const [onboardData, setOnboardData] = useState({
    offering: '', // Select from offerings
    model: '',
    book_type: '', // individual_books, no_books
    kit_type: '', // lab_setup, individual, no_kit
    training_type: '', // student_training, teacher_training
    pricing_type: 'per_student', // 'per_student', 'fixed', 'both'
    fixed_price: '',
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
    parent_circular_url: '', // Parent circular URL (for from_student payment mode)
    payment_link: '', // Payment link (for online payment method)
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
    referred_by: '',
    notes: '',
    quoted_price: '',
    selected_offerings: [],
    assign_option: 'self' // 'self' or 'admin'
  });

  useEffect(() => {
    fetchInquiries();
    fetchTeamUsers();
    fetchOfferings();
    fetchRelationshipManagers();
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

  // Fetch school history when viewing a school
  useEffect(() => {
    const fetchSchoolHistory = async () => {
      if (!viewInquiry?.id) {
        setSchoolHistory([]);
        return;
      }
      setLoadingHistory(true);
      try {
        const response = await axios.get(`${API}/schools/${viewInquiry.id}/history`, {
          headers: getAuthHeaders()
        });
        setSchoolHistory(response.data?.history || []);
      } catch (error) {
        console.error('Failed to fetch school history:', error);
        setSchoolHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchSchoolHistory();
  }, [viewInquiry?.id]);

  // Get this week's data for dashboard
  const getThisWeekData = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Regular meetings (from new leads)
    const regularMeetings = inquiries.filter(i => {
      if (!i.meeting_date) return false;
      const meetingDate = new Date(i.meeting_date);
      return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
    });

    // Renewal meetings (from renewal_meeting status schools)
    const renewalMeetings = inquiries.filter(i => {
      if (!i.renewal_meeting_date || i.status !== 'renewal_meeting') return false;
      const meetingDate = new Date(i.renewal_meeting_date);
      return meetingDate >= startOfWeek && meetingDate <= endOfWeek;
    }).map(i => ({
      ...i,
      meeting_date: i.renewal_meeting_date,
      meeting_time: i.renewal_meeting_time,
      meeting_type: i.renewal_meeting_type,
      is_renewal_meeting: true
    }));

    // Combine and sort all meetings
    const meetings = [...regularMeetings, ...renewalMeetings]
      .sort((a, b) => new Date(a.meeting_date) - new Date(b.meeting_date));

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

  // Helper to open conversion modal with pre-populated data from inquiry
  const openConversionModal = (inquiry) => {
    // Pre-populate onboardData with existing inquiry data
    const existingOnboardData = inquiry.onboarding_data || {};
    setOnboardData({
      offering: existingOnboardData.offering || inquiry.selected_offerings?.[0] || '',
      model: existingOnboardData.model || '',
      book_type: existingOnboardData.book_type || '',
      kit_type: existingOnboardData.kit_type || '',
      training_type: existingOnboardData.training_type || '',
      grade_pricing: existingOnboardData.grade_pricing?.length > 0 
        ? existingOnboardData.grade_pricing 
        : [{ grade: '', students: '', price_per_student: '' }],
      total_students: existingOnboardData.total_students || 0,
      total_amount: existingOnboardData.total_amount || inquiry.quoted_price || 0,
      school_contacts: existingOnboardData.school_contacts?.length > 0 
        ? existingOnboardData.school_contacts 
        : [{ name: inquiry.contact_name || '', phone_number: inquiry.phone || '', country_code: '+91', email: inquiry.email || '', role: 'principal' }],
      payment_mode: existingOnboardData.payment_mode || 'from_school',
      payment_method: existingOnboardData.payment_method || '',
      payment_tranches: existingOnboardData.payment_tranches?.length > 0 
        ? existingOnboardData.payment_tranches 
        : [{ amount: '', percentage: '', date: '', notes: '' }],
      contract_start: existingOnboardData.contract_start || '',
      contract_end: existingOnboardData.contract_end || '',
      mou_url: existingOnboardData.mou_url || '',
      parent_circular_url: existingOnboardData.parent_circular_url || '',
      payment_link: existingOnboardData.payment_link || '',
      is_draft: false,
    });
    setShowOnboardModal(inquiry);
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
      
      // If followup is requested, add followup data but keep status as meeting_done
      if (meetingDoneData.followup_type) {
        updateData.followup_type = meetingDoneData.followup_type;
        updateData.followup_date = format(meetingDoneData.followup_date, 'yyyy-MM-dd');
        updateData.followup_time = meetingDoneData.followup_time;
        
        if (meetingDoneData.followup_type === 'meeting') {
          updateData.meeting_date = format(meetingDoneData.followup_date, 'yyyy-MM-dd');
          updateData.meeting_time = meetingDoneData.followup_time;
        }
        // Status remains 'meeting_done' - no status change to 'followup'
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

  // Lost Reason Modal handlers
  const openLostReasonModal = (inquiry) => {
    setShowLostReasonModal(inquiry);
    setLostReason('');
  };

  const submitLostReason = async () => {
    if (!lostReason.trim()) {
      toast.error('Please enter a reason for marking as lost');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showLostReasonModal.id}`, { 
        status: 'lost',
        lost_reason: lostReason,
        notes: showLostReasonModal.notes 
          ? `${showLostReasonModal.notes}\n\n--- Lost Reason (${format(new Date(), 'dd MMM yyyy')}) ---\n${lostReason}`
          : `--- Lost Reason (${format(new Date(), 'dd MMM yyyy')}) ---\n${lostReason}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('School marked as lost');
      setShowLostReasonModal(null);
      setLostReason('');
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  // Renewal Meeting Modal handlers
  const openRenewalMeetingModal = (inquiry) => {
    setShowRenewalMeetingModal(inquiry);
    setRenewalMeetingData({ date: null, time: '', type: 'offline', notes: '', link: '', address: '' });
  };

  const submitRenewalMeeting = async () => {
    if (!renewalMeetingData.date || !renewalMeetingData.time) {
      toast.error('Please select date and time for the renewal meeting');
      return;
    }
    if (renewalMeetingData.type === 'online' && !renewalMeetingData.link) {
      toast.error('Please enter the meeting link');
      return;
    }
    if (renewalMeetingData.type === 'offline' && !renewalMeetingData.address) {
      toast.error('Please enter the meeting address');
      return;
    }
    try {
      await axios.patch(`${API}/schools/inquiry/${showRenewalMeetingModal.id}`, { 
        status: 'renewal_meeting',
        renewal_meeting_date: format(renewalMeetingData.date, 'yyyy-MM-dd'),
        renewal_meeting_time: renewalMeetingData.time,
        renewal_meeting_type: renewalMeetingData.type,
        renewal_meeting_link: renewalMeetingData.type === 'online' ? renewalMeetingData.link : '',
        renewal_meeting_address: renewalMeetingData.type === 'offline' ? renewalMeetingData.address : '',
        notes: showRenewalMeetingModal.notes 
          ? `${showRenewalMeetingModal.notes}\n\n--- Renewal Meeting Scheduled (${format(new Date(), 'dd MMM yyyy')}) ---\n${renewalMeetingData.notes || 'Meeting scheduled'}`
          : `--- Renewal Meeting Scheduled (${format(new Date(), 'dd MMM yyyy')}) ---\n${renewalMeetingData.notes || 'Meeting scheduled'}`
      }, {
        headers: getAuthHeaders()
      });
      toast.success('Renewal meeting scheduled');
      setShowRenewalMeetingModal(null);
      setRenewalMeetingData({ date: null, time: '', type: 'offline', notes: '', link: '', address: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to schedule renewal meeting');
    }
  };

  // Renewal Conversion Modal handlers
  const openRenewalConvertModal = (inquiry) => {
    // Pre-fill with existing onboarding data
    const existingData = inquiry.onboarding_data || {};
    setShowRenewalConvertModal(inquiry);
    setRenewalConvertData({
      offering: existingData.offering || '',
      model: existingData.model || '',
      book_type: existingData.book_type || '',
      kit_type: existingData.kit_type || '',
      training_type: existingData.training_type || '',
      pricing_type: existingData.pricing_type || 'per_student',
      fixed_price: existingData.fixed_price || '',
      grade_pricing: existingData.grade_pricing?.length > 0 
        ? existingData.grade_pricing 
        : [{ grade: '', students: '', price_per_student: '' }],
      total_students: existingData.total_students || 0,
      total_amount: existingData.total_amount || inquiry.conversion_amount || 0,
      school_contacts: existingData.school_contacts?.length > 0
        ? existingData.school_contacts.map(c => ({
            name: c.name || '',
            phone_number: c.phone?.replace(/^\+\d{1,3}/, '') || '',
            country_code: c.phone?.match(/^\+\d{1,3}/)?.[0] || '+91',
            email: c.email || '',
            role: c.role || ''
          }))
        : [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
      payment_mode: existingData.payment_mode || 'from_school',
      payment_method: existingData.payment_method || '',
      payment_tranches: existingData.payment_tranches?.length > 0
        ? existingData.payment_tranches
        : [{ amount: '', percentage: '', date: '', notes: '' }],
      contract_start: '',
      contract_end: '',
      mou_url: '',
      parent_circular_url: '',
      payment_link: '',
      school_share_type: existingData.school_share_type || 'none',
      school_share_calc: existingData.school_share_calc || 'lumpsum',
      school_share_value: existingData.school_share_value || '',
      school_share_amount: existingData.school_share_amount || 0,
      gp_share_type: existingData.gp_share_type || 'none',
      gp_share_calc: existingData.gp_share_calc || 'lumpsum',
      gp_share_value: existingData.gp_share_value || '',
      gp_share_amount: existingData.gp_share_amount || 0
    });
  };

  const handleRenewalConvert = async () => {
    // Calculate totals based on pricing type
    let totalStudents = 0;
    let totalAmount = 0;
    
    if (renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') {
      totalStudents = renewalConvertData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
      totalAmount = renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
    }
    
    if (renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') {
      totalAmount += parseFloat(renewalConvertData.fixed_price) || 0;
    }
    
    if (totalAmount === 0 && !renewalConvertData.total_amount) {
      toast.error('Please add pricing details');
      return;
    }
    
    try {
      // Format contract dates
      const contractStart = renewalConvertData.contract_start 
        ? (typeof renewalConvertData.contract_start === 'string' 
            ? renewalConvertData.contract_start 
            : format(renewalConvertData.contract_start, 'yyyy-MM-dd'))
        : '';
      const contractEnd = renewalConvertData.contract_end 
        ? (typeof renewalConvertData.contract_end === 'string' 
            ? renewalConvertData.contract_end 
            : format(renewalConvertData.contract_end, 'yyyy-MM-dd'))
        : '';
      
      // Format school contacts
      const formattedContacts = renewalConvertData.school_contacts
        .filter(c => c.name && c.phone_number)
        .map(c => ({
          name: String(c.name || ''),
          phone: String((c.country_code || '+91') + (c.phone_number || '')),
          email: String(c.email || ''),
          role: String(c.role || '')
        }));
      
      // Format payment tranches
      const formattedTranches = renewalConvertData.payment_tranches
        .filter(t => t.amount || t.percentage)
        .map(t => ({
          percentage: String(t.percentage || ''),
          amount: String(t.amount || ''),
          date: String(t.date || ''),
          notes: String(t.notes || '')
        }));
      
      const finalAmount = totalAmount > 0 ? totalAmount : (renewalConvertData.total_amount || 0);
      
      // Calculate school share
      let schoolShareAmount = 0;
      if (renewalConvertData.school_share_type !== 'none' && renewalConvertData.school_share_value) {
        const shareValue = parseFloat(renewalConvertData.school_share_value) || 0;
        if (renewalConvertData.school_share_type === 'percentage') {
          if (renewalConvertData.school_share_calc === 'per_student') {
            schoolShareAmount = (shareValue / 100) * totalAmount;
          } else {
            schoolShareAmount = (shareValue / 100) * finalAmount;
          }
        } else {
          if (renewalConvertData.school_share_calc === 'per_student') {
            schoolShareAmount = shareValue * totalStudents;
          } else {
            schoolShareAmount = shareValue;
          }
        }
      }
      
      // Calculate GP share
      let gpShareAmount = 0;
      if (renewalConvertData.gp_share_type !== 'none' && renewalConvertData.gp_share_value) {
        const shareValue = parseFloat(renewalConvertData.gp_share_value) || 0;
        if (renewalConvertData.gp_share_type === 'percentage') {
          if (renewalConvertData.gp_share_calc === 'per_student') {
            gpShareAmount = (shareValue / 100) * totalAmount;
          } else {
            gpShareAmount = (shareValue / 100) * finalAmount;
          }
        } else {
          if (renewalConvertData.gp_share_calc === 'per_student') {
            gpShareAmount = shareValue * totalStudents;
          } else {
            gpShareAmount = shareValue;
          }
        }
      }
      
      // Update school with renewal data
      await axios.patch(`${API}/schools/inquiry/${showRenewalConvertModal.id}`, {
        status: 'renewed',
        conversion_amount: finalAmount,
        onboarding_data: {
          ...(showRenewalConvertModal.onboarding_data || {}),
          offering: renewalConvertData.offering,
          model: renewalConvertData.model,
          kit_type: renewalConvertData.kit_type,
          book_type: renewalConvertData.book_type,
          training_type: renewalConvertData.training_type,
          pricing_type: renewalConvertData.pricing_type,
          fixed_price: renewalConvertData.fixed_price,
          total_students: totalStudents > 0 ? totalStudents : renewalConvertData.total_students,
          total_amount: finalAmount,
          grade_pricing: renewalConvertData.grade_pricing.filter(g => g.grade),
          contract_start: contractStart,
          contract_end: contractEnd,
          mou_url: renewalConvertData.mou_url,
          school_contacts: formattedContacts,
          payment_mode: renewalConvertData.payment_mode,
          payment_method: renewalConvertData.payment_method,
          payment_tranches: formattedTranches,
          parent_circular_url: renewalConvertData.parent_circular_url,
          payment_link: renewalConvertData.payment_link,
          renewal_date: new Date().toISOString(),
          // Share details
          school_share_type: renewalConvertData.school_share_type,
          school_share_calc: renewalConvertData.school_share_calc,
          school_share_value: renewalConvertData.school_share_value,
          school_share_amount: schoolShareAmount,
          gp_share_type: renewalConvertData.gp_share_type,
          gp_share_calc: renewalConvertData.gp_share_calc,
          gp_share_value: renewalConvertData.gp_share_value,
          gp_share_amount: gpShareAmount
        },
        notes: showRenewalConvertModal.notes 
          ? `${showRenewalConvertModal.notes}\n\n--- Renewed (${format(new Date(), 'dd MMM yyyy')}) ---\nAmount: ₹${Number(finalAmount).toLocaleString()}`
          : `--- Renewed (${format(new Date(), 'dd MMM yyyy')}) ---\nAmount: ₹${Number(finalAmount).toLocaleString()}`
      }, {
        headers: getAuthHeaders()
      });
      
      // Initialize re-onboarding workflow
      try {
        const response = await axios.post(`${API}/schools/${showRenewalConvertModal.id}/init-onboarding`, {
          is_renewal: true
        }, {
          headers: getAuthHeaders()
        });
        const trackingUrl = `${window.location.origin}/track/${response.data.tracking_token}`;
        navigator.clipboard.writeText(trackingUrl);
        toast.success('School renewed! Tracking link copied to clipboard.');
      } catch (initError) {
        console.log('Renewal onboarding init skipped:', initError);
        toast.success('School renewed successfully!');
      }
      
      setShowRenewalConvertModal(null);
      setRenewalConvertData({
        offering: '', model: '', book_type: '', kit_type: '', training_type: '',
        pricing_type: 'per_student', fixed_price: '',
        grade_pricing: [{ grade: '', students: '', price_per_student: '' }],
        total_students: 0, total_amount: 0,
        school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
        payment_mode: 'from_school', payment_method: '',
        payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
        contract_start: '', contract_end: '', mou_url: '',
        parent_circular_url: '', payment_link: '',
        school_share_type: 'none', school_share_calc: 'lumpsum', school_share_value: '', school_share_amount: 0,
        gp_share_type: 'none', gp_share_calc: 'lumpsum', gp_share_value: '', gp_share_amount: 0
      });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to renew school');
    }
  };

  // Renewal modal helper functions
  const addRenewalGradePricing = () => {
    setRenewalConvertData(prev => ({
      ...prev,
      grade_pricing: [...prev.grade_pricing, { grade: '', students: '', price_per_student: '' }]
    }));
  };

  const updateRenewalGradePricing = (index, field, value) => {
    setRenewalConvertData(prev => ({
      ...prev,
      grade_pricing: prev.grade_pricing.map((g, i) => i === index ? { ...g, [field]: value } : g)
    }));
  };

  const removeRenewalGradePricing = (index) => {
    if (renewalConvertData.grade_pricing.length > 1) {
      setRenewalConvertData(prev => ({
        ...prev,
        grade_pricing: prev.grade_pricing.filter((_, i) => i !== index)
      }));
    }
  };

  const addRenewalSchoolContact = () => {
    setRenewalConvertData(prev => ({
      ...prev,
      school_contacts: [...prev.school_contacts, { name: '', phone_number: '', country_code: '+91', email: '', role: '' }]
    }));
  };

  const updateRenewalSchoolContact = (index, field, value) => {
    setRenewalConvertData(prev => ({
      ...prev,
      school_contacts: prev.school_contacts.map((c, i) => i === index ? { ...c, [field]: value } : c)
    }));
  };

  const removeRenewalSchoolContact = (index) => {
    if (renewalConvertData.school_contacts.length > 1) {
      setRenewalConvertData(prev => ({
        ...prev,
        school_contacts: prev.school_contacts.filter((_, i) => i !== index)
      }));
    }
  };

  const addRenewalPaymentTranche = () => {
    setRenewalConvertData(prev => ({
      ...prev,
      payment_tranches: [...prev.payment_tranches, { amount: '', percentage: '', date: '', notes: '' }]
    }));
  };

  const updateRenewalPaymentTranche = (index, field, value) => {
    const totalAmount = renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
    
    setRenewalConvertData(prev => {
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

  const removeRenewalPaymentTranche = (index) => {
    if (renewalConvertData.payment_tranches.length > 1) {
      setRenewalConvertData(prev => ({
        ...prev,
        payment_tranches: prev.payment_tranches.filter((_, i) => i !== index)
      }));
    }
  };

  const handleRenewalMOUUpload = async (file) => {
    if (!file) return;
    setUploadingRenewalMOU(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setRenewalConvertData(prev => ({ ...prev, mou_url: response.data.url }));
      toast.success('MOU uploaded successfully');
    } catch (error) {
      console.error('MOU upload error:', error);
      toast.error(getErrorMessage(error, 'Failed to upload MOU'));
    } finally {
      setUploadingRenewalMOU(false);
    }
  };

  // Fetch Relationship Managers
  const fetchRelationshipManagers = async () => {
    try {
      const res = await axios.get(`${API}/schools/relationship-managers`, { headers: getAuthHeaders() });
      setRelationshipManagers(res.data || []);
    } catch (error) {
      console.error('Failed to fetch RMs:', error);
    }
  };

  // Assign Relationship Manager
  const handleAssignRM = async (rmId, rmName) => {
    if (!showAssignRMModal) return;
    try {
      await axios.post(`${API}/schools/${showAssignRMModal.id}/assign-rm`, {
        rm_id: rmId,
        rm_name: rmName
      }, { headers: getAuthHeaders() });
      toast.success('Relationship Manager assigned');
      setShowAssignRMModal(null);
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to assign RM');
    }
  };

  // Ticket voice recording functions
  const startTicketRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      ticketMediaRecorderRef.current = new MediaRecorder(stream);
      ticketAudioChunksRef.current = [];
      
      ticketMediaRecorderRef.current.ondataavailable = (event) => {
        ticketAudioChunksRef.current.push(event.data);
      };
      
      ticketMediaRecorderRef.current.onstop = () => {
        const blob = new Blob(ticketAudioChunksRef.current, { type: 'audio/webm' });
        setTicketAudioBlob(blob);
        setTicketAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };
      
      ticketMediaRecorderRef.current.start();
      setTicketRecording(true);
      setTicketRecordTime(0);
      ticketRecordingIntervalRef.current = setInterval(() => {
        setTicketRecordTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast.error('Failed to access microphone');
    }
  };

  const stopTicketRecording = () => {
    if (ticketMediaRecorderRef.current && ticketRecording) {
      ticketMediaRecorderRef.current.stop();
      setTicketRecording(false);
      clearInterval(ticketRecordingIntervalRef.current);
    }
  };

  const handleTicketFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    setTicketUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
        });
        
        setTicketAttachments(prev => [...prev, {
          name: file.name,
          url: response.data.url,
          type: file.type,
          isVoiceNote: false
        }]);
      }
      toast.success('File uploaded');
    } catch (error) {
      toast.error('Failed to upload file');
    } finally {
      setTicketUploading(false);
      if (ticketFileInputRef.current) ticketFileInputRef.current.value = '';
    }
  };

  // Delete lead handler
  const handleDeleteLead = async (inquiry) => {
    if (!window.confirm(`Are you sure you want to delete the lead for "${inquiry.school_name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API}/schools/inquiry/${inquiry.id}`, {
        headers: getAuthHeaders()
      });
      toast.success('Lead deleted successfully');
      fetchInquiries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete lead');
    }
  };

  // Delete contact handler
  const handleDeleteContact = async (inquiryId, contactIndex, contactName) => {
    if (!window.confirm(`Are you sure you want to delete the contact "${contactName}"?`)) {
      return;
    }
    try {
      await axios.delete(`${API}/schools/inquiry/${inquiryId}/contacts/${contactIndex}`, {
        headers: getAuthHeaders()
      });
      toast.success('Contact deleted successfully');
      fetchInquiries();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete contact');
    }
  };

  // Raise Ticket on behalf of school
  const handleRaiseTicket = async () => {
    if (!showRaiseTicketModal || !ticketData.subject || !ticketData.query_type) {
      toast.error('Please select query type and enter subject');
      return;
    }
    try {
      // Upload voice note if exists
      let allAttachments = [...ticketAttachments];
      if (ticketAudioBlob) {
        const formData = new FormData();
        formData.append('file', ticketAudioBlob, 'voice-note.webm');
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
      
      await axios.post(`${API}/schools/${showRaiseTicketModal.id}/raise-ticket`, {
        query_type: ticketData.query_type,
        related_to: ticketData.related_to,
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        source: ticketData.source,
        user_type: ticketData.user_type,
        contact_name: ticketData.contact_name || showRaiseTicketModal.contact_name,
        contact_phone: ticketData.contact_phone || showRaiseTicketModal.phone,
        contact_email: ticketData.contact_email || showRaiseTicketModal.email,
        attachments: allAttachments
      }, { headers: getAuthHeaders() });
      toast.success('Ticket raised successfully');
      setShowRaiseTicketModal(null);
      setTicketData({ query_type: '', related_to: '', subject: '', description: '', priority: 'medium', contact_name: '', contact_phone: '', contact_email: '', source: 'school_crm', user_type: 'school' });
      setTicketAttachments([]);
      setTicketAudioBlob(null);
      setTicketAudioUrl(null);
      setTicketRecordTime(0);
    } catch (error) {
      toast.error('Failed to raise ticket');
    }
  };

  // Document upload handler
  const handleDocumentUpload = async (file, docType) => {
    if (!file || !showDocumentsModal) return;
    
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const uploadRes = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      
      const fileUrl = uploadRes.data.url;
      
      // Get existing documents
      const existingDocs = showDocumentsModal.documents || [];
      const newDoc = {
        type: docType,
        url: fileUrl,
        name: file.name,
        uploaded_at: new Date().toISOString(),
        uploaded_by: user?.name || user?.email || 'Admin'
      };
      
      // Update school with new document
      await axios.patch(`${API}/schools/inquiry/${showDocumentsModal.id}`, {
        documents: [...existingDocs, newDoc]
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success(`${docType} uploaded successfully`);
      fetchInquiries();
      
      // Update local state
      setShowDocumentsModal(prev => ({
        ...prev,
        documents: [...existingDocs, newDoc]
      }));
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (docIndex) => {
    if (!showDocumentsModal) return;
    
    try {
      const existingDocs = showDocumentsModal.documents || [];
      const updatedDocs = existingDocs.filter((_, idx) => idx !== docIndex);
      
      await axios.patch(`${API}/schools/inquiry/${showDocumentsModal.id}`, {
        documents: updatedDocs
      }, {
        headers: getAuthHeaders()
      });
      
      toast.success('Document removed');
      fetchInquiries();
      setShowDocumentsModal(prev => ({
        ...prev,
        documents: updatedDocs
      }));
    } catch (error) {
      toast.error('Failed to remove document');
    }
  };

  const handleOnboardSchool = async (saveAsDraft = false) => {
    if (!showOnboardModal) return;
    
    try {
      // Calculate totals based on pricing type
      let totalStudents = 0;
      let totalAmount = 0;
      
      // Per student pricing
      if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both' || !onboardData.pricing_type) {
        totalStudents = onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
        totalAmount = onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
      }
      
      // Fixed price - add fixed_price to totalAmount
      if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
        totalAmount += parseFloat(onboardData.fixed_price) || 0;
      }
      
      // If no total calculated, use the manual total_amount
      if (totalAmount === 0 && onboardData.total_amount > 0) {
        totalAmount = onboardData.total_amount;
      }
      
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
        pricing_type: String(onboardData.pricing_type || 'per_student'),
        fixed_price: String(onboardData.fixed_price || ''),
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
        pricing_type: 'per_student', fixed_price: '',
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
    if (newLead.source === 'referral' && !newLead.referred_by) {
      toast.error('Please enter who referred this lead');
      return;
    }
    const fullPhone = newLead.countryCode === '+91' ? newLead.phone : `${newLead.countryCode}${newLead.phone}`;
    // Clean phone for email generation - remove spaces and special chars
    const cleanPhone = newLead.phone.replace(/[^0-9]/g, '');
    try {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: newLead.school_name,
        contact_name: newLead.contact_name,
        email: newLead.email || `${cleanPhone}@school.oll`,
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
        referred_by: newLead.referred_by,
        notes: newLead.notes,
        quoted_price: newLead.quoted_price,
        selected_offerings: newLead.selected_offerings,
        assign_option: newLead.assign_option,
        added_by: user?.id || user?.email,
        added_by_name: user?.name || 'Admin'
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
        referred_by: '',
        notes: '',
        quoted_price: '',
        selected_offerings: [],
        assign_option: 'self'
      });
      fetchInquiries();
    } catch (error) {
      console.error('Add lead error:', error?.response?.data || error);
      toast.error(error?.response?.data?.detail || 'Failed to add lead');
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
    if (!followupData.followup_type) {
      toast.error('Please select a followup type');
      return;
    }
    if (!followupData.date) {
      toast.error('Please select a followup date');
      return;
    }
    // Only require time for meetings
    if (followupData.followup_type === 'meeting' && !followupData.time) {
      toast.error('Please select a followup time');
      return;
    }
    // Validate mode for meetings
    if (followupData.followup_type === 'meeting' && !followupData.mode) {
      toast.error('Please select meeting mode (online/offline)');
      return;
    }
    // Validate meeting link for online meetings
    if (followupData.followup_type === 'meeting' && followupData.mode === 'online' && !followupData.meeting_link) {
      toast.error('Please enter meeting link');
      return;
    }
    // Validate address for offline meetings
    if (followupData.followup_type === 'meeting' && followupData.mode === 'offline' && !followupData.address) {
      toast.error('Please enter meeting address');
      return;
    }
    try {
      const updateData = {
        followup_type: followupData.followup_type,
        followup_date: format(followupData.date, 'yyyy-MM-dd'),
        followup_time: followupData.followup_type === 'meeting' ? followupData.time : '',
        followup_comment: followupData.comment,
        followup_auto_email: followupData.auto_email
        // Note: Status is NOT changed - school stays in current section
      };
      
      // If it's a meeting, also set meeting details
      if (followupData.followup_type === 'meeting') {
        updateData.meeting_date = format(followupData.date, 'yyyy-MM-dd');
        updateData.meeting_time = followupData.time;
        updateData.meeting_mode = followupData.mode;
        updateData.meeting_link = followupData.mode === 'online' ? followupData.meeting_link : '';
        updateData.meeting_address = followupData.mode === 'offline' ? followupData.address : '';
      }
      
      await axios.patch(`${API}/schools/inquiry/${showFollowupModal.id}`, updateData, {
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
          toast.success(`${followupData.followup_type === 'meeting' ? 'Meeting' : 'Message'} followup scheduled with auto-email!`);
        } catch (emailError) {
          console.error('Failed to schedule email:', emailError);
          toast.success(`${followupData.followup_type === 'meeting' ? 'Meeting' : 'Message'} followup scheduled (email scheduling failed)`);
        }
      } else {
        toast.success(`${followupData.followup_type === 'meeting' ? 'Meeting' : 'Message'} followup scheduled`);
      }
      
      setShowFollowupModal(null);
      setFollowupData({ followup_type: '', date: null, time: '', comment: '', auto_email: false, mode: '', meeting_link: '', address: '' });
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

  // Parse CSV/Excel file using PapaParse for proper CSV handling
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setBulkImportFile(file);
    setBulkImportErrors([]);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_'),
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        
        // Filter out rows that don't have a school_name
        const validData = results.data.filter(row => row.school_name && row.school_name.trim());
        
        if (validData.length === 0) {
          toast.error('No valid school data found in file');
          return;
        }
        
        setBulkImportData(validData);
        toast.success(`Parsed ${validData.length} schools from file`);
      },
      error: (error) => {
        console.error('CSV parse error:', error);
        toast.error('Failed to parse CSV file');
      }
    });
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
        // Ensure share fields exist
        pricing_type: response.data.pricing_type || 'per_student',
        fixed_price: response.data.fixed_price || '',
        school_share_type: response.data.school_share_type || 'none',
        school_share_calc: response.data.school_share_calc || 'lumpsum',
        school_share_value: response.data.school_share_value || '',
        school_share_amount: response.data.school_share_amount || 0,
        gp_share_type: response.data.gp_share_type || 'none',
        gp_share_calc: response.data.gp_share_calc || 'lumpsum',
        gp_share_value: response.data.gp_share_value || '',
        gp_share_amount: response.data.gp_share_amount || 0,
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
        pricing_type: 'per_student',
        fixed_price: '',
        grade_pricing: [],
        total_students: school.total_students || 0,
        total_amount: 0,
        school_contacts: [{ name: school.contact_name || '', phone: school.phone || '', email: school.email || '', role: 'Primary Contact' }],
        payment_mode: 'from_school',
        payment_method: '',
        payment_tranches: [],
        contract_start: '',
        contract_end: '',
        school_share_type: 'none',
        school_share_calc: 'lumpsum',
        school_share_value: '',
        school_share_amount: 0,
        gp_share_type: 'none',
        gp_share_calc: 'lumpsum',
        gp_share_value: '',
        gp_share_amount: 0,
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
          pricing_type: editOnboardData.pricing_type,
          fixed_price: editOnboardData.fixed_price,
          grade_pricing: editOnboardData.grade_pricing,
          total_students: editOnboardData.total_students,
          total_amount: editOnboardData.total_amount,
          school_contacts: editOnboardData.school_contacts,
          payment_mode: editOnboardData.payment_mode,
          payment_method: editOnboardData.payment_method,
          payment_tranches: editOnboardData.payment_tranches,
          contract_start: editOnboardData.contract_start,
          contract_end: editOnboardData.contract_end,
          mou_url: editOnboardData.mou_url,
          school_share_type: editOnboardData.school_share_type,
          school_share_calc: editOnboardData.school_share_calc,
          school_share_value: editOnboardData.school_share_value,
          school_share_amount: editOnboardData.school_share_amount,
          gp_share_type: editOnboardData.gp_share_type,
          gp_share_calc: editOnboardData.gp_share_calc,
          gp_share_value: editOnboardData.gp_share_value,
          gp_share_amount: editOnboardData.gp_share_amount,
        }, {
          headers: getAuthHeaders()
        });
      } else {
        // Create onboarding record if it doesn't exist
        await axios.post(`${API}/schools/onboarding`, {
          school_id: editOnboardData.school_id,
          offering: editOnboardData.offering,
          model: editOnboardData.model,
          book_type: editOnboardData.book_type,
          kit_type: editOnboardData.kit_type,
          training_type: editOnboardData.training_type,
          pricing_type: editOnboardData.pricing_type,
          fixed_price: editOnboardData.fixed_price,
          grade_pricing: editOnboardData.grade_pricing,
          total_students: editOnboardData.total_students,
          total_amount: editOnboardData.total_amount,
          school_contacts: editOnboardData.school_contacts,
          payment_mode: editOnboardData.payment_mode,
          payment_method: editOnboardData.payment_method,
          payment_tranches: editOnboardData.payment_tranches,
          contract_start: editOnboardData.contract_start,
          contract_end: editOnboardData.contract_end,
          mou_url: editOnboardData.mou_url,
          school_share_type: editOnboardData.school_share_type,
          school_share_calc: editOnboardData.school_share_calc,
          school_share_value: editOnboardData.school_share_value,
          school_share_amount: editOnboardData.school_share_amount,
          gp_share_type: editOnboardData.gp_share_type,
          gp_share_calc: editOnboardData.gp_share_calc,
          gp_share_value: editOnboardData.gp_share_value,
          gp_share_amount: editOnboardData.gp_share_amount,
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
    
    // If searching all statuses and there's a search query, ignore section filter
    const matchesSection = (searchAllStatuses && searchQuery.trim()) ? true : inq.status === activeSection;
    
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
    // Action buttons with names and icons
    const baseButtons = (
      <>
        <button
          onClick={() => setShowAssignModal(inquiry)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
          data-testid={`assign-${inquiry.id}`}
        >
          <UserPlus className="w-3 h-3" />
          Assign
        </button>
        <button
          onClick={() => setShowCommentModal(inquiry)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center gap-1 font-medium"
          data-testid={`comment-${inquiry.id}`}
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
        <button
          onClick={() => handleDeleteLead(inquiry)}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
          data-testid={`delete-lead-${inquiry.id}`}
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </>
    );

    // Documents button
    const documentsButton = (
      <button
        onClick={() => setShowDocumentsModal(inquiry)}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-cyan-100 hover:bg-cyan-200 text-cyan-700 flex items-center gap-1 font-medium"
        data-testid={`documents-${inquiry.id}`}
      >
        <Paperclip className="w-3 h-3" />
        Docs {inquiry.documents?.length > 0 && `(${inquiry.documents.length})`}
      </button>
    );

    // Followup button
    const followupButton = inquiry.status !== 'converted' && (
      <button
        onClick={() => {
          setShowFollowupModal(inquiry);
          setFollowupData({ 
            date: inquiry.followup_date ? new Date(inquiry.followup_date) : null, 
            comment: inquiry.followup_comment || '' 
          });
        }}
        className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 flex items-center gap-1 font-medium"
        data-testid={`followup-${inquiry.id}`}
      >
        <Clock className="w-3 h-3" />
        Followup
      </button>
    );

    switch (inquiry.status) {
      case 'new':
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleMeetingDone(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-500 hover:bg-purple-600 text-white flex items-center gap-1 font-medium"
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
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`reschedule-${inquiry.id}`}
            >
              <CalendarClock className="w-3 h-3" />
              Reschedule
            </button>
            {followupButton}
            {documentsButton}
            {baseButtons}
            <button
              onClick={() => handleArchive(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${inquiry.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'meeting_done':
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => openConversionModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 font-medium"
              data-testid={`convert-${inquiry.id}`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Convert
            </button>
            {followupButton}
            {documentsButton}
            {baseButtons}
            <button
              onClick={() => handleArchive(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center gap-1 font-medium"
              data-testid={`archive-${inquiry.id}`}
            >
              <Archive className="w-3 h-3" />
              Archive
            </button>
          </div>
        );
      
      case 'converted':
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleEditOnboarding(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => setShowAssignRMModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
              data-testid={`assign-rm-${inquiry.id}`}
            >
              <UserPlus className="w-3 h-3" />
              {inquiry.relationship_manager_name ? 'Change RM' : 'Assign RM'}
            </button>
            <button
              onClick={() => {
                setShowRaiseTicketModal(inquiry);
                setTicketData({
                  query_type: '',
                  related_to: '',
                  subject: '',
                  description: '',
                  priority: 'medium',
                  source: 'school_crm',
                  contact_name: inquiry.contact_name,
                  contact_phone: inquiry.phone,
                  contact_email: inquiry.email
                });
                setTicketAttachments([]);
                setTicketAudioBlob(null);
                setTicketAudioUrl(null);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
              data-testid={`raise-ticket-${inquiry.id}`}
            >
              <AlertCircle className="w-3 h-3" />
              Ticket
            </button>
            {documentsButton}
            {baseButtons}
          </div>
        );
      
      case 'active':
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleEditOnboarding(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => setShowAssignRMModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center gap-1 font-medium"
              data-testid={`assign-rm-${inquiry.id}`}
            >
              <UserPlus className="w-3 h-3" />
              {inquiry.relationship_manager_name ? 'Change RM' : 'Assign RM'}
            </button>
            <button
              onClick={() => openRenewalMeetingModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white flex items-center gap-1 font-medium"
              data-testid={`renewal-meeting-${inquiry.id}`}
            >
              <Calendar className="w-3 h-3" />
              Renewal
            </button>
            <button
              onClick={() => {
                setShowRaiseTicketModal(inquiry);
                setTicketData({
                  query_type: '',
                  related_to: '',
                  subject: '',
                  description: '',
                  priority: 'medium',
                  source: 'school_crm',
                  contact_name: inquiry.contact_name,
                  contact_phone: inquiry.phone,
                  contact_email: inquiry.email
                });
                setTicketAttachments([]);
                setTicketAudioBlob(null);
                setTicketAudioUrl(null);
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-700 flex items-center gap-1 font-medium"
              data-testid={`raise-ticket-${inquiry.id}`}
            >
              <AlertCircle className="w-3 h-3" />
              Ticket
            </button>
            <button
              onClick={() => openLostReasonModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
              data-testid={`lost-${inquiry.id}`}
            >
              <X className="w-3 h-3" />
              Lost
            </button>
            {documentsButton}
            {baseButtons}
          </div>
        );
      
      case 'renewal_meeting':
        return (
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => openRenewalConvertModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center gap-1 font-medium"
              data-testid={`renew-convert-${inquiry.id}`}
            >
              <CheckCircle className="w-3 h-3" />
              Renewed
            </button>
            <button
              onClick={() => setShowFollowupModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-purple-100 hover:bg-purple-200 text-purple-700 flex items-center gap-1 font-medium"
              data-testid={`followup-${inquiry.id}`}
            >
              <Clock className="w-3 h-3" />
              Followup
            </button>
            {documentsButton}
            <button
              onClick={() => openLostReasonModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
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
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleEditOnboarding(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 flex items-center gap-1 font-medium"
              data-testid={`edit-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit
            </button>
            <button
              onClick={() => openLostReasonModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 flex items-center gap-1 font-medium"
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
          <div className="flex gap-1.5 flex-wrap items-center">
            <button
              onClick={() => handleStatusChange(inquiry, 'active')}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-white flex items-center gap-1 font-medium"
              data-testid={`reactivate-${inquiry.id}`}
            >
              <RefreshCw className="w-3 h-3" />
              Reactivate
            </button>
            {baseButtons}
          </div>
        );
      
      case 'archived':
        return <div className="flex gap-1.5 flex-wrap items-center">{followupButton}{baseButtons}</div>;
      
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-[#1E3A5F]">{meeting.school_name}</p>
                          {meeting.is_renewal_meeting && (
                            <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" />
                              Renewal
                            </span>
                          )}
                        </div>
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
          <div className="flex flex-col gap-4 mb-6">
            <div className="relative flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
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
              <label className="flex items-center gap-2 text-sm text-slate-600 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={searchAllStatuses}
                  onChange={(e) => setSearchAllStatuses(e.target.checked)}
                  className="rounded border-slate-300"
                />
                Search all
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="h-10 px-4 border border-slate-200 rounded-lg bg-white text-sm flex-1 sm:flex-none"
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
                  className="flex items-center gap-2 flex-1 sm:flex-none justify-center"
                  data-testid="bulk-import-btn"
                >
                  <FileSpreadsheet className="w-4 h-4" /> <span className="hidden sm:inline">Bulk</span> Import
                </Button>
              )}
              <Button
                onClick={() => setShowAddForm(true)}
                className="btn-primary flex items-center gap-2 flex-1 sm:flex-none justify-center"
                data-testid="add-school-lead-btn"
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
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
        </div>
      ) : filteredInquiries.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {searchQuery.trim() && !searchAllStatuses 
              ? `No results for "${searchQuery}" in this section`
              : 'No leads in this section'}
          </p>
          {searchQuery.trim() && !searchAllStatuses && (
            <button 
              onClick={() => setSearchAllStatuses(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Search in all statuses →
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInquiries.map((inquiry) => (
            <div 
              key={inquiry.id} 
              className={`bg-white rounded-xl border ${inquiry.is_viewer ? 'border-slate-200 ring-1 ring-slate-100' : 'border-slate-100'} p-4 hover:shadow-md transition-shadow`}
              data-testid={`school-card-${inquiry.id}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className="font-semibold text-[#1E3A5F] break-words">{inquiry.school_name}</h3>
                  <p className="text-sm text-slate-500">{inquiry.contact_name}</p>
                  {/* Source badge on separate line */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
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
                  {inquiry.assigned_to && (
                    <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                      <UserPlus className="w-3 h-3 flex-shrink-0" /> 
                      <span>{inquiry.assigned_to_name || getAssignedUserName(inquiry.assigned_to) || 'Team'}</span>
                    </p>
                  )}
                  {inquiry.is_viewer && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                      Viewer Only
                    </span>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  {/* Show status badge when searching all statuses */}
                  {searchAllStatuses && searchQuery.trim() && (
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      STATUS_SECTIONS.find(s => s.value === inquiry.status)?.color || 'bg-slate-100'
                    } text-white`}>
                      {STATUS_SECTIONS.find(s => s.value === inquiry.status)?.label || inquiry.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-0.5 text-sm text-slate-600 mb-2">
                <p className="flex items-center gap-1 text-xs">
                  <Phone className="w-3 h-3 text-slate-400" /> {inquiry.phone}
                </p>
                {inquiry.location && (
                  <p className="flex items-center gap-1 text-xs truncate">
                    <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" /> <span className="truncate">{inquiry.location}</span>
                  </p>
                )}
                {inquiry.board && (
                  <p className="text-xs"><span className="text-slate-400">Board:</span> {inquiry.board}</p>
                )}
                {inquiry.meeting_date && (
                  <p className="flex items-center gap-1 text-[#D63031] font-medium text-xs">
                    <Calendar className="w-3 h-3" />
                    {inquiry.meeting_date} {inquiry.meeting_time && `${inquiry.meeting_time}`}
                  </p>
                )}
                {(inquiry.conversion_amount || inquiry.onboarding_data?.total_amount) && (
                  <p className="text-green-600 font-medium text-xs">
                    ₹{Number(inquiry.conversion_amount || inquiry.onboarding_data?.total_amount).toLocaleString()}
                  </p>
                )}
                {inquiry.quoted_price && !inquiry.conversion_amount && !inquiry.onboarding_data?.total_amount && (
                  <p className="text-blue-600 font-medium text-xs">
                    Quoted: ₹{Number(inquiry.quoted_price).toLocaleString()}
                  </p>
                )}
              </div>

              {/* Selected Offerings */}
              {inquiry.selected_offerings?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {inquiry.selected_offerings.slice(0, 2).map((offeringId, idx) => {
                    const offering = offerings.find(o => o.id === offeringId);
                    return (
                      <span key={idx} className="px-1.5 py-0.5 bg-purple-100 rounded text-[10px] text-purple-700">
                        {offering ? offering.title : offeringId}
                      </span>
                    );
                  })}
                  {inquiry.selected_offerings.length > 2 && (
                    <span className="px-1.5 py-0.5 bg-purple-100 rounded text-[10px] text-purple-700">
                      +{inquiry.selected_offerings.length - 2}
                    </span>
                  )}
                </div>
              )}
              
              {/* Support Needed (from SchoolFunnel) */}
              {inquiry.support_needed?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {inquiry.support_needed.slice(0, 2).map((supportId, idx) => {
                    const offering = offerings.find(o => o.id === supportId);
                    return (
                      <span key={idx} className="px-1.5 py-0.5 bg-green-100 rounded text-[10px] text-green-700">
                        {offering ? offering.title : supportId}
                      </span>
                    );
                  })}
                </div>
              )}

              {inquiry.programs_interested?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {inquiry.programs_interested.slice(0, 3).map((p, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 bg-[#1E3A5F]/10 rounded text-[10px] text-[#1E3A5F] capitalize">
                      {p}
                    </span>
                  ))}
                </div>
              )}

              {/* Comments shown outside */}
              {inquiry.notes && (
                <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 mb-2">
                  <p className="text-xs text-slate-500 font-medium mb-0.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Latest Note
                  </p>
                  <p className="text-xs text-slate-700 line-clamp-2">
                    {inquiry.notes.split('\n\n').pop()?.split('\n').slice(0, 2).join('\n') || inquiry.notes.slice(-150)}
                  </p>
                </div>
              )}

              {/* Relationship Manager - Show for converted/active schools */}
              {['converted', 'active', 'renewed'].includes(inquiry.status) && inquiry.relationship_manager_name && (
                <div className="bg-indigo-50/50 rounded px-2 py-1 mb-2">
                  <p className="text-[10px] text-indigo-700 flex items-center gap-1">
                    <User className="w-2.5 h-2.5" />
                    <span className="font-medium">RM:</span> {inquiry.relationship_manager_name}
                  </p>
                </div>
              )}

              {/* Referred By - Show for referral leads */}
              {inquiry.referred_by && (
                <div className="bg-green-50/50 rounded px-2 py-1 mb-2">
                  <p className="text-[10px] text-green-700 flex items-center gap-1">
                    <Users className="w-2.5 h-2.5" />
                    <span className="font-medium">Ref:</span> {inquiry.referred_by}
                  </p>
                </div>
              )}

              {/* Followup shown outside - only for non-converted */}
              {inquiry.status !== 'converted' && inquiry.followup_date && (
                <div className="bg-cyan-50/50 rounded px-2 py-1 mb-2">
                  <p className="text-[10px] text-cyan-700 font-medium flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" /> Followup: {inquiry.followup_date}
                  </p>
                </div>
              )}

              {/* Draft Progress Bar - Show if onboarding is in draft state */}
              {inquiry.onboarding_status === 'draft' && inquiry.onboarding_id && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-amber-700 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Draft
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-5 text-[10px] text-amber-700 hover:bg-amber-100 px-1"
                      onClick={() => openConversionModal(inquiry)}
                    >
                      Continue →
                    </Button>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-1.5">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all" 
                      style={{ width: `${inquiry.total_students ? 60 : 25}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Onboarding Progress - Show for converted and renewed schools with onboarding_workflow */}
              {inquiry.onboarding_workflow && ['converted', 'renewed'].includes(inquiry.status) && (
                <div className={`${inquiry.status === 'renewed' ? 'bg-emerald-50 border-emerald-200' : 'bg-purple-50 border-purple-200'} border rounded-lg p-2 mb-2`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className={`text-[10px] font-medium flex items-center gap-1 ${inquiry.status === 'renewed' ? 'text-emerald-700' : 'text-purple-700'}`}>
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      {inquiry.status === 'renewed' ? 'Re-Onboarding' : 'Onboarding'}
                    </p>
                    <button
                      onClick={() => setShowOnboardingWorkflowModal(inquiry)}
                      className={`text-[10px] font-medium ${inquiry.status === 'renewed' ? 'text-emerald-600 hover:text-emerald-800' : 'text-purple-600 hover:text-purple-800'}`}
                    >
                      View →
                    </button>
                  </div>
                  {/* Progress Bar */}
                  <div className={`w-full ${inquiry.status === 'renewed' ? 'bg-emerald-200' : 'bg-purple-200'} rounded-full h-1.5 mb-1`}>
                    <div 
                      className={`${inquiry.status === 'renewed' ? 'bg-emerald-500' : 'bg-purple-500'} h-1.5 rounded-full transition-all`}
                      style={{ 
                        width: `${(Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length / 9 * 100).toFixed(0)}%` 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={inquiry.status === 'renewed' ? 'text-emerald-600' : 'text-purple-600'}>
                      {Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length}/9
                    </span>
                    {inquiry.onboarding_workflow.tracking_token && (
                      <button
                        onClick={() => {
                          const url = `${window.location.origin}/track/${inquiry.onboarding_workflow.tracking_token}`;
                          navigator.clipboard.writeText(url);
                          toast.success('Link copied!');
                        }}
                        className={`flex items-center gap-0.5 ${inquiry.status === 'renewed' ? 'text-emerald-500 hover:text-emerald-700' : 'text-purple-500 hover:text-purple-700'}`}
                      >
                        <Gift className="w-2.5 h-2.5" /> Copy link
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* View Button */}
              <div className="flex gap-1.5 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={() => setViewInquiry(inquiry)}
                  data-testid={`view-school-${inquiry.id}`}
                >
                  <Eye className="w-3 h-3 mr-1" /> View
                </Button>
                {/* Add Meeting button for relevant statuses */}
                {['meeting_done', 'converted', 'active', 'renewed'].includes(inquiry.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => setShowAddMeetingModal(inquiry)}
                    data-testid={`add-meeting-${inquiry.id}`}
                  >
                    <Plus className="w-3 h-3" />
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
          {/* Search and Filters */}
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
            <select
              value={contactCityFilter}
              onChange={(e) => setContactCityFilter(e.target.value)}
              className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
              data-testid="contact-city-filter"
            >
              <option value="all">All Cities</option>
              {CITIES.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
            <select
              value={contactRoleFilter}
              onChange={(e) => setContactRoleFilter(e.target.value)}
              className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
              data-testid="contact-role-filter"
            >
              <option value="all">All Roles</option>
              <option value="principal">Principal</option>
              <option value="trustee_owner">Trustee/Owner</option>
              <option value="director">Director</option>
              <option value="coordinator">Coordinator</option>
              <option value="accounts">Accounts</option>
              <option value="Primary Contact">Primary Contact</option>
            </select>
            <select
              value={contactStageFilter}
              onChange={(e) => setContactStageFilter(e.target.value)}
              className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
              data-testid="contact-stage-filter"
            >
              <option value="all">All Stages</option>
              {STATUS_SECTIONS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
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
                  .filter(c => {
                    // Text search filter
                    const searchMatch = c.name.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
                      c.phone.includes(contactSearchQuery) ||
                      c.school_name?.toLowerCase().includes(contactSearchQuery.toLowerCase());
                    if (!searchMatch) return false;
                    
                    // City filter
                    if (contactCityFilter !== 'all') {
                      const school = inquiries.find(i => i.id === c.school_id);
                      if (school?.location !== contactCityFilter) return false;
                    }
                    
                    // Role filter
                    if (contactRoleFilter !== 'all' && c.role !== contactRoleFilter) return false;
                    
                    // Stage filter
                    if (contactStageFilter !== 'all' && c.school_status !== contactStageFilter) return false;
                    
                    return true;
                  })
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
      <Dialog open={!!viewInquiry} onOpenChange={() => { setViewInquiry(null); setEditMode(false); setShowHistoryTab(false); }}>
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

                  {/* Selected Offerings / Support Needed */}
                  {viewInquiry.selected_offerings?.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-3">
                      <p className="text-xs text-purple-500 mb-2">Selected Offerings / Support Needed</p>
                      <div className="flex flex-wrap gap-1">
                        {viewInquiry.selected_offerings.map((offeringId, idx) => {
                          const offering = offerings.find(o => o.id === offeringId);
                          return (
                            <span key={idx} className="px-2 py-1 bg-purple-100 rounded text-xs text-purple-700 font-medium">
                              {offering ? offering.title : offeringId}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  {/* Support Needed (from SchoolFunnel) */}
                  {viewInquiry.support_needed?.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600 mb-2">Support Needed</p>
                      <div className="flex flex-wrap gap-1">
                        {viewInquiry.support_needed.map((supportId, idx) => {
                          const offering = offerings.find(o => o.id === supportId);
                          return (
                            <span key={idx} className="px-2 py-1 bg-green-100 rounded text-xs text-green-700 font-medium">
                              {offering ? offering.title : supportId}
                            </span>
                          );
                        })}
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

                  {(viewInquiry.conversion_amount || viewInquiry.onboarding_data?.total_amount) && (
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-500 mb-1">Conversion Details</p>
                      <p className="font-medium text-green-700">
                        Deal Amount: ₹{Number(viewInquiry.conversion_amount || viewInquiry.onboarding_data?.total_amount).toLocaleString()}
                      </p>
                    </div>
                  )}

                  {/* Onboarding Details - Show for converted/active/renewed */}
                  {viewInquiry.onboarding_data && ['converted', 'active', 'renewed'].includes(viewInquiry.status) && (
                    <div className={`${viewInquiry.status === 'renewed' ? 'bg-emerald-50' : 'bg-purple-50'} rounded-lg p-4 space-y-3`}>
                      <p className={`text-sm font-semibold ${viewInquiry.status === 'renewed' ? 'text-emerald-800 border-emerald-200' : 'text-purple-800 border-purple-200'} border-b pb-2`}>
                        {viewInquiry.status === 'renewed' ? 'Renewal Details' : 'Onboarding Details'}
                      </p>
                      
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
                              href={getAbsoluteUrl(viewInquiry.onboarding_data.mou_url)} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 bg-white/50 px-3 py-2 rounded border border-blue-200"
                            >
                              <Eye className="w-4 h-4" />
                              View MOU
                            </a>
                            <a 
                              href={getAbsoluteUrl(viewInquiry.onboarding_data.mou_url)} 
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

                  {/* School History Section */}
                  <div className="border-t pt-4">
                    <button
                      onClick={() => setShowHistoryTab(!showHistoryTab)}
                      className="w-full flex items-center justify-between text-left font-semibold text-[#1E3A5F] mb-3"
                      data-testid="school-history-toggle"
                    >
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        Activity History ({schoolHistory.length})
                      </div>
                      {showHistoryTab ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    
                    {showHistoryTab && (
                      <div className="space-y-2 max-h-[250px] overflow-y-auto" data-testid="school-history-timeline">
                        {loadingHistory ? (
                          <div className="text-center py-4">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-slate-400" />
                            <p className="text-sm text-slate-500 mt-2">Loading history...</p>
                          </div>
                        ) : schoolHistory.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">No history available</p>
                        ) : (
                          schoolHistory.map((item, idx) => (
                            <div key={idx} className={`p-3 rounded-lg text-sm ${
                              item.type === 'created' ? 'bg-blue-50 border-l-4 border-blue-400' :
                              item.type === 'status_change' ? 'bg-amber-50 border-l-4 border-amber-400' :
                              item.type === 'meeting_scheduled' ? 'bg-purple-50 border-l-4 border-purple-400' :
                              item.type === 'followup' ? 'bg-orange-50 border-l-4 border-orange-400' :
                              item.type === 'converted' ? 'bg-green-50 border-l-4 border-green-500' :
                              item.type === 'onboarding_step' ? 'bg-teal-50 border-l-4 border-teal-400' :
                              item.type === 'ticket' ? 'bg-red-50 border-l-4 border-red-400' :
                              item.type === 'note' ? 'bg-slate-50 border-l-4 border-slate-300' :
                              'bg-slate-50 border-l-4 border-slate-300'
                            }`}>
                              <div className="flex items-start gap-2">
                                <span className="mt-0.5">
                                  {item.type === 'created' && <Plus className="w-4 h-4 text-blue-500" />}
                                  {item.type === 'status_change' && <RefreshCw className="w-4 h-4 text-amber-500" />}
                                  {item.type === 'meeting_scheduled' && <Calendar className="w-4 h-4 text-purple-500" />}
                                  {item.type === 'followup' && <Clock className="w-4 h-4 text-orange-500" />}
                                  {item.type === 'converted' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                  {item.type === 'onboarding_step' && <FileCheck className="w-4 h-4 text-teal-500" />}
                                  {item.type === 'ticket' && <Ticket className="w-4 h-4 text-red-500" />}
                                  {item.type === 'note' && <FileText className="w-4 h-4 text-slate-500" />}
                                </span>
                                <div className="flex-1">
                                  <p className="text-slate-700">{item.description}</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {item.date ? new Date(item.date).toLocaleString() : 'No date'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                  disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 30) || date.getDay() === 0}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                      disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 60) || date.getDay() === 0}
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

      {/* Documents Modal */}
      <Dialog open={!!showDocumentsModal} onOpenChange={() => setShowDocumentsModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-cyan-600" />
              Documents - {showDocumentsModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Document Type Selection & Upload */}
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-3">Upload New Document</p>
              <div className="grid grid-cols-2 gap-2">
                {['Proposal', 'MOU', 'Parent Circular', 'Quote', 'Contract', 'Other'].map((docType) => (
                  <label key={docType} className="relative cursor-pointer">
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDocumentUpload(file, docType);
                        e.target.value = '';
                      }}
                      disabled={uploadingDoc}
                    />
                    <div className={`p-3 rounded-lg border text-center transition-all ${
                      uploadingDoc ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-400 hover:bg-cyan-50'
                    } border-slate-200`}>
                      <Upload className="w-4 h-4 mx-auto mb-1 text-slate-500" />
                      <span className="text-xs font-medium text-slate-600">{docType}</span>
                    </div>
                  </label>
                ))}
              </div>
              {uploadingDoc && (
                <p className="text-sm text-cyan-600 mt-2 text-center">Uploading...</p>
              )}
            </div>

            {/* Existing Documents */}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Uploaded Documents ({showDocumentsModal?.documents?.length || 0})</p>
              {showDocumentsModal?.documents?.length > 0 ? (
                <div className="space-y-2">
                  {showDocumentsModal.documents.map((doc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-cyan-600" />
                        <div>
                          <p className="text-sm font-medium text-slate-800">{doc.type}</p>
                          <p className="text-xs text-slate-500 truncate max-w-[200px]">{doc.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getAbsoluteUrl(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-cyan-100 text-cyan-700 rounded hover:bg-cyan-200"
                        >
                          View
                        </a>
                        <button
                          onClick={() => deleteDocument(idx)}
                          className="text-xs px-2 py-1 bg-red-100 text-red-600 rounded hover:bg-red-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-4">No documents uploaded yet</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lost Reason Modal */}
      <Dialog open={!!showLostReasonModal} onOpenChange={() => setShowLostReasonModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-red-600" />
              Mark as Lost - {showLostReasonModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Lost *</label>
              <select
                value={lostReason.startsWith('custom:') ? 'other' : lostReason}
                onChange={(e) => {
                  if (e.target.value === 'other') {
                    setLostReason('custom:');
                  } else {
                    setLostReason(e.target.value);
                  }
                }}
                className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white mb-2"
                data-testid="lost-reason-select"
              >
                <option value="">Select a reason...</option>
                <option value="Budget constraints">Budget constraints</option>
                <option value="Chose competitor">Chose competitor</option>
                <option value="Program not suitable">Program not suitable</option>
                <option value="Decision postponed">Decision postponed</option>
                <option value="No response">No response / Not reachable</option>
                <option value="Management change">Management change</option>
                <option value="other">Other (specify)</option>
              </select>
              {lostReason.startsWith('custom:') && (
                <Textarea
                  placeholder="Please specify the reason..."
                  value={lostReason.replace('custom:', '')}
                  onChange={(e) => setLostReason('custom:' + e.target.value)}
                  className="min-h-[80px]"
                  data-testid="lost-reason-custom"
                />
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowLostReasonModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={submitLostReason} 
                className="flex-1 bg-red-600 hover:bg-red-700"
                data-testid="lost-submit"
              >
                Mark as Lost
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renewal Meeting Modal */}
      <Dialog open={!!showRenewalMeetingModal} onOpenChange={() => setShowRenewalMeetingModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Schedule Renewal Meeting - {showRenewalMeetingModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Meeting Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRenewalMeetingData({...renewalMeetingData, type: 'offline'})}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    renewalMeetingData.type === 'offline' 
                      ? 'border-teal-500 bg-teal-50 text-teal-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <MapPin className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">In-Person</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRenewalMeetingData({...renewalMeetingData, type: 'online'})}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    renewalMeetingData.type === 'online' 
                      ? 'border-teal-500 bg-teal-50 text-teal-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Video className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Online</span>
                </button>
              </div>
            </div>

            {/* Date Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date *</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={renewalMeetingData.date}
                  onSelect={(date) => setRenewalMeetingData({...renewalMeetingData, date})}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 60) || date.getDay() === 0}
                  className="rounded-xl border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Time Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time *</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => setRenewalMeetingData({...renewalMeetingData, time})}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      renewalMeetingData.time === time 
                        ? 'border-teal-500 bg-teal-50 text-teal-700' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            {/* Meeting Link (Online) */}
            {renewalMeetingData.type === 'online' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Link *</label>
                <Input
                  type="url"
                  placeholder="Enter meeting link (Zoom, Google Meet, etc.)"
                  value={renewalMeetingData.link}
                  onChange={(e) => setRenewalMeetingData({...renewalMeetingData, link: e.target.value})}
                  data-testid="renewal-meeting-link"
                />
              </div>
            )}

            {/* Meeting Address (Offline) */}
            {renewalMeetingData.type === 'offline' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Address *</label>
                <Textarea
                  placeholder="Enter meeting location / address"
                  value={renewalMeetingData.address}
                  onChange={(e) => setRenewalMeetingData({...renewalMeetingData, address: e.target.value})}
                  className="min-h-[60px]"
                  data-testid="renewal-meeting-address"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
              <Textarea
                placeholder="Any additional notes for this meeting..."
                value={renewalMeetingData.notes}
                onChange={(e) => setRenewalMeetingData({...renewalMeetingData, notes: e.target.value})}
                className="min-h-[60px]"
                data-testid="renewal-meeting-notes"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRenewalMeetingModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={submitRenewalMeeting} 
                className="flex-1 bg-teal-600 hover:bg-teal-700"
                data-testid="renewal-meeting-submit"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Renewal Convert Modal */}
      <Dialog open={!!showRenewalConvertModal} onOpenChange={() => setShowRenewalConvertModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-600" />
              Renew School - {showRenewalConvertModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Previous Contract Info */}
            {showRenewalConvertModal?.onboarding_data && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <h4 className="font-medium text-blue-800 mb-2">Previous Contract Details</h4>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <span className="text-blue-600 block">Last Amount:</span>
                    <span className="font-medium">₹{Number(showRenewalConvertModal.onboarding_data.total_amount || showRenewalConvertModal.conversion_amount || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 block">Model:</span>
                    <span className="font-medium">{showRenewalConvertModal.onboarding_data.model || '-'}</span>
                  </div>
                  <div>
                    <span className="text-blue-600 block">Students:</span>
                    <span className="font-medium">{showRenewalConvertModal.onboarding_data.total_students || '-'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Offering Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Select Offering *</label>
                <select
                  value={renewalConvertData.offering}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, offering: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-offering"
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
                  value={renewalConvertData.model}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-model"
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
            
            {/* Book Type, Kit Type, Training Type */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">Book Type</label>
                <select
                  value={renewalConvertData.book_type}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, book_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-book-type"
                >
                  <option value="">Select book type</option>
                  <option value="individual_books">Individual Books</option>
                  <option value="no_books">No Books</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Kit Type *</label>
                <select
                  value={renewalConvertData.kit_type}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, kit_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-kit-type"
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
                  value={renewalConvertData.training_type}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, training_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-training-type"
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
                {renewalConvertData.mou_url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-700 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      MOU uploaded
                    </span>
                    <a 
                      href={getAbsoluteUrl(renewalConvertData.mou_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View
                    </a>
                    <button 
                      onClick={() => setRenewalConvertData(prev => ({ ...prev, mou_url: '' }))}
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
                      onChange={(e) => handleRenewalMOUUpload(e.target.files[0])}
                      className="text-sm"
                      disabled={uploadingRenewalMOU}
                      data-testid="renewal-mou-upload"
                    />
                    {uploadingRenewalMOU && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Pricing Type Selection */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="text-sm font-medium text-amber-800 mb-2 block">Pricing Type *</label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricing_type"
                    value="per_student"
                    checked={renewalConvertData.pricing_type === 'per_student'}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm">Per Student</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricing_type"
                    value="fixed"
                    checked={renewalConvertData.pricing_type === 'fixed'}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm">Fixed Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="pricing_type"
                    value="both"
                    checked={renewalConvertData.pricing_type === 'both'}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm">Both</span>
                </label>
              </div>
            </div>

            {/* Fixed Price Input - Show if fixed or both */}
            {(renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') && (
              <div>
                <label className="text-sm font-medium text-slate-700">Fixed Price Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter fixed price"
                  value={renewalConvertData.fixed_price}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, fixed_price: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}

            {/* Grade-wise Pricing - Show if per_student or both */}
            {(renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Grade-wise Student Count & Pricing</label>
                  <Button variant="ghost" size="sm" onClick={addRenewalGradePricing} className="text-blue-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Grade
                  </Button>
                </div>
                <div className="space-y-2">
                  {renewalConvertData.grade_pricing.map((gp, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <Input
                        placeholder="Grade (e.g., 1-5)"
                        value={gp.grade}
                        onChange={(e) => updateRenewalGradePricing(idx, 'grade', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="No. of students"
                        value={gp.students}
                        onChange={(e) => updateRenewalGradePricing(idx, 'students', e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Price/student"
                        value={gp.price_per_student}
                        onChange={(e) => updateRenewalGradePricing(idx, 'price_per_student', e.target.value)}
                      />
                      <div className="flex items-center justify-center text-sm text-slate-600">
                        ₹{((parseInt(gp.students) || 0) * (parseFloat(gp.price_per_student) || 0)).toLocaleString()}
                      </div>
                      {renewalConvertData.grade_pricing.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeRenewalGradePricing(idx)} className="text-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm">
                  <span className="font-medium">Per-Student Total: </span>
                  {renewalConvertData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0)} students • 
                  ₹{renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0).toLocaleString()}
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200">
              <span className="font-semibold text-emerald-800">Grand Total: ₹</span>
              <span className="font-bold text-emerald-900 text-lg">
                {(() => {
                  let total = 0;
                  if (renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') {
                    total += renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                  }
                  if (renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') {
                    total += parseFloat(renewalConvertData.fixed_price) || 0;
                  }
                  return total.toLocaleString();
                })()}
              </span>
            </div>

            {/* School Share */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <label className="text-sm font-medium text-purple-800 mb-2 block">School Share (Revenue Sharing)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Type</label>
                  <select
                    value={renewalConvertData.school_share_type}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, school_share_type: e.target.value }))}
                    className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>
                {renewalConvertData.school_share_type !== 'none' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Calculation</label>
                      <select
                        value={renewalConvertData.school_share_calc}
                        onChange={(e) => setRenewalConvertData(prev => ({ ...prev, school_share_calc: e.target.value }))}
                        className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="lumpsum">Lumpsum</option>
                        <option value="per_student">Per Student</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">
                        {renewalConvertData.school_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <Input
                        type="number"
                        placeholder={renewalConvertData.school_share_type === 'percentage' ? '10' : '5000'}
                        value={renewalConvertData.school_share_value}
                        onChange={(e) => setRenewalConvertData(prev => ({ ...prev, school_share_value: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              {renewalConvertData.school_share_type !== 'none' && renewalConvertData.school_share_value && (
                <div className="mt-2 p-2 bg-purple-100 rounded text-sm">
                  <span className="font-medium text-purple-800">Calculated School Share: ₹</span>
                  <span className="font-bold text-purple-900">
                    {(() => {
                      const totalStudents = renewalConvertData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                      let grandTotal = 0;
                      if (renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') {
                        grandTotal += renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                      }
                      if (renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') {
                        grandTotal += parseFloat(renewalConvertData.fixed_price) || 0;
                      }
                      const shareValue = parseFloat(renewalConvertData.school_share_value) || 0;
                      if (renewalConvertData.school_share_type === 'percentage') {
                        return ((shareValue / 100) * grandTotal).toLocaleString();
                      } else {
                        if (renewalConvertData.school_share_calc === 'per_student') {
                          return (shareValue * totalStudents).toLocaleString();
                        }
                        return shareValue.toLocaleString();
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* GP Share */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <label className="text-sm font-medium text-orange-800 mb-2 block">Growth Partner (GP) Share</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Type</label>
                  <select
                    value={renewalConvertData.gp_share_type}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, gp_share_type: e.target.value }))}
                    className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>
                {renewalConvertData.gp_share_type !== 'none' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Calculation</label>
                      <select
                        value={renewalConvertData.gp_share_calc}
                        onChange={(e) => setRenewalConvertData(prev => ({ ...prev, gp_share_calc: e.target.value }))}
                        className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="lumpsum">Lumpsum</option>
                        <option value="per_student">Per Student</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">
                        {renewalConvertData.gp_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <Input
                        type="number"
                        placeholder={renewalConvertData.gp_share_type === 'percentage' ? '5' : '2000'}
                        value={renewalConvertData.gp_share_value}
                        onChange={(e) => setRenewalConvertData(prev => ({ ...prev, gp_share_value: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              {renewalConvertData.gp_share_type !== 'none' && renewalConvertData.gp_share_value && (
                <div className="mt-2 p-2 bg-orange-100 rounded text-sm">
                  <span className="font-medium text-orange-800">Calculated GP Share: ₹</span>
                  <span className="font-bold text-orange-900">
                    {(() => {
                      const totalStudents = renewalConvertData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                      let grandTotal = 0;
                      if (renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') {
                        grandTotal += renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                      }
                      if (renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') {
                        grandTotal += parseFloat(renewalConvertData.fixed_price) || 0;
                      }
                      const shareValue = parseFloat(renewalConvertData.gp_share_value) || 0;
                      if (renewalConvertData.gp_share_type === 'percentage') {
                        return ((shareValue / 100) * grandTotal).toLocaleString();
                      } else {
                        if (renewalConvertData.gp_share_calc === 'per_student') {
                          return (shareValue * totalStudents).toLocaleString();
                        }
                        return shareValue.toLocaleString();
                      }
                    })()}
                  </span>
                </div>
              )}
            </div>

            {/* School Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">School Team Contacts</label>
                <Button variant="ghost" size="sm" onClick={addRenewalSchoolContact} className="text-blue-600">
                  <Plus className="w-4 h-4 mr-1" /> Add Contact
                </Button>
              </div>
              <div className="space-y-3">
                {renewalConvertData.school_contacts.map((contact, idx) => (
                  <div key={idx} className="bg-slate-50 p-3 rounded-lg space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Name *"
                        value={contact.name}
                        onChange={(e) => updateRenewalSchoolContact(idx, 'name', e.target.value)}
                      />
                      <select
                        value={contact.role}
                        onChange={(e) => updateRenewalSchoolContact(idx, 'role', e.target.value)}
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
                        onChange={(val) => updateRenewalSchoolContact(idx, 'phone_number', val)}
                        countryCode={contact.country_code || '+91'}
                        onCountryCodeChange={(code) => updateRenewalSchoolContact(idx, 'country_code', code)}
                        placeholder="Phone *"
                      />
                      <Input
                        placeholder="Email"
                        value={contact.email}
                        onChange={(e) => updateRenewalSchoolContact(idx, 'email', e.target.value)}
                      />
                    </div>
                    {renewalConvertData.school_contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRenewalSchoolContact(idx)}
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
                    value={renewalConvertData.payment_mode}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, payment_mode: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                    data-testid="renewal-payment-mode"
                  >
                    <option value="from_school">From School</option>
                    <option value="from_student">From Student</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={renewalConvertData.payment_method}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, payment_method: e.target.value }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                    data-testid="renewal-payment-method"
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
                  <Button variant="ghost" size="sm" onClick={addRenewalPaymentTranche} className="text-blue-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Tranche
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mb-2">Enter % or amount - the other will auto-calculate</p>
                <div className="space-y-2">
                  {renewalConvertData.payment_tranches.map((tranche, idx) => (
                    <div key={idx} className="grid grid-cols-5 gap-2 items-center">
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="%"
                          value={tranche.percentage}
                          onChange={(e) => updateRenewalPaymentTranche(idx, 'percentage', e.target.value)}
                          className="pr-6"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                      </div>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={tranche.amount}
                          onChange={(e) => updateRenewalPaymentTranche(idx, 'amount', e.target.value)}
                          className="pl-6"
                        />
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                      </div>
                      <Input
                        type="date"
                        value={tranche.date}
                        onChange={(e) => updateRenewalPaymentTranche(idx, 'date', e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        placeholder="Notes"
                        value={tranche.notes}
                        onChange={(e) => updateRenewalPaymentTranche(idx, 'notes', e.target.value)}
                      />
                      {renewalConvertData.payment_tranches.length > 1 && (
                        <Button variant="ghost" size="sm" onClick={() => removeRenewalPaymentTranche(idx)} className="text-red-500">
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
                  value={renewalConvertData.contract_start}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, contract_start: e.target.value }))}
                  data-testid="renewal-contract-start"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Contract End</label>
                <Input
                  type="date"
                  value={renewalConvertData.contract_end}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, contract_end: e.target.value }))}
                  data-testid="renewal-contract-end"
                />
              </div>
            </div>

            {/* Parent Circular (shown when payment_mode is from_student) */}
            {renewalConvertData.payment_mode === 'from_student' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <label className="text-sm font-medium text-yellow-800 mb-2 block">Parent Circular</label>
                <p className="text-xs text-yellow-600 mb-2">Upload circular to be shared with parents for fee collection</p>
                {renewalConvertData.parent_circular_url ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-yellow-200">
                    <FileText className="w-4 h-4 text-yellow-600" />
                    <a href={renewalConvertData.parent_circular_url} target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-700 hover:underline flex-1 truncate">
                      View Parent Circular
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setRenewalConvertData(prev => ({ ...prev, parent_circular_url: '' }))} className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await axios.post(`${API}/upload`, formData, {
                            headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                          });
                          setRenewalConvertData(prev => ({ ...prev, parent_circular_url: res.data.url }));
                          toast.success('Parent circular uploaded');
                        } catch {
                          toast.error('Failed to upload');
                        }
                      }
                    }}
                    data-testid="renewal-parent-circular"
                  />
                )}
              </div>
            )}

            {/* Payment Link (shown when payment_mode is from_student AND payment_method is online) */}
            {renewalConvertData.payment_mode === 'from_student' && renewalConvertData.payment_method === 'online' && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <label className="text-sm font-medium text-green-800 mb-2 block">Payment Link</label>
                <p className="text-xs text-green-600 mb-2">Add payment link for parents to make online payments</p>
                <Input
                  type="url"
                  placeholder="https://payment-gateway.com/pay/..."
                  value={renewalConvertData.payment_link}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, payment_link: e.target.value }))}
                  data-testid="renewal-payment-link"
                />
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowRenewalConvertModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleRenewalConvert} 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                data-testid="renewal-convert-submit"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Complete Renewal
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
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add New School Lead</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto pr-2 flex-1">
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
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                data-testid="new-school-name"
              />
              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteField === 'school_name' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
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
                        onMouseDown={(e) => e.preventDefault()}
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
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                data-testid="new-school-email"
              />
              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteField === 'email' && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {autocompleteSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
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
                      disabled={(date) => date < startOfDay(new Date())}
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
                onChange={(e) => setNewLead({...newLead, source: e.target.value, referred_by: e.target.value === 'referral' ? newLead.referred_by : ''})}
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
            {newLead.source === 'referral' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Referred By *</label>
                <Input
                  placeholder="Name of person who referred"
                  value={newLead.referred_by || ''}
                  onChange={(e) => setNewLead({...newLead, referred_by: e.target.value})}
                  data-testid="new-school-referred-by"
                />
              </div>
            )}
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
            
            {/* Assignment Option */}
            <div className="bg-blue-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-slate-700 mb-3">Lead Assignment</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assign_option"
                    value="self"
                    checked={newLead.assign_option === 'self'}
                    onChange={(e) => setNewLead({...newLead, assign_option: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Assign to me</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assign_option"
                    value="admin"
                    checked={newLead.assign_option === 'admin'}
                    onChange={(e) => setNewLead({...newLead, assign_option: e.target.value})}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-slate-700">Let admin assign</span>
                </label>
              </div>
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
        <DialogContent className="max-w-md max-h-[90vh]">
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                  {showFollowupModal.followup_type && (
                    <span className="ml-2 px-2 py-0.5 bg-cyan-100 rounded text-xs">
                      {showFollowupModal.followup_type === 'meeting' ? 'Meeting' : 'Message'}
                    </span>
                  )}
                </p>
                {showFollowupModal.followup_comment && (
                  <p className="text-xs text-cyan-600 mt-1">{showFollowupModal.followup_comment}</p>
                )}
              </div>
            )}

            {/* Followup Type Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Followup Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFollowupData(prev => ({...prev, followup_type: 'message', time: '', mode: '', meeting_link: '', address: ''}))}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    followupData.followup_type === 'message' 
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <MessageSquare className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Message</span>
                  <span className="block text-xs text-slate-500">Call/WhatsApp/Email</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFollowupData(prev => ({...prev, followup_type: 'meeting'}))}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    followupData.followup_type === 'meeting' 
                      ? 'border-cyan-500 bg-cyan-50 text-cyan-700' 
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Calendar className="w-5 h-5 mx-auto mb-1" />
                  <span className="block text-sm font-medium">Meeting</span>
                  <span className="block text-xs text-slate-500">Online/In-person</span>
                </button>
              </div>
            </div>

            {/* Date Selector - shown for both */}
            {followupData.followup_type && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={followupData.date}
                  onSelect={(date) => setFollowupData(prev => ({...prev, date}))}
                  disabled={(date) => date < startOfDay(new Date())}
                  className="rounded-xl border border-slate-200"
                />
              </div>
            </div>
            )}

            {/* Meeting Mode - only for meetings */}
            {followupData.followup_type === 'meeting' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFollowupData(prev => ({...prev, mode: 'online', address: ''}))}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      followupData.mode === 'online' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <Video className="w-5 h-5 mx-auto mb-1" />
                    <span className="block text-sm font-medium">Online</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFollowupData(prev => ({...prev, mode: 'offline', meeting_link: ''}))}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      followupData.mode === 'offline' 
                        ? 'border-green-500 bg-green-50 text-green-700' 
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <MapPin className="w-5 h-5 mx-auto mb-1" />
                    <span className="block text-sm font-medium">In-Person</span>
                  </button>
                </div>
              </div>
            )}

            {/* Meeting Link - for online meetings */}
            {followupData.followup_type === 'meeting' && followupData.mode === 'online' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Link *</label>
                <Input
                  value={followupData.meeting_link}
                  onChange={(e) => setFollowupData(prev => ({...prev, meeting_link: e.target.value}))}
                  placeholder="Enter meeting link (Zoom, Google Meet, etc.)"
                  data-testid="meeting-link-input"
                />
              </div>
            )}

            {/* Address - for offline meetings */}
            {followupData.followup_type === 'meeting' && followupData.mode === 'offline' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Meeting Address *</label>
                <Textarea
                  value={followupData.address}
                  onChange={(e) => setFollowupData(prev => ({...prev, address: e.target.value}))}
                  placeholder="Enter meeting location/address"
                  className="min-h-[60px]"
                  data-testid="meeting-address-input"
                />
              </div>
            )}

            {/* Time Selector - only for meetings */}
            {followupData.followup_type === 'meeting' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map(time => (
                  <button
                    key={time}
                    type="button"
                    className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                      followupData.time === time 
                        ? 'border-cyan-500 bg-cyan-100 text-cyan-700' 
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                    onClick={() => setFollowupData(prev => ({...prev, time}))}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
            )}

            {/* Note - shown for both */}
            {followupData.followup_type && (
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
            )}
            
            {/* Auto Email Checkbox - shown for both */}
            {followupData.followup_type && (
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
            )}
            
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
            {/* Reference Data from Previous Stages */}
            {(showOnboardModal?.quoted_price || showOnboardModal?.notes || showOnboardModal?.selected_offerings?.length > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h4 className="text-sm font-medium text-blue-800 mb-2">Reference from Previous Stages</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  {showOnboardModal?.quoted_price && (
                    <div>
                      <p className="text-blue-600 text-xs">Quoted Price</p>
                      <p className="font-medium">₹{Number(showOnboardModal.quoted_price).toLocaleString()}</p>
                    </div>
                  )}
                  {showOnboardModal?.selected_offerings?.length > 0 && (
                    <div>
                      <p className="text-blue-600 text-xs">Selected Offerings</p>
                      <p className="font-medium">{showOnboardModal.selected_offerings.join(', ')}</p>
                    </div>
                  )}
                  {showOnboardModal?.meeting_date && (
                    <div>
                      <p className="text-blue-600 text-xs">Last Meeting</p>
                      <p className="font-medium">{format(new Date(showOnboardModal.meeting_date), 'dd MMM yyyy')}</p>
                    </div>
                  )}
                </div>
                {showOnboardModal?.notes && (
                  <details className="mt-2">
                    <summary className="text-xs text-blue-600 cursor-pointer hover:underline">View Meeting Notes</summary>
                    <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap max-h-32 overflow-y-auto bg-white p-2 rounded border">
                      {showOnboardModal.notes}
                    </p>
                  </details>
                )}
              </div>
            )}

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
                      href={getAbsoluteUrl(onboardData.mou_url)} 
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

            {/* Pricing Type Selection */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <label className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-3">
                <DollarSign className="w-4 h-4" />
                Pricing Type *
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="onboard_pricing_type"
                    value="per_student"
                    checked={onboardData.pricing_type === 'per_student'}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-slate-700">Per Student</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="onboard_pricing_type"
                    value="fixed"
                    checked={onboardData.pricing_type === 'fixed'}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-slate-700">Fixed Price</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="onboard_pricing_type"
                    value="both"
                    checked={onboardData.pricing_type === 'both'}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                    className="w-4 h-4 text-amber-600"
                  />
                  <span className="text-sm text-slate-700">Both</span>
                </label>
              </div>
            </div>

            {/* Fixed Price Input */}
            {(onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') && (
              <div>
                <label className="text-sm font-medium text-slate-700">Fixed Price Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="Enter fixed price amount"
                  value={onboardData.fixed_price}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, fixed_price: e.target.value }))}
                  className="mt-1"
                />
              </div>
            )}

            {/* Grade-wise Pricing */}
            {(onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') && (
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
                <span className="font-medium">Per-Student Total: </span>
                {onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0)} students • 
                ₹{onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0).toLocaleString()}
              </div>
            </div>
            )}

            {/* Grand Total */}
            <div className="bg-green-100 border border-green-300 rounded-lg p-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-green-800">Grand Total:</span>
                <span className="font-bold text-lg text-green-800">
                  ₹{(() => {
                    let total = 0;
                    if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') {
                      total += onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                    }
                    if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
                      total += parseFloat(onboardData.fixed_price) || 0;
                    }
                    return total.toLocaleString();
                  })()}
                </span>
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

            {/* Parent Circular (shown when payment_mode is from_student) */}
            {onboardData.payment_mode === 'from_student' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <label className="text-sm font-medium text-yellow-800 mb-2 block">Parent Circular</label>
                <p className="text-xs text-yellow-600 mb-2">Upload circular to be shared with parents for fee collection</p>
                {onboardData.parent_circular_url ? (
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-yellow-200">
                    <FileText className="w-4 h-4 text-yellow-600" />
                    <a href={onboardData.parent_circular_url} target="_blank" rel="noopener noreferrer" className="text-sm text-yellow-700 hover:underline flex-1 truncate">
                      View Parent Circular
                    </a>
                    <Button variant="ghost" size="sm" onClick={() => setOnboardData(prev => ({ ...prev, parent_circular_url: '' }))} className="text-red-500">
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const formData = new FormData();
                        formData.append('file', file);
                        try {
                          const res = await axios.post(`${API}/upload`, formData, {
                            headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                          });
                          setOnboardData(prev => ({ ...prev, parent_circular_url: res.data.url }));
                          toast.success('Parent circular uploaded');
                        } catch {
                          toast.error('Failed to upload');
                        }
                      }
                    }}
                  />
                )}
              </div>
            )}

            {/* Payment Link (shown when payment_mode is from_student AND payment_method is online) */}
            {onboardData.payment_mode === 'from_student' && onboardData.payment_method === 'online' && (
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <label className="text-sm font-medium text-green-800 mb-2 block">Payment Link</label>
                <p className="text-xs text-green-600 mb-2">Add payment link for parents to make online payments</p>
                <Input
                  type="url"
                  placeholder="https://payment-gateway.com/pay/..."
                  value={onboardData.payment_link}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, payment_link: e.target.value }))}
                />
              </div>
            )}

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
                          model: selected?.title || prev.model
                        }));
                      }}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Offering</option>
                      {offerings.map(off => (
                        <option key={off.id} value={off.id}>{off.title}</option>
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
                </div>
              </div>

              {/* MOU Upload */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="text-sm font-medium text-blue-800 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  MOU Document
                </label>
                <div className="mt-2">
                  {editOnboardData.mou_url ? (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-green-700 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        MOU uploaded
                      </span>
                      <a 
                        href={getAbsoluteUrl(editOnboardData.mou_url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 underline"
                      >
                        View
                      </a>
                      <button 
                        onClick={() => setEditOnboardData(prev => ({ ...prev, mou_url: '' }))}
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
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const formData = new FormData();
                          formData.append('file', file);
                          try {
                            const response = await axios.post(`${API}/upload`, formData, {
                              headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
                            });
                            setEditOnboardData(prev => ({ ...prev, mou_url: response.data.url }));
                            toast.success('MOU uploaded');
                          } catch (error) {
                            toast.error('Failed to upload MOU');
                          }
                        }}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing Type Selection */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <label className="text-sm font-medium text-amber-800 mb-2 block">Pricing Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_pricing_type"
                      value="per_student"
                      checked={editOnboardData.pricing_type === 'per_student'}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm">Per Student</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_pricing_type"
                      value="fixed"
                      checked={editOnboardData.pricing_type === 'fixed'}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm">Fixed Price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="edit_pricing_type"
                      value="both"
                      checked={editOnboardData.pricing_type === 'both'}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-amber-600"
                    />
                    <span className="text-sm">Both</span>
                  </label>
                </div>
              </div>

              {/* Fixed Price Input */}
              {(editOnboardData.pricing_type === 'fixed' || editOnboardData.pricing_type === 'both') && (
                <div>
                  <label className="text-sm font-medium text-slate-700">Fixed Price Amount (₹)</label>
                  <Input
                    type="number"
                    placeholder="Enter fixed price"
                    value={editOnboardData.fixed_price || ''}
                    onChange={(e) => setEditOnboardData(prev => ({ ...prev, fixed_price: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Grade-wise Pricing - Show if per_student or both */}
              {(editOnboardData.pricing_type === 'per_student' || editOnboardData.pricing_type === 'both') && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Grade-wise Student Count & Pricing</label>
                  <Button variant="ghost" size="sm" onClick={() => setEditOnboardData(prev => ({
                    ...prev,
                    grade_pricing: [...(prev.grade_pricing || []), { grade: '', students: '', price_per_student: '' }]
                  }))} className="text-blue-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Grade
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editOnboardData.grade_pricing || []).map((gp, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2">
                      <Input
                        placeholder="Grade (e.g., 1-5)"
                        value={gp.grade || ''}
                        onChange={(e) => {
                          const newGrades = [...(editOnboardData.grade_pricing || [])];
                          newGrades[idx] = { ...newGrades[idx], grade: e.target.value };
                          setEditOnboardData(prev => ({ ...prev, grade_pricing: newGrades }));
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="No. of students"
                        value={gp.students || ''}
                        onChange={(e) => {
                          const newGrades = [...(editOnboardData.grade_pricing || [])];
                          newGrades[idx] = { ...newGrades[idx], students: e.target.value };
                          setEditOnboardData(prev => ({ ...prev, grade_pricing: newGrades }));
                        }}
                      />
                      <Input
                        type="number"
                        placeholder="Price/student"
                        value={gp.price_per_student || ''}
                        onChange={(e) => {
                          const newGrades = [...(editOnboardData.grade_pricing || [])];
                          newGrades[idx] = { ...newGrades[idx], price_per_student: e.target.value };
                          setEditOnboardData(prev => ({ ...prev, grade_pricing: newGrades }));
                        }}
                      />
                      <div className="flex items-center justify-center text-sm text-slate-600">
                        ₹{((parseInt(gp.students) || 0) * (parseFloat(gp.price_per_student) || 0)).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
                {(editOnboardData.grade_pricing || []).length > 0 && (
                  <div className="mt-2 p-2 bg-green-50 rounded-lg text-sm">
                    <span className="font-medium">Per-Student Total: </span>
                    {(editOnboardData.grade_pricing || []).reduce((sum, g) => sum + (parseInt(g.students) || 0), 0)} students • 
                    ₹{(editOnboardData.grade_pricing || []).reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0).toLocaleString()}
                  </div>
                )}
              </div>
              )}

              {/* Grand Total */}
              <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                <span className="font-semibold text-emerald-800">Grand Total: ₹</span>
                <span className="font-bold text-emerald-900 text-lg">
                  {(() => {
                    let total = 0;
                    if (editOnboardData.pricing_type === 'per_student' || editOnboardData.pricing_type === 'both') {
                      total += (editOnboardData.grade_pricing || []).reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                    }
                    if (editOnboardData.pricing_type === 'fixed' || editOnboardData.pricing_type === 'both') {
                      total += parseFloat(editOnboardData.fixed_price) || 0;
                    }
                    return total.toLocaleString();
                  })()}
                </span>
              </div>

              {/* School Share */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <label className="text-sm font-medium text-purple-800 mb-2 block">School Share (Revenue Sharing)</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Type</label>
                    <select
                      value={editOnboardData.school_share_type || 'none'}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, school_share_type: e.target.value }))}
                      className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  {editOnboardData.school_share_type !== 'none' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-500">Calculation</label>
                        <select
                          value={editOnboardData.school_share_calc || 'lumpsum'}
                          onChange={(e) => setEditOnboardData(prev => ({ ...prev, school_share_calc: e.target.value }))}
                          className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="lumpsum">Lumpsum</option>
                          <option value="per_student">Per Student</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">
                          {editOnboardData.school_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                        </label>
                        <Input
                          type="number"
                          placeholder={editOnboardData.school_share_type === 'percentage' ? '10' : '5000'}
                          value={editOnboardData.school_share_value || ''}
                          onChange={(e) => setEditOnboardData(prev => ({ ...prev, school_share_value: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    </>
                  )}
                </div>
                {editOnboardData.school_share_type !== 'none' && editOnboardData.school_share_value && (
                  <div className="mt-2 p-2 bg-purple-100 rounded text-sm">
                    <span className="font-medium text-purple-800">Calculated School Share: ₹</span>
                    <span className="font-bold text-purple-900">
                      {(() => {
                        const totalStudents = (editOnboardData.grade_pricing || []).reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                        let grandTotal = 0;
                        if (editOnboardData.pricing_type === 'per_student' || editOnboardData.pricing_type === 'both') {
                          grandTotal += (editOnboardData.grade_pricing || []).reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                        }
                        if (editOnboardData.pricing_type === 'fixed' || editOnboardData.pricing_type === 'both') {
                          grandTotal += parseFloat(editOnboardData.fixed_price) || 0;
                        }
                        const shareValue = parseFloat(editOnboardData.school_share_value) || 0;
                        if (editOnboardData.school_share_type === 'percentage') {
                          return ((shareValue / 100) * grandTotal).toLocaleString();
                        } else {
                          if (editOnboardData.school_share_calc === 'per_student') {
                            return (shareValue * totalStudents).toLocaleString();
                          }
                          return shareValue.toLocaleString();
                        }
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {/* GP Share */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <label className="text-sm font-medium text-orange-800 mb-2 block">Growth Partner (GP) Share</label>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Type</label>
                    <select
                      value={editOnboardData.gp_share_type || 'none'}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, gp_share_type: e.target.value }))}
                      className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="none">None</option>
                      <option value="percentage">Percentage (%)</option>
                      <option value="amount">Fixed Amount (₹)</option>
                    </select>
                  </div>
                  {editOnboardData.gp_share_type !== 'none' && (
                    <>
                      <div>
                        <label className="text-xs text-slate-500">Calculation</label>
                        <select
                          value={editOnboardData.gp_share_calc || 'lumpsum'}
                          onChange={(e) => setEditOnboardData(prev => ({ ...prev, gp_share_calc: e.target.value }))}
                          className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                        >
                          <option value="lumpsum">Lumpsum</option>
                          <option value="per_student">Per Student</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-slate-500">
                          {editOnboardData.gp_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                        </label>
                        <Input
                          type="number"
                          placeholder={editOnboardData.gp_share_type === 'percentage' ? '5' : '2000'}
                          value={editOnboardData.gp_share_value || ''}
                          onChange={(e) => setEditOnboardData(prev => ({ ...prev, gp_share_value: e.target.value }))}
                          className="h-9"
                        />
                      </div>
                    </>
                  )}
                </div>
                {editOnboardData.gp_share_type !== 'none' && editOnboardData.gp_share_value && (
                  <div className="mt-2 p-2 bg-orange-100 rounded text-sm">
                    <span className="font-medium text-orange-800">Calculated GP Share: ₹</span>
                    <span className="font-bold text-orange-900">
                      {(() => {
                        const totalStudents = (editOnboardData.grade_pricing || []).reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                        let grandTotal = 0;
                        if (editOnboardData.pricing_type === 'per_student' || editOnboardData.pricing_type === 'both') {
                          grandTotal += (editOnboardData.grade_pricing || []).reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                        }
                        if (editOnboardData.pricing_type === 'fixed' || editOnboardData.pricing_type === 'both') {
                          grandTotal += parseFloat(editOnboardData.fixed_price) || 0;
                        }
                        const shareValue = parseFloat(editOnboardData.gp_share_value) || 0;
                        if (editOnboardData.gp_share_type === 'percentage') {
                          return ((shareValue / 100) * grandTotal).toLocaleString();
                        } else {
                          if (editOnboardData.gp_share_calc === 'per_student') {
                            return (shareValue * totalStudents).toLocaleString();
                          }
                          return shareValue.toLocaleString();
                        }
                      })()}
                    </span>
                  </div>
                )}
              </div>

              {/* School Contacts */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">School Team Contacts</label>
                  <Button variant="ghost" size="sm" onClick={() => setEditOnboardData(prev => ({
                    ...prev,
                    school_contacts: [...(prev.school_contacts || []), { name: '', phone_number: '', country_code: '+91', email: '', role: '' }]
                  }))} className="text-blue-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Contact
                  </Button>
                </div>
                <div className="space-y-3">
                  {(editOnboardData.school_contacts || []).map((contact, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name *"
                          value={contact.name || ''}
                          onChange={(e) => {
                            const newContacts = [...(editOnboardData.school_contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], name: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, school_contacts: newContacts }));
                          }}
                        />
                        <select
                          value={contact.role || ''}
                          onChange={(e) => {
                            const newContacts = [...(editOnboardData.school_contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], role: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, school_contacts: newContacts }));
                          }}
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
                          value={contact.phone_number || contact.phone || ''}
                          onChange={(val) => {
                            const newContacts = [...(editOnboardData.school_contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], phone_number: val };
                            setEditOnboardData(prev => ({ ...prev, school_contacts: newContacts }));
                          }}
                          countryCode={contact.country_code || '+91'}
                          onCountryCodeChange={(code) => {
                            const newContacts = [...(editOnboardData.school_contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], country_code: code };
                            setEditOnboardData(prev => ({ ...prev, school_contacts: newContacts }));
                          }}
                          placeholder="Phone *"
                        />
                        <Input
                          placeholder="Email"
                          value={contact.email || ''}
                          onChange={(e) => {
                            const newContacts = [...(editOnboardData.school_contacts || [])];
                            newContacts[idx] = { ...newContacts[idx], email: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, school_contacts: newContacts }));
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Students - Summary */}
              <div className="bg-slate-100 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-3">
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

              {/* Payment Tranches */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-purple-800">Payment Tranches</h4>
                  <Button variant="ghost" size="sm" onClick={() => setEditOnboardData(prev => ({
                    ...prev,
                    payment_tranches: [...(prev.payment_tranches || []), { 
                      percentage: '', 
                      amount: '', 
                      date: '', 
                      status: 'pending' 
                    }]
                  }))} className="text-purple-600">
                    <Plus className="w-4 h-4 mr-1" /> Add Tranche
                  </Button>
                </div>
                <div className="space-y-3">
                  {(editOnboardData.payment_tranches || []).map((tranche, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-purple-800">Tranche {idx + 1}</span>
                        <button 
                          onClick={() => {
                            const newTranches = [...(editOnboardData.payment_tranches || [])];
                            newTranches.splice(idx, 1);
                            setEditOnboardData(prev => ({ ...prev, payment_tranches: newTranches }));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <Input
                          type="number"
                          placeholder="%"
                          value={tranche.percentage || ''}
                          onChange={(e) => {
                            const newTranches = [...(editOnboardData.payment_tranches || [])];
                            newTranches[idx] = { ...newTranches[idx], percentage: e.target.value };
                            // Auto-calculate amount if total_amount is set
                            if (editOnboardData.total_amount && e.target.value) {
                              newTranches[idx].amount = Math.round((editOnboardData.total_amount * parseFloat(e.target.value)) / 100);
                            }
                            setEditOnboardData(prev => ({ ...prev, payment_tranches: newTranches }));
                          }}
                          className="text-sm"
                        />
                        <Input
                          type="number"
                          placeholder="Amount (₹)"
                          value={tranche.amount || ''}
                          onChange={(e) => {
                            const newTranches = [...(editOnboardData.payment_tranches || [])];
                            newTranches[idx] = { ...newTranches[idx], amount: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, payment_tranches: newTranches }));
                          }}
                          className="text-sm"
                        />
                        <Input
                          type="date"
                          value={tranche.date || ''}
                          onChange={(e) => {
                            const newTranches = [...(editOnboardData.payment_tranches || [])];
                            newTranches[idx] = { ...newTranches[idx], date: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, payment_tranches: newTranches }));
                          }}
                          className="text-sm"
                        />
                        <select
                          value={tranche.status || 'pending'}
                          onChange={(e) => {
                            const newTranches = [...(editOnboardData.payment_tranches || [])];
                            newTranches[idx] = { ...newTranches[idx], status: e.target.value };
                            setEditOnboardData(prev => ({ ...prev, payment_tranches: newTranches }));
                          }}
                          className="h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="overdue">Overdue</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {(editOnboardData.payment_tranches || []).length === 0 && (
                    <p className="text-sm text-slate-500 text-center py-2">No payment tranches added</p>
                  )}
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
                disabled={(date) => date < startOfDay(new Date())}
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
                      
                      {/* LMS Setup */}
                      {key === 'lms_setup' && (
                        <LMSSetupSection 
                          step={step}
                          schoolId={showOnboardingWorkflowModal.id}
                          onUpdate={(data) => handleUpdateOnboardingStep(showOnboardingWorkflowModal.id, key, data)}
                          authToken={getAuthHeaders()?.Authorization?.replace('Bearer ', '') || ''}
                        />
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

      {/* Assign Relationship Manager Modal */}
      <Dialog open={!!showAssignRMModal} onOpenChange={() => setShowAssignRMModal(null)}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-indigo-600" />
              Assign Relationship Manager
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="font-medium text-slate-800">{showAssignRMModal?.school_name}</p>
              {showAssignRMModal?.relationship_manager_name && (
                <p className="text-sm text-indigo-600 mt-1">
                  Current RM: {showAssignRMModal.relationship_manager_name}
                </p>
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">Select Relationship Manager</p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {relationshipManagers.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4 text-center">
                    No Relationship Managers found. Create users with &quot;Relationship Manager&quot; role.
                  </p>
                ) : (
                  relationshipManagers.map(rm => (
                    <button
                      key={rm.id}
                      onClick={() => handleAssignRM(rm.id, rm.name)}
                      className={`w-full p-3 rounded-lg border text-left transition-all hover:border-indigo-300 hover:bg-indigo-50 ${
                        showAssignRMModal?.relationship_manager_id === rm.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{rm.name}</p>
                          <p className="text-xs text-slate-500">{rm.email}</p>
                          {rm.city && <p className="text-xs text-slate-400">{rm.city}</p>}
                        </div>
                        {showAssignRMModal?.relationship_manager_id === rm.id && (
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded">Current</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowAssignRMModal(null)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Raise Ticket Modal */}
      <Dialog open={!!showRaiseTicketModal} onOpenChange={() => setShowRaiseTicketModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Raise Ticket - {showRaiseTicketModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Query Type Selector with FAQs */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Query Type *</label>
              <div className="space-y-2 max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-3">
                {TICKET_QUERIES.map((query) => (
                  <button
                    key={query.type}
                    onClick={() => {
                      const relatedOptions = TICKET_RELATED_TO_OPTIONS[query.type] || TICKET_RELATED_TO_OPTIONS.other;
                      setTicketData({ 
                        ...ticketData, 
                        query_type: query.type,
                        related_to: relatedOptions[0]?.value || 'other',
                        subject: query.label,
                        description: query.faq 
                      });
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      ticketData.query_type === query.type
                        ? 'bg-orange-100 text-orange-800 border border-orange-300'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-transparent'
                    }`}
                    data-testid={`query-type-${query.type}`}
                  >
                    {query.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Related To (Sub-category) Selector */}
            {ticketData.query_type && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Related To (Sub-category)</label>
                <select
                  value={ticketData.related_to}
                  onChange={(e) => setTicketData({ ...ticketData, related_to: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="ticket-related-to"
                >
                  {(TICKET_RELATED_TO_OPTIONS[ticketData.query_type] || TICKET_RELATED_TO_OPTIONS.other).map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Subject *</label>
              <Input
                placeholder="Brief description of the issue"
                value={ticketData.subject}
                onChange={(e) => setTicketData({ ...ticketData, subject: e.target.value })}
                data-testid="ticket-subject"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <Textarea
                placeholder="Detailed description of the issue..."
                value={ticketData.description}
                onChange={(e) => setTicketData({ ...ticketData, description: e.target.value })}
                className="min-h-[100px]"
                data-testid="ticket-description"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Priority</label>
              <select
                value={ticketData.priority}
                onChange={(e) => setTicketData({ ...ticketData, priority: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                data-testid="ticket-priority"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            {/* User Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">User Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'school', label: 'School', icon: Building2 },
                  { value: 'teacher', label: 'Teacher', icon: User },
                  { value: 'student', label: 'Student', icon: Users }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setTicketData({ ...ticketData, user_type: type.value })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      ticketData.user_type === type.value
                        ? 'border-[#1E3A5F] bg-blue-50 text-[#1E3A5F]'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    data-testid={`ticket-user-type-${type.value}`}
                  >
                    <type.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="block text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-lg">
              <p className="text-sm font-medium text-slate-700 mb-3">Contact who raised this issue</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Contact Name</label>
                  <Input
                    value={ticketData.contact_name}
                    onChange={(e) => setTicketData({ ...ticketData, contact_name: e.target.value })}
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Phone</label>
                  <Input
                    value={ticketData.contact_phone}
                    onChange={(e) => setTicketData({ ...ticketData, contact_phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs text-slate-500 mb-1">Email</label>
                  <Input
                    value={ticketData.contact_email}
                    onChange={(e) => setTicketData({ ...ticketData, contact_email: e.target.value })}
                    placeholder="Email address"
                  />
                </div>
              </div>
            </div>
            
            {/* Source Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
              <select
                value={ticketData.source}
                onChange={(e) => setTicketData({ ...ticketData, source: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                data-testid="ticket-source"
              >
                {TICKET_SOURCE_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            
            {/* Attachments & Voice Note */}
            <div className="border rounded-lg p-3 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Attachments & Voice Note</label>
              
              {/* File Upload & Voice Record Buttons */}
              <div className="flex gap-2">
                <input
                  type="file"
                  ref={ticketFileInputRef}
                  onChange={handleTicketFileUpload}
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => ticketFileInputRef.current?.click()}
                  disabled={ticketUploading}
                  className="flex items-center gap-1"
                >
                  {ticketUploading ? (
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload File
                </Button>
                
                {/* Voice Recording */}
                {!ticketAudioUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={ticketRecording ? stopTicketRecording : startTicketRecording}
                    className={`flex items-center gap-1 ${ticketRecording ? 'bg-red-50 border-red-300 text-red-600' : ''}`}
                  >
                    {ticketRecording ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop ({ticketRecordTime}s)
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
                    <audio ref={ticketAudioPlayerRef} src={ticketAudioUrl} />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (ticketAudioPlayerRef.current) {
                          ticketAudioPlayerRef.current.paused 
                            ? ticketAudioPlayerRef.current.play() 
                            : ticketAudioPlayerRef.current.pause();
                        }
                      }} 
                      className="p-1"
                    >
                      <Play className="w-4 h-4" />
                    </Button>
                    <span className="text-xs text-purple-600">Voice Note ({ticketRecordTime}s)</span>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setTicketAudioBlob(null);
                        setTicketAudioUrl(null);
                        setTicketRecordTime(0);
                      }} 
                      className="p-1 text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Uploaded Files List */}
              {ticketAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {ticketAttachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded text-xs">
                      <FileText className="w-3 h-3 text-blue-600" />
                      <span className="text-blue-700 max-w-[150px] truncate">{att.name}</span>
                      <button 
                        type="button" 
                        onClick={() => setTicketAttachments(prev => prev.filter((_, i) => i !== idx))} 
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => {
                setShowRaiseTicketModal(null);
                setTicketAttachments([]);
                setTicketAudioBlob(null);
                setTicketAudioUrl(null);
              }} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleRaiseTicket} 
                disabled={!ticketData.query_type || !ticketData.subject}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                Raise Ticket
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminSchoolCRM;
