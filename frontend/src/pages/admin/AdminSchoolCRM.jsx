import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Search, Eye, Building2, Phone, MapPin, Plus, MessageSquare, Calendar, Archive, CalendarClock, CheckCircle2, CheckCircle, Video, Users, User, Mail, Layers, DollarSign, UserPlus, Send, Clock, Edit, Save, RefreshCw, RefreshCcw, X, Upload, Download, FileSpreadsheet, AlertCircle, Gift, FileText, Receipt, Paperclip, History, Ticket, FileCheck, ChevronDown, ChevronUp, Mic, MicOff, Play, Pause, Trash2, Package, ExternalLink, CreditCard, BarChart3, FileSignature } from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../components/ui/popover';
import { Textarea } from '../../components/ui/textarea';
import { Calendar as CalendarComponent } from '../../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, startOfDay } from 'date-fns';
import axios from 'axios';
import PhoneInput from '../../components/PhoneInput';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';
import { saveAs } from 'file-saver';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// OLL Horizontal Logo for Proposals (black text version)
const OLL_LOGO_HORIZONTAL = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAB4AAAAQ4CAMAAADfDTFxAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAGNQTFRF8sfJ5JCUj5evx8vXV2SI11lfLT1q/PHyzS828fL11djhc36c3nV666uu9dXX0T1E+OPk4+XrSVd+O0p01EtRgYum4YOHq7HD7rm8ub7N22ds6J2hZXGSnaS5HzBgyiEp////mWXqBwAAACF0Uk5T//////////////////////////////////////////8An8HQIQAAMPZJREFUeNrs3Wd3IruagFEDBozJxjlQ/P9febtP7tsJMPUq7f1t1sys4yLoaalU4uoAAIS78hIAgAADgAADAAIMAAIMAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAA4AAAwACDAACDAAIMAAIMAAgwAAgwACAAAOAAAOAAAMAAgwAAgwACDAACDAAIMAAIMAAgAADgAADgAADAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDAAIMAAIMAAgAADgAADAAIMAAIMAAIMAAgwAAgwACDAACDAAIAAA4AAAwACDAACDAACDAAIMAAIMAAgwAAgwACAAAOAAAMAAgwAAgwAAgwACDAACDCEm15dhBcSEGD49Qey64PXFRBgEGAAAUaAAQQYBBgQYBBgAAFGgAUYEGAQYAABRoAFGBBgEGAAAUaABRgQYBBgAAFGgAEEGAQYEGCoKsBTLywgwBAfYB9zQIBBgAEEGAEGEGAQYECAQYABBBgBFmBAgEGAAQQYARZgQIBBgAEEGAEWYECAQYABBBgBBhBgEGBAgEGAAQQYARZgQIBBgAEEGAEWYECAQYABBBgBFmBAgEGAAQQYAQYQYBBgQIBBgAEEuDLPi5s8XvPV1Q+9DX7o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';
// OLL Brand Colors
const OLL_BLUE = '#1e3a5f';

// OLL Logo embedded as base64 (white version for dark header backgrounds)
const OLL_LOGO_B64 = 'data:image/png;base64,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CrDVEWDgTYDdRQG2OwIMCLAAC7AFAwTYfRRguyPAwJsAO4sCbHkEGBBgARZgCwZEBNhVFGDbI8CAAAuwAFswQIDdRwG2PQIMvAmwoyjA1keAAQEWYAG2YIAAu48CbH0EGHgTYDdRgAVYgAEBFmABtmCAALuPAmx/BBh4E2AnUYAFWIABARZgAbZggAC7jwJsgQQYEGABFmALBpwJsIsowAIswIAAC7AAWzBAgN1HAbZB+gu8CbCLKMACLMCAAAvwwh9maQQYBNjxFGABtl/AigA7iAKswAIMCLAAu/wAAizAAgyAAAuwAAOcCbDeCjAAAizAAgwgwAIswAC8CbDcCjAAAizAAgwgwAIswAAIsAALMMCZAKutAAMgwAIswAACLMACDIAAC7AAA5wJsNgKMAACLMACDCDAAizAAAiwAAswwJkAa60AAyDAAizAAAIswAIMgAALsAADnAmw1AowAAIswAIMIMACLMAACLAACzCAAAuwAAPw5wFWWgEGQIAFWIABBFiABRgAARZgAQY4E2ChFWAABFiABRhAgAVYgAEQYAEWYAABFmABBuDPA6yzAgyAAAuwAAMIsAALMAACLMACDCDAAizAAAiwAAswwKoAy2xggBUYQIAFWIABBBgBBkCABViAAQRYgAUYgF8LsMoKMAACLMACDCDAAizAAAiwAAswgAALsAADIMACLMAAAizAAgwgwPorwAIMIMACLMAAAizAAgyAAAuwAAMIMAIMgAALsAADHAqwxgowAAIswAIMIMAIMAACLMACDCDAAizAAAiwAAswgAALsAADCLAAC7AAA4wLsMQKMAACLMACDCDACDAAAizAAgwgwAIswAAIsAALMIAAC7AAAwiwAAuwAAMIsAALMIAAC7AAA9ASYIUVYAAEWIAFGECAEWAABFiABRhAgAVYgAEQYAEWYAABFmABBhBgARZg/O0CCLBb61NYCkCAXX0BRoABARZgLAUgwAgwAgwIsAAjwMClALulAowAAwIswFgKQIARYAQYEGABRoABAXZrBdhSAAiwACPAgAC7tQJsKQABdvQFGAEGBNit9S0sBSDAjr4AI8CAAAswlgIQYAQYAQYEWIARYECA3VoBthQAAizACDAgwG6tAFsKQIAdfQFGgAEBdmt9C0sBCLCjL8AIMCDAbq1vYSkAAUaAEWBAgAUYAQYE2K0VYEsB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';

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

// Download file utility - forces download with proper filename for cross-origin URLs (Cloudinary, etc.)
const downloadFile = async (url, filename) => {
  try {
    const absoluteUrl = getAbsoluteUrl(url);
    
    // First, try to determine extension from URL before fetching
    let extensionFromUrl = '';
    const urlPath = absoluteUrl.split('?')[0];
    
    // Handle Cloudinary URLs which may have format like /upload/v12345/file.pdf
    const cloudinaryMatch = urlPath.match(/\/([^/]+)\.([a-zA-Z0-9]+)$/);
    if (cloudinaryMatch) {
      extensionFromUrl = `.${cloudinaryMatch[2].toLowerCase()}`;
    } else {
      const urlExtMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
      if (urlExtMatch) {
        extensionFromUrl = `.${urlExtMatch[1].toLowerCase()}`;
      }
    }
    
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    
    // Determine file extension from content-type
    const contentType = response.headers.get('content-type') || '';
    let extension = '';
    
    // Map content-type to extension
    const contentTypeMap = {
      'application/pdf': '.pdf',
      'image/png': '.png',
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/csv': '.csv',
      'text/plain': '.txt',
    };
    
    // Check for exact match first
    if (contentTypeMap[contentType]) {
      extension = contentTypeMap[contentType];
    } else {
      // Check for partial matches
      if (contentType.includes('pdf')) extension = '.pdf';
      else if (contentType.includes('png')) extension = '.png';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
      else if (contentType.includes('webp')) extension = '.webp';
      else if (contentType.includes('gif')) extension = '.gif';
      else if (contentType.includes('word') || contentType.includes('doc')) extension = '.docx';
      else if (contentType.includes('excel') || contentType.includes('spreadsheet') || contentType.includes('sheet')) extension = '.xlsx';
      else if (contentType.includes('csv')) extension = '.csv';
    }
    
    // If content-type didn't give us an extension, use the one from URL
    if (!extension && extensionFromUrl) {
      extension = extensionFromUrl;
    }
    
    // Default to .pdf if we still don't have an extension
    if (!extension) {
      extension = '.pdf';
    }
    
    // Clean filename and ensure it has the right extension
    // Remove any existing extension from filename
    let cleanFilename = filename.replace(/\.[^/.]+$/, '');
    // Remove any special characters that might cause issues
    cleanFilename = cleanFilename.replace(/[<>:"/\\|?*]/g, '_');
    cleanFilename = `${cleanFilename}${extension}`;
    
    // Create blob with correct MIME type
    const mimeType = Object.keys(contentTypeMap).find(key => contentTypeMap[key] === extension) || contentType || 'application/octet-stream';
    const typedBlob = new Blob([blob], { type: mimeType });
    
    const blobUrl = window.URL.createObjectURL(typedBlob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup after a short delay
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    
  } catch (error) {
    console.error('Download error:', error);
    // Fallback: open in new tab if download fails
    window.open(getAbsoluteUrl(url), '_blank');
  }
};

// Extract filename from URL or generate a proper one
const getFilenameFromUrl = (url, prefix = 'document', extension = 'pdf') => {
  if (!url) return `${prefix}.${extension}`;
  
  // Try to extract filename from URL
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const parts = pathname.split('/');
    const lastPart = parts[parts.length - 1];
    
    // If the URL has a recognizable filename with extension, use it
    if (lastPart && lastPart.includes('.')) {
      // Clean up Cloudinary URLs that might have transformations
      const cleanName = lastPart.split('?')[0];
      return cleanName;
    }
  } catch (e) {
    // URL parsing failed, use fallback
  }
  
  // Generate a clean filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}_${timestamp}.${extension}`;
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
  const [showEditLeadModal, setShowEditLeadModal] = useState(null);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [lastProposalPDF, setLastProposalPDF] = useState(null); // { base64, filename, schoolId }
  const [expandedFollowups, setExpandedFollowups] = useState(new Set()); // Set of school IDs with expanded followup section
  const [editingFollowupDate, setEditingFollowupDate] = useState(null); // { schoolId, taskId }
  const [editLeadData, setEditLeadData] = useState({
    offering: '',
    training_type: '', // teacher_training, student_training, both
    grades_from: '',
    grades_to: '',
    program_type: 'lab_setup', // lab_setup or per_student
    lab_kit_count: 30,
    kit_ratio: '1:2', // 1 kit per 2 students
    min_students: 800,
    grade_pricing: [{ grade: '', price_per_student: '' }],
    book_type: 'individual', // individual or shared
    course_type: 'only_robotics', // only_robotics or robotics_coding_ai
    model: 'compulsory', // compulsory or optional
    pricing_type: 'per_student', // per_student, fixed, both
    fixed_price: '',
    notes: '',
  });
  const [showRenewalMeetingModal, setShowRenewalMeetingModal] = useState(null);
  const [renewalMeetingData, setRenewalMeetingData] = useState({ date: null, time: '', type: 'offline', notes: '', link: '', address: '' });
  const [showRenewalConvertModal, setShowRenewalConvertModal] = useState(null);
  const [schoolPoData, setSchoolPoData] = useState(null);  // PO data from ProcureWay
  const [loadingPoData, setLoadingPoData] = useState(false);
  const [syncingExpenses, setSyncingExpenses] = useState(false);
  const [renewalConvertData, setRenewalConvertData] = useState({
    offering: '',
    model: '',
    book_type: '',
    kit_type: '',
    lab_kit_count: '', // Number of lab kits (when kit_type is lab_setup)
    course_type: '', // only_robotics, robotics_coding_ai
    training_type: '',
    pricing_type: 'per_student', // 'per_student', 'fixed', 'both'
    fixed_price: '',
    grade_pricing: [{ grade: '', price_per_student: '' }],
    total_students: 0,
    total_amount: 0,
    school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
    payment_mode: 'from_school',
    payment_method: '',
    payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
    deadline_date: '', // Deadline for online payments
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
    gp_share_amount: 0,
    address: '' // School address
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
    lab_kit_count: '', // Number of lab kits (when kit_type is lab_setup)
    course_type: '', // only_robotics, robotics_coding_ai
    training_type: '',
    programs: [],
    address: ''
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
    lab_kit_count: '', // Number of lab kits (when kit_type is lab_setup)
    course_type: '', // only_robotics, robotics_coding_ai
    training_type: '', // student_training, teacher_training
    pricing_type: 'per_student', // 'per_student', 'fixed', 'both'
    fixed_price: '',
    grade_pricing: [{ grade: '', price_per_student: '' }],
    total_students: 0,
    total_amount: 0,
    school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
    // Payment details
    payment_mode: 'from_school', // from_school, from_student, online
    payment_method: '', // cheque, neft, online, cash
    payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
    deadline_date: '', // Deadline for online payments
    contract_start: '',
    contract_end: '',
    mou_url: '', // MOU document upload
    parent_circular_url: '', // Parent circular URL (for from_student payment mode)
    payment_link: '', // Payment link (for online payment method)
    is_draft: false,
    // School Share and GP Share fields
    school_share_type: 'none', // 'none', 'percentage', 'amount'
    school_share_calc: 'lumpsum', // 'per_student', 'lumpsum'
    school_share_value: '',
    school_share_amount: 0,
    gp_share_type: 'none', // 'none', 'percentage', 'amount'
    gp_share_calc: 'lumpsum', // 'per_student', 'lumpsum'
    gp_share_value: '',
    gp_share_amount: 0,
  });
  const [editOnboardData, setEditOnboardData] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [uploadingMOU, setUploadingMOU] = useState(false);
  const [generatingMOU, setGeneratingMOU] = useState(false);
  const [generatingParentCircular, setGeneratingParentCircular] = useState(false);
  const lastOnboardInquiryId = useRef(null);
  // Email modal states
  const [showEmailModal, setShowEmailModal] = useState(null); // school inquiry object
  const [emailModalType, setEmailModalType] = useState('introduction');
  const [emailModalSending, setEmailModalSending] = useState(false);
  const [emailModalCustomMsg, setEmailModalCustomMsg] = useState('');
  const [emailModalToEmail, setEmailModalToEmail] = useState('');
  const [emailModalTaskId, setEmailModalTaskId] = useState(null);

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
    assign_option: 'self', // 'self' or 'admin'
    sendIntroEmail: false
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

  // Auto-fetch PO data when onboarding workflow modal opens
  useEffect(() => {
    const autoFetchPoData = async () => {
      if (!showOnboardingWorkflowModal?.id) {
        setSchoolPoData(null);
        return;
      }
      // Auto-fetch PO data from ProcureWay
      setLoadingPoData(true);
      try {
        const response = await axios.get(`${API}/schools/${showOnboardingWorkflowModal.id}/onboarding-po-info`, {
          headers: getAuthHeaders()
        });
        setSchoolPoData(response.data);
        
        // If we have PO data with delivery info, auto-update the kit_delivery step
        if (response.data?.has_po && (response.data?.delivery_date || response.data?.tracking_link)) {
          const kitDeliveryStep = showOnboardingWorkflowModal?.onboarding_workflow?.steps?.kit_delivery;
          // Only update if fields are empty (don't overwrite manual entries)
          if (!kitDeliveryStep?.data?.po_number) {
            await axios.patch(`${API}/schools/${showOnboardingWorkflowModal.id}/onboarding-step/kit_delivery`, {
              data: {
                delivery_date: response.data.delivery_date || kitDeliveryStep?.data?.delivery_date || '',
                dispatch_date: response.data.dispatch_date || kitDeliveryStep?.data?.dispatch_date || '',
                tracking_link: response.data.tracking_link || response.data.public_tracking_url || kitDeliveryStep?.data?.tracking_link || '',
                po_number: response.data.po_number,
                po_status: response.data.po_status,
                vendor_name: response.data.vendor_name
              }
            }, {
              headers: getAuthHeaders()
            });
            // Refresh modal data
            const updatedResponse = await axios.get(`${API}/schools/${showOnboardingWorkflowModal.id}/onboarding`, {
              headers: getAuthHeaders()
            });
            setShowOnboardingWorkflowModal(prev => ({
              ...prev,
              onboarding_workflow: updatedResponse.data.workflow
            }));
          }
        }
      } catch (error) {
        console.error('Failed to fetch PO data:', error);
        setSchoolPoData(null);
      } finally {
        setLoadingPoData(false);
      }
    };
    autoFetchPoData();
  }, [showOnboardingWorkflowModal?.id]);

  // Get this week's data for dashboard
  const getThisWeekData = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // For followups, use next 7 days from today
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfNext7Days = new Date(today);
    endOfNext7Days.setDate(today.getDate() + 7);
    endOfNext7Days.setHours(23, 59, 59, 999);

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

    // Legacy followups (from followup_date field) - use next 7 days
    const legacyFollowups = inquiries.filter(i => {
      if (!i.followup_date) return false;
      const followupDate = new Date(i.followup_date);
      return followupDate >= startOfToday && followupDate <= endOfNext7Days;
    }).map(i => ({
      ...i,
      type: 'legacy',
      task_label: 'Scheduled Followup'
    }));

    // Scheduled followup tasks (from followup_tasks array) - use next 7 days
    const scheduledFollowups = [];
    const taskLabels = { followup_1: 'F1: OLL Program', followup_2: 'F2: Partner Schools', followup_3: 'F3: Admissions +15%', followup_4: 'F4: Last Note' };
    inquiries.forEach(i => {
      if (i.followup_tasks && Array.isArray(i.followup_tasks)) {
        i.followup_tasks.forEach(task => {
          if (task.status === 'pending') {
            const taskDate = new Date(task.scheduled_date);
            if (taskDate >= startOfToday && taskDate <= endOfNext7Days) {
              scheduledFollowups.push({
                ...i,
                followup_date: task.scheduled_date,
                type: 'scheduled_task',
                task_id: task.id,
                task_label: taskLabels[task.email_type] || task.email_type,
                email_type: task.email_type
              });
            }
          }
        });
      }
    });

    // Combine all followups
    const followups = [...legacyFollowups, ...scheduledFollowups]
      .sort((a, b) => new Date(a.followup_date) - new Date(b.followup_date));

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
    // If reopening the same inquiry (e.g. user closed without saving), keep in-memory state
    if (lastOnboardInquiryId.current === inquiry.id && showOnboardModal === null) {
      setShowOnboardModal(inquiry);
      return;
    }
    lastOnboardInquiryId.current = inquiry.id;
    // Pre-populate onboardData with existing inquiry data
    // Check both onboarding_data and proposal_data for saved values
    const existingOnboardData = inquiry.onboarding_data || {};
    const proposalData = inquiry.proposal_data || {};
    
    // Map book_type values from proposal_data format to onboarding format
    const mapBookType = (val) => {
      if (!val) return '';
      if (val === 'individual') return 'individual_books';
      if (val === 'shared') return 'no_books';
      return val; // Already in correct format
    };
    
    // Map model values from proposal_data format to onboarding format (capitalize)
    const mapModel = (val) => {
      if (!val) return '';
      if (val === 'compulsory') return 'Compulsory';
      if (val === 'optional') return 'Optional';
      return val; // Already in correct format
    };
    
    // Map kit_type from program_type
    const mapKitType = (programType) => {
      if (programType === 'lab_setup') return 'lab_setup';
      if (programType === 'per_student') return 'individual';
      return '';
    };
    
    setOnboardData({
      offering: existingOnboardData.offering || proposalData.offering || inquiry.selected_offerings?.[0] || '',
      model: existingOnboardData.model || mapModel(proposalData.model) || '',
      book_type: existingOnboardData.book_type || mapBookType(proposalData.book_type) || '',
      kit_type: existingOnboardData.kit_type || mapKitType(proposalData.program_type) || '',
      lab_kit_count: existingOnboardData.lab_kit_count || proposalData.lab_kit_count || '',
      course_type: existingOnboardData.course_type || proposalData.course_type || '',
      training_type: existingOnboardData.training_type || proposalData.training_type || '',
      pricing_type: existingOnboardData.pricing_type || proposalData.pricing_type || 'per_student',
      fixed_price: existingOnboardData.fixed_price || proposalData.fixed_price || '',
      grade_pricing: existingOnboardData.grade_pricing?.length > 0 
        ? existingOnboardData.grade_pricing 
        : (proposalData.grade_pricing?.length > 0 ? proposalData.grade_pricing.map(gp => ({
            grade: gp.grade || '',
            students: gp.students || '',
            price_per_student: gp.price_per_student || ''
          })) : [{ grade: '', students: '', price_per_student: '' }]),
      total_students: existingOnboardData.total_students || 0,
      total_amount: existingOnboardData.total_amount || inquiry.quoted_price || 0,
      school_contacts: existingOnboardData.school_contacts?.length > 0 
        ? existingOnboardData.school_contacts 
        : [{ name: inquiry.contact_name || '', phone_number: inquiry.phone || '', country_code: '+91', email: inquiry.email || '', role: 'principal' }],
      school_address: existingOnboardData.school_address || inquiry.location || '',
      additional_services: existingOnboardData.additional_services?.length > 0
        ? existingOnboardData.additional_services
        : [{ item: '', qty: '', price: '' }],
      gst_type: existingOnboardData.gst_type || '',
      payment_mode: existingOnboardData.payment_mode || 'from_school',
      payment_method: existingOnboardData.payment_method || '',
      payment_tranches: existingOnboardData.payment_tranches?.length > 0 
        ? existingOnboardData.payment_tranches 
        : [{ amount: '', percentage: '', date: '', notes: '' }],
      deadline_date: existingOnboardData.deadline_date || '',
      contract_start: existingOnboardData.contract_start || '',
      contract_end: existingOnboardData.contract_end || '',
      mou_url: existingOnboardData.mou_url || '',
      parent_circular_url: existingOnboardData.parent_circular_url || '',
      payment_link: existingOnboardData.payment_link || '',
      is_draft: false,
      school_share_type: existingOnboardData.school_share_type || 'none',
      school_share_calc: existingOnboardData.school_share_calc || 'lumpsum',
      school_share_value: existingOnboardData.school_share_value || '',
      school_share_amount: existingOnboardData.school_share_amount || 0,
      gp_share_type: existingOnboardData.gp_share_type || 'none',
      gp_share_calc: existingOnboardData.gp_share_calc || 'lumpsum',
      gp_share_value: existingOnboardData.gp_share_value || '',
      gp_share_amount: existingOnboardData.gp_share_amount || 0,
    });
    setShowOnboardModal(inquiry);
  };

  // Helper to open Edit Lead modal with pre-populated data
  const openEditLeadModal = (inquiry) => {
    // Check both proposal_data and onboarding_data for saved values
    const existingData = inquiry.proposal_data || inquiry.onboarding_data || {};
    
    // Ensure grade_pricing has proper structure
    let gradePricing = existingData.grade_pricing;
    if (!gradePricing || !Array.isArray(gradePricing) || gradePricing.length === 0) {
      gradePricing = [{ grade: '', price_per_student: '' }];
    }
    
    setEditLeadData({
      offering: existingData.offering || inquiry.selected_offerings?.[0] || '',
      training_type: existingData.training_type || 'teacher_training',
      grades_from: existingData.grades_from || '1st',
      grades_to: existingData.grades_to || '8th',
      program_type: existingData.program_type || 'lab_setup',
      lab_kit_count: existingData.lab_kit_count || 30,
      kit_ratio: existingData.kit_ratio || '1:2',
      min_students: existingData.min_students || 800,
      grade_pricing: gradePricing,
      book_type: existingData.book_type || 'individual',
      course_type: existingData.course_type || 'only_robotics',
      model: existingData.model || 'compulsory',
      pricing_type: existingData.pricing_type || 'per_student',
      fixed_price: existingData.fixed_price || '',
      notes: existingData.notes || '',
    });
    setShowEditLeadModal(inquiry);
  };

  // Generate Proposal PDF using jsPDF
  const generateProposalPDF = async (overrideSchool = null, overrideData = null) => {
    const school = overrideSchool || showEditLeadModal;
    const data = overrideData || editLeadData;
    if (!school) return;

    // Auto-save proposal data when triggered from the edit lead modal (not from renewal override)
    if (!overrideSchool && showEditLeadModal?.id) {
      await autoSaveProposalData(showEditLeadModal.id, editLeadData);
    }

    setGeneratingProposal(true);
    try {
      const PW = 210, PH = 297, M = 15;
      const CW = PW - M * 2;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      const schoolName = school?.school_name || school?.name || 'School';

      // Helper function to add a bullet point with proper spacing (OLL Blue bullets)
      const addBulletPoint = (text, xOffset = 8) => {
        doc.setFillColor(30, 58, 95); // OLL Blue #1e3a5f
        doc.circle(M + 3, y - 1.5, 1.2, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        const lines = doc.splitTextToSize(text, CW - xOffset - 4);
        lines.forEach((line, idx) => {
          doc.text(line, M + xOffset, y);
          y += 5;
        });
        y += 1;
      };

      let y = 12;

      // ── BLUE HEADER BAND WITH WHITE LOGO ────────────────────────
      const HEADER_HEIGHT = 32;
      doc.setFillColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.rect(0, 0, PW, HEADER_HEIGHT, 'F');
      
      try {
        // Add white logo on blue background
        doc.addImage(OLL_LOGO_B64, 'PNG', M, 4, 45, 24);
      } catch {
        // Fallback: just add white text if logo fails
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('OLL', M + 10, 20);
      }
      y = HEADER_HEIGHT + 10;

      // ── TITLE (OLL Blue) ────────────────────────────────────────────
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.text('OLL Robotics and AI Program Proposal', PW / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`For ${schoolName}`, PW / 2, y, { align: 'center' });
      y += 10;

      // ── GREETING ──────────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const greetingText = `Dear ${schoolName} Team,`;
      doc.setFont('helvetica', 'bold');
      doc.text(greetingText, M, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      doc.text('Greetings from Team OLL', M, y);
      y += 10;

      // ── INTRODUCTION (with increased line spacing) ────────────────────────────────────────────
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      const introText = `We are delighted to share our OLL's Robotics & AI Lab Setup for the upcoming academic year for your school. Designed for students from Grades 1 to 10th, this program has already been successfully implemented in 400+ schools across India, with remarkable achievements.`;
      const introLines = doc.splitTextToSize(introText, CW);
      // Increased line spacing (7mm instead of 5mm)
      introLines.forEach((line, idx) => {
        doc.text(line, M, y + (idx * 7));
      });
      y += introLines.length * 7 + 8;

      // ── PROGRAM DETAILS BOX ───────────────────────────────────
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.roundedRect(M, y, CW, 26, 2, 2, 'FD');
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      
      // Course type display
      const courseTypeDisplay = data.course_type === 'robotics_coding_ai' ? 'Robotics, Coding & AI' : 'Robotics & AI';
      doc.text(`Program: ${courseTypeDisplay}`, M + 8, y + 8);
      
      // Model display
      const modelDisplay = data.model === 'optional' ? 'Optional' : 'Compulsory';
      doc.text(`Model: ${modelDisplay}`, M + 100, y + 8);
      
      // Training type display
      const trainingDisplay = data.training_type === 'teacher_training' ? 'Teacher Training' : data.training_type === 'student_training' ? 'Student Training' : 'Both';
      doc.text(`Type of Training: ${trainingDisplay}`, M + 8, y + 15);
      
      doc.text(`Grades: ${data.grades_from || '1st'} to ${data.grades_to || '8th'}`, M + 8, y + 22);
      y += 32;

      // ── PROGRAM DELIVERABLES SECTION (OLL Blue) ────────────────────────────
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.text('Program Deliverables', M, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      // Build deliverables array conditionally based on kit_type, training_type, book_type
      const deliverables = [];

      // 1. Lab Kits - only if program_type is lab_setup
      if (data.program_type === 'lab_setup') {
        deliverables.push(`${data.lab_kit_count || 30} Master Robotics & AI Lab Kits will be provided to the school. Kit to Child ratio: ${data.kit_ratio || '1:2'}`);
        deliverables.push('Lab Wallpapers & Decoration material will be provided');
      }

      // 2. Individual kit - only if program_type is per_student
      if (data.program_type === 'per_student') {
        deliverables.push('Individual Robotics & AI Kit will be provided to each student');
      }

      // 3. Curriculum - always show
      deliverables.push('28 Projects Based Curriculum covering: Robotics, Coding, 3D Design, AI, Science');

      // 4. Training - based on training_type
      if (data.training_type === 'teacher_training') {
        deliverables.push('Year Long Teacher Training will be provided to the School Teachers');
        deliverables.push('One Hardcopy Robotics Manual per Grade will be provided to the Teachers');
      } else if (data.training_type === 'student_training') {
        deliverables.push('Direct Student Training sessions will be conducted by OLL trainers');
      } else if (data.training_type === 'both') {
        deliverables.push('Year Long Teacher Training will be provided to the School Teachers');
        deliverables.push('Direct Student Training sessions will also be conducted by OLL trainers');
        deliverables.push('One Hardcopy Robotics Manual per Grade will be provided to the Teachers');
      }

      // 5. LMS Access - always show
      deliverables.push('Each child gets LMS Access - Tracking progress, Monitoring Assessment & Soft copy STEM Certificate');

      // 6. Events - always show
      deliverables.push('Robotics Competition & Robotics Exhibition conducted at the School');

      // 7. Books - only if book_type is individual
      if (data.book_type === 'individual') {
        deliverables.push('Hardcopy Robotics Take Home Book per child');
      }

      // Render deliverables with proper bullet points
      deliverables.forEach((item) => {
        addBulletPoint(item);
      });
      y += 4;

      // ── FEES STRUCTURE TABLE (OLL Blue) ────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.text('Fees Structure', M, y);
      y += 6;

      // Build fees table based on pricing_type
      const pricingType = data.pricing_type || 'per_student';
      let feeRows = [];
      
      if (pricingType === 'fixed') {
        // Fixed price only
        const fixedPrice = data.fixed_price || '0';
        feeRows.push(['Robotics & AI Program (Annual Fee)', `Rs. ${Number(fixedPrice).toLocaleString('en-IN')}`]);
      } else if (pricingType === 'both') {
        // Show both fixed and per-student pricing
        const fixedPrice = data.fixed_price || '0';
        feeRows.push(['Fixed Annual Program Fee', `Rs. ${Number(fixedPrice).toLocaleString('en-IN')}`]);
        
        // Add grade-wise pricing
        const gradePricing = data.grade_pricing || [];
        gradePricing.filter(gp => gp.grade && gp.price_per_student).forEach(gp => {
          feeRows.push([`Grade ${gp.grade} (Per Student)`, `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}/student/year`]);
        });
      } else {
        // Per student pricing (default)
        const gradePricing = data.grade_pricing || [];
        feeRows = gradePricing.filter(gp => gp.grade && gp.price_per_student).map(gp => [
          `Grade ${gp.grade}`,
          `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}/student/year`
        ]);
        
        // If no grade pricing, show default
        if (feeRows.length === 0) {
          feeRows.push(['Robotics & AI Program Fees', 'Per student pricing (to be discussed)']);
        }
      }

      autoTable(doc, {
        startY: y,
        head: [['Structure', 'Fees for Program']],
        body: feeRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 10, fontStyle: 'bold' }, // OLL Blue header
        styles: { fontSize: 10, cellPadding: 4, textColor: [0, 0, 0] },
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 90 } },
        margin: { left: M, right: M },
        alternateRowStyles: { fillColor: [248, 248, 248] },
      });
      y = doc.lastAutoTable.finalY + 10;

      // ── PAGE 2 ──────────────────────────────────────────────────
      doc.addPage();
      y = 12;

      // Logo on page 2
      try {
        doc.addImage(OLL_LOGO_HORIZONTAL, 'PNG', M, y, 50, 12);
      } catch {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('OLL', M, y + 8);
      }
      y += 22;

      // ── REQUIREMENTS FROM SCHOOL (OLL Blue) ────────────────────────────────
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.text('Requirements from School', M, y);
      y += 8;

      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);

      const requirements = [
        'Schools need to provide a list of enrolled students (Name, STD & Division), Schedule, school holidays & exam in a specific format for program related communication & Certification purposes.',
        `The program should be opted for a minimum ${data.min_students || 800} students for the altogether chosen grades, as selected by the school for this pricing.`,
        'OLL collects 100% advance Program Fees which can be submitted via NEFT/Cheque to Clone Futura Live Solutions Private Limited.'
      ];

      requirements.forEach((item) => {
        addBulletPoint(item);
      });
      y += 6;

      // ── NEXT STEPS BOX ──────────────────────────────────────────
      doc.setFillColor(248, 248, 248);
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      const nextStepsText = `Upon finalizing the proposal, we will proceed with signing the Memorandum of Understanding (MoU), which will be shared by OLL.\n\nAfter signing the MoU and completion of the payment process, a minimum of 15 days will be required to commence the teacher training program to ensure proper allocation and verification of resource personnel for quality execution.`;
      const nextStepsLines = doc.splitTextToSize(nextStepsText, CW - 16);
      const boxHeight = nextStepsLines.length * 5 + 12;
      doc.roundedRect(M, y, CW, boxHeight, 2, 2, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text(nextStepsLines, M + 8, y + 8);
      y += boxHeight + 10;

      // ── CLOSING (OLL Blue) ─────────────────────────────────────────────────
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95); // OLL Blue #1e3a5f
      doc.text('We look forward to your positive response and a fruitful collaboration ahead!', M, y);
      y += 12;

      // ── CONTACT INFO ─────────────────────────────────────────────
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.text('For any queries or assistance, feel free to contact our Business Development Team at', M, y);
      y += 8;

      doc.setFont('helvetica', 'bold');
      doc.text('+91 9699188188  |  Team OLL  |  www.oll.co', M, y);

      // ── DOWNLOAD ────────────────────────────────────────────────
      const fileName = `Proposal_${(schoolName).replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.pdf`;
      
      // ── STORE BASE64 FOR EMAIL ATTACHMENT ──────────────────────
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      setLastProposalPDF({ base64: pdfBase64, filename: fileName, schoolId: school.id });
      
      doc.save(fileName);

      // ── UPLOAD & STORE ──────────────────────────────────────────
      try {
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', pdfFile);
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        const fileUrl = uploadRes.data.url;
        
        // Save to documents
        const existingDocs = school?.documents || [];
        const newDoc = {
          type: 'Proposal',
          url: fileUrl,
          name: fileName,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.name || user?.email || 'Admin',
        };
        await axios.patch(`${API}/schools/inquiry/${school.id}`, {
          documents: [...existingDocs, newDoc],
        }, { headers: getAuthHeaders() });
        fetchInquiries();
        toast.success('Proposal generated, downloaded & saved!');
      } catch {
        toast.success('Proposal downloaded!');
      }
    } catch (err) {
      console.error('Proposal generation error:', err);
      toast.error('Failed to generate Proposal: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingProposal(false);
    }
  };

  // Save Edit Lead data and optionally continue to Meeting Done
  // Silently save proposal data without closing the modal
  const autoSaveProposalData = async (schoolId, data) => {
    if (!schoolId || !data) return;
    try {
      await axios.patch(`${API}/schools/inquiry/${schoolId}`, {
        proposal_data: { ...data }
      }, { headers: getAuthHeaders() });
    } catch (err) {
      console.warn('Auto-save failed:', err);
    }
  };

  const handleUpdateFollowupDate = async (schoolId, taskId, newDate) => {
    try {
      await axios.patch(`${API}/schools/${schoolId}/followup-task/${taskId}`, {
        scheduled_date: format(newDate, 'yyyy-MM-dd')
      }, { headers: getAuthHeaders() });
      setEditingFollowupDate(null);
      fetchInquiries();
      toast.success('Followup date updated');
    } catch {
      toast.error('Failed to update date');
    }
  };

  const handleUpdateFollowupStatus = async (schoolId, taskId, newStatus) => {
    try {
      await axios.patch(`${API}/schools/${schoolId}/followup-task/${taskId}`, {
        status: newStatus
      }, { headers: getAuthHeaders() });
      fetchInquiries();
      toast.success(`Followup marked as ${newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleSendFollowupEmail = async (inquiry, task) => {
    const toEmail = inquiry.email;
    if (!toEmail || toEmail.endsWith('@school.oll')) {
      toast.error('No valid email for this school. Please add an email first.');
      return;
    }
    // Open email modal pre-filled with the followup type
    setShowEmailModal(inquiry);
    setEmailModalType(task.email_type);
    setEmailModalToEmail(toEmail);
    setEmailModalCustomMsg('');
    // Store task_id so the endpoint can mark it as sent
    setEmailModalTaskId(task.id);
  };

  const handleSaveEditLead = async (moveToMeetingDone = false) => {    if (!showEditLeadModal) return;
    
    try {
      // Save proposal data to inquiry
      const updateData = {
        proposal_data: { ...editLeadData },
      };
      
      // Also prepare onboarding_data for continuity when moving to Meeting Done
      if (moveToMeetingDone) {
        updateData.onboarding_data = {
          offering: editLeadData.offering,
          training_type: editLeadData.training_type,
          pricing_type: editLeadData.pricing_type,
          fixed_price: editLeadData.fixed_price,
          grade_pricing: editLeadData.grade_pricing.filter(gp => gp.grade),
          lab_kit_count: editLeadData.lab_kit_count || 30,
          kit_type: editLeadData.program_type === 'lab_setup' ? 'lab_setup' : 'student_kit',
          book_type: editLeadData.book_type,
          course_type: editLeadData.course_type,
          model: editLeadData.model,
          grades_from: editLeadData.grades_from,
          grades_to: editLeadData.grades_to,
          min_students: editLeadData.min_students,
          kit_ratio: editLeadData.kit_ratio,
          program_type: editLeadData.program_type,
        };
        updateData.status = 'meeting_done';
      }
      
      await axios.patch(`${API}/schools/inquiry/${showEditLeadModal.id}`, updateData, {
        headers: getAuthHeaders()
      });
      
      toast.success(moveToMeetingDone ? 'Lead updated & moved to Meeting Done!' : 'Lead details saved!');
      setShowEditLeadModal(null);
      fetchInquiries();
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast.error('Failed to save lead details');
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
      const isFirstSchedule = !showRescheduleModal?.meeting_date;
      const formattedDate = format(rescheduleData.date, 'dd MMM yyyy');

      await axios.patch(`${API}/schools/inquiry/${showRescheduleModal.id}`, {
        meeting_date: format(rescheduleData.date, 'yyyy-MM-dd'),
        meeting_time: rescheduleData.time,
        meeting_type: rescheduleData.meeting_type,
        notes: showRescheduleModal.notes 
          ? `${showRescheduleModal.notes}\n\n${isFirstSchedule ? 'Meeting Scheduled' : 'Meeting Rescheduled'} (${rescheduleData.meeting_type}): ${rescheduleData.reason}` 
          : `${isFirstSchedule ? 'Meeting Scheduled' : 'Meeting Rescheduled'} (${rescheduleData.meeting_type}): ${rescheduleData.reason}`
      }, {
        headers: getAuthHeaders()
      });

      // Auto-send meeting email if school has a valid email
      const schoolEmail = showRescheduleModal?.email;
      if (schoolEmail && !schoolEmail.endsWith('@school.oll')) {
        try {
          const emailType = isFirstSchedule ? 'meeting_confirmation' : 'meeting_reschedule';
          await axios.post(`${API}/schools/${showRescheduleModal.id}/send-crm-email`, {
            email_type: emailType,
            to_email: schoolEmail,
            meeting_date: formattedDate,
            meeting_time: rescheduleData.time,
            meeting_mode: rescheduleData.meeting_type,
            meeting_link: rescheduleData.meeting_type === 'online' ? rescheduleData.link || '' : ''
          }, { headers: getAuthHeaders() });
          toast.success(isFirstSchedule ? 'Meeting scheduled & confirmation email sent!' : 'Meeting rescheduled & email sent!');
        } catch {
          toast.success(isFirstSchedule ? 'Meeting scheduled!' : 'Meeting rescheduled!');
        }
      } else {
        toast.success(isFirstSchedule ? 'Meeting scheduled successfully' : 'Meeting rescheduled successfully');
      }

      setShowRescheduleModal(null);
      setRescheduleData({ date: null, time: '', meeting_type: 'offline', reason: '' });
      fetchInquiries();
    } catch (error) {
      toast.error('Failed to save meeting');
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
        address: convertData.address,
        initial_onboard_data: {
          model: convertData.model,
          book_type: convertData.book_type,
          kit_type: convertData.kit_type,
          lab_kit_count: convertData.kit_type === 'lab_setup' ? convertData.lab_kit_count : '',
          course_type: convertData.course_type,
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
      setConvertData({ amount: '', model: '', book_type: '', kit_type: '', lab_kit_count: '', course_type: '', training_type: '', programs: [], address: '' });
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
      lab_kit_count: existingData.lab_kit_count || '',
      course_type: existingData.course_type || '',
      gst_type: existingData.gst_type || '',
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
      deadline_date: existingData.deadline_date || '',
      contract_start: '',
      contract_end: '',
      mou_url: '',
      parent_circular_url: existingData.parent_circular_url || '',
      payment_link: existingData.payment_link || '',
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
        conversion_amount: String(finalAmount),
        address: renewalConvertData.address,
        onboarding_data: {
          ...(showRenewalConvertModal.onboarding_data || {}),
          offering: renewalConvertData.offering,
          model: renewalConvertData.model,
          kit_type: renewalConvertData.kit_type,
          lab_kit_count: renewalConvertData.kit_type === 'lab_setup' ? renewalConvertData.lab_kit_count : '',
          course_type: renewalConvertData.course_type,
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
          payment_method: renewalConvertData.payment_mode === 'online' ? 'student' : renewalConvertData.payment_method,
          payment_tranches: renewalConvertData.payment_mode === 'online' ? [] : formattedTranches,
          gst_type: renewalConvertData.gst_type || '',
          deadline_date: renewalConvertData.deadline_date,
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
        offering: '', model: '', book_type: '', kit_type: '', lab_kit_count: '', course_type: '', training_type: '',
        pricing_type: 'per_student', fixed_price: '',
        grade_pricing: [{ grade: '', price_per_student: '' }],
        total_students: 0, total_amount: 0,
        school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
        payment_mode: 'from_school', payment_method: '',
        payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
        deadline_date: '',
        contract_start: '', contract_end: '', mou_url: '',
        parent_circular_url: '', payment_link: '',
        school_share_type: 'none', school_share_calc: 'lumpsum', school_share_value: '', school_share_amount: 0,
        gp_share_type: 'none', gp_share_calc: 'lumpsum', gp_share_value: '', gp_share_amount: 0,
        address: ''
      });
      fetchInquiries();
    } catch (error) {
      console.error('Renewal error:', error.response?.data || error.message);
      toast.error(error.response?.data?.detail || 'Failed to renew school');
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
    // Calculate total based on pricing_type (include fixed_price when applicable)
    let totalAmount = 0;
    if (renewalConvertData.pricing_type === 'per_student' || renewalConvertData.pricing_type === 'both') {
      totalAmount += renewalConvertData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
    }
    if (renewalConvertData.pricing_type === 'fixed' || renewalConvertData.pricing_type === 'both') {
      totalAmount += parseFloat(renewalConvertData.fixed_price) || 0;
    }
    
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

  const generateMOUPDF = async (overrideSchool = null, overrideData = null) => {
    const school = overrideSchool || showOnboardModal;
    const data = overrideData || onboardData;
    if (!school) return;
    setGeneratingMOU(true);
    try {
      const PW = 210, PH = 297, M = 15;
      const CW = PW - M * 2;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      // ── USE EMBEDDED OLL LOGO (no CORS issues) ─────────────────
      const logoDataUrl = OLL_LOGO_B64;

      // ── HELPERS ────────────────────────────────────────────────
      let y = 0;

      const drawPageHeader = () => {
        doc.setFillColor(30, 58, 95);
        doc.rect(0, 0, PW, 26, 'F');
        // 1920x1080 = 1.78:1 ratio → at height 20mm: width = 20*1.78 = 35.5mm
        doc.addImage(logoDataUrl, 'PNG', M, 3, 36, 20);
      };

      const drawFooter = (pageNum, total) => {
        doc.setFillColor(30, 58, 95);
        doc.rect(0, PH - 10, PW, 10, 'F');
        doc.setTextColor(180, 200, 235);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text('Clonefutura Live Solutions Pvt Ltd  |  info@oll.co  |  +91 9920188188  |  www.oll.co', M, PH - 4);
        doc.text(`Page ${pageNum} of ${total}`, PW - M, PH - 4, { align: 'right' });
      };

      const ensureSpace = (needed) => {
        if (y + needed > PH - 15) {
          doc.addPage();
          drawPageHeader();
          y = 31;
        }
      };

      const sectionTitle = (text) => {
        ensureSpace(12);
        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(text, M, y);
        y += 7;
      };

      const bullet = (text, indent = 4) => {
        const lines = doc.splitTextToSize('• ' + text, CW - indent);
        ensureSpace(lines.length * 5 + 2);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(lines, M + indent, y);
        y += lines.length * 5 + 1;
      };

      const inlineField = (label, value, indent = 4) => {
        ensureSpace(7);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(`${label}: `, M + indent, y);
        const lw = doc.getTextWidth(`${label}: `);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(value || '________________________________________', M + indent + lw, y);
        y += 6;
      };

      // ── DATA ───────────────────────────────────────────────────
      const schoolName = school?.school_name || school?.name || school?.school || '';
      const schoolAddress = data.school_address || school?.location || school?.address || '';
      const contacts = data.school_contacts || [];
      const principal = contacts.find(c => c.role === 'principal') || contacts[0] || {};
      const coordinator = contacts.find(c => ['coordinator', 'program_coordinator', 'teacher'].includes(c.role)) || contacts[1] || {};
      const accountsCoord = contacts.find(c => ['accounts', 'accountant', 'admin'].includes(c.role)) || contacts[2] || {};

      const courseTypeLabel = { only_robotics: 'Only Robotics', robotics_coding_ai: 'Robotics, Coding & AI' };
      const kitTypeLabel = { lab_setup: 'Lab Setup', individual: 'Individual', no_kit: 'No Kit' };
      const trainingLabel = { student_training: 'Student Training', teacher_training: 'Teacher Training', both: 'Teacher & Student Training' };
      const paymentCollectionLabel = { from_school: 'School Collects & Pays OLL', from_student: 'OLL Collects Online', from_distributor: 'Via Distributor', online: 'OLL Collects Online' };
      const paymentMethodLabel = { cheque: 'Cheque', neft: 'Netbanking', online: 'Online Payments', cash: 'Cash' };

      const todayStr = format(new Date(), 'dd MMMM yyyy');

      // ── PAGE 1 HEADER ──────────────────────────────────────────
      drawPageHeader();
      y = 32;

      // MOU Title
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('MEMORANDUM OF UNDERSTANDING', PW / 2, y, { align: 'center' });
      y += 6;
      // Subtitle with school name
      if (schoolName) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 100, 130);
        doc.text(`Between ${schoolName} and Clonefutura Live Solutions Pvt Ltd (OLL)`, PW / 2, y, { align: 'center' });
        y += 5;
      }
      doc.setDrawColor(30, 58, 95);
      doc.setLineWidth(0.6);
      doc.line(M, y, PW - M, y);
      y += 8;

      // Introduction
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      const introText = `This Memorandum of Understanding (MOU) is entered into on ${todayStr} by and between Clonefutura Live Solutions Pvt Ltd ("OLL") and ${schoolName || '________________________________________'} ("School").`;
      const introLines = doc.splitTextToSize(introText, CW);
      doc.text(introLines, M, y);
      y += introLines.length * 5.5 + 3;

      // Party 1 — dynamic height based on address line count
      const ollAddrText = '103, 1st Floor - Kshitij Building, Veera Desai Rd, Dattaguru Nagar, Azad Nagar, Andheri West, Mumbai, Maharashtra 400053';
      const ollAddrLines = doc.splitTextToSize(ollAddrText, CW - 8);
      const p1H = 6 + 7 + (ollAddrLines.length * 5) + 6 + 4; // padding + name + addr + phone line + bottom
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(M, y, CW, p1H, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('PARTY 1 (Service Provider):', M + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text('Clonefutura Live Solutions Pvt Ltd, also referred to as "OLL"', M + 4, y + 13);
      doc.text(ollAddrLines, M + 4, y + 19);
      doc.text('Phone: +91 9920188188  |  GST No: 27AAKCC1113B1ZC', M + 4, y + 19 + ollAddrLines.length * 5 + 2);
      y += p1H + 4;

      // Party 2
      const p2Lines = schoolAddress ? doc.splitTextToSize(`Address: ${schoolAddress}`, CW - 8) : [];
      const p2H = 22 + (p2Lines.length > 1 ? (p2Lines.length - 1) * 5 : 0);
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(M, y, CW, p2H, 2, 2, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('PARTY 2 (School):', M + 4, y + 6);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`School Name: ${schoolName || '________________________________________'}`, M + 4, y + 13);
      if (p2Lines.length > 0) doc.text(p2Lines, M + 4, y + 19);
      y += p2H + 6;

      // Terms & Conditions Banner
      ensureSpace(12);
      doc.setFillColor(30, 58, 95);
      doc.rect(M, y, CW, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TERMS AND CONDITIONS', M + 4, y + 5.5);
      y += 12;

      // ── SECTION 1: PROGRAM DETAILS ─────────────────────────────
      sectionTitle('1. PROGRAM DETAILS');

      const progFields = [
        ['Course Name', data.offering],
        ['Course Type', courseTypeLabel[data.course_type] || data.course_type],
        ['Model', data.model || 'Compulsory / Optional'],
        ['Kit', kitTypeLabel[data.kit_type] || data.kit_type || 'Individual / Lab Setup'],
        ...(data.kit_type === 'lab_setup' ? [['No. of Lab Kits', String(data.lab_kit_count || '')]] : []),
        ['Mode', 'Offline'],
        ['Type of Training', trainingLabel[data.training_type] || 'Teacher Training / Student Training'],
        ['Assistant Educator Required', 'Yes / No'],
      ];
      progFields.forEach(([lbl, val]) => inlineField(lbl, val));
      y += 3;

      // Timeline
      ensureSpace(35);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Timeline of Program:', M + 4, y);
      y += 6;

      const trainingStart = '_____ / _____ / _____';
      [
        ['Teacher Training Start Date (if teacher training)', trainingStart],
        ['Kit Delivery Date', '_____ / _____ / _____'],
        ['Kit Distribution Date', '_____ / _____ / _____'],
      ].forEach(([lbl, val]) => {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(`• ${lbl}: ${val}`, M + 4, y);
        y += 6;
      });

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('* NOTE: The kits will only be delivered 15 days after we receive payment', M + 4, y);
      y += 8;

      // ── SECTION 2: COUNT AND PAYMENT ───────────────────────────
      ensureSpace(15);
      sectionTitle('2. COUNT AND PAYMENT');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);

      const gradeOrder = ['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
      const enteredGrades = (data.grade_pricing || []).filter(gp => gp.grade && (gp.students || gp.price_per_student));
      const isExclusiveGST = data.gst_type === 'exclusive_18';
      
      // Helper to add GST rows to table body
      const addGstRows = (body, baseAmt, cols) => {
        if (isExclusiveGST && baseAmt > 0) {
          const gstAmt = Math.round(baseAmt * 0.18);
          const grandTot = baseAmt + gstAmt;
          // GST row
          const gstRow = cols === 2 
            ? [{ content: 'GST @ 18%', styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }, { content: `Rs. ${gstAmt.toLocaleString('en-IN')}`, styles: { fontStyle: 'italic', textColor: [80, 80, 80], halign: 'right' } }]
            : [{ content: 'GST @ 18%', styles: { fontStyle: 'italic', textColor: [80, 80, 80] } }, '', '', { content: `Rs. ${gstAmt.toLocaleString('en-IN')}`, styles: { fontStyle: 'italic', textColor: [80, 80, 80], halign: 'right' } }];
          body.push(gstRow);
          // Grand Total row
          const grandRow = cols === 2
            ? [{ content: 'Grand Total (incl. GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: `Rs. ${grandTot.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }]
            : [{ content: 'Grand Total (incl. GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, '', '', { content: `Rs. ${grandTot.toLocaleString('en-IN')}`, styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }];
          body.push(grandRow);
        }
      };

      // ═══ CASE 1: FIXED PRICING - Hide "Student Count" and "Amount per Student" columns ═══
      if (data.pricing_type === 'fixed') {
        doc.text('Below is the fixed program pricing:', M, y);
        y += 5;
        
        const fixedAmt = Number(data.fixed_price || data.total_amount || 0);
        const fixedTableBody = [
          [{ content: 'Fixed Price Package', styles: { fontStyle: 'bold' } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { halign: 'right', fontStyle: 'bold' } }],
        ];
        // Add Subtotal row for GST exclusive
        if (isExclusiveGST) {
          fixedTableBody.push([
            { content: 'Subtotal (before GST)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
            { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } },
          ]);
        } else {
          fixedTableBody.push([
            { content: 'Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
            { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } },
          ]);
        }
        addGstRows(fixedTableBody, fixedAmt, 2);

        autoTable(doc, {
          startY: y,
          head: [['Description', 'Total Amount']],
          body: fixedTableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
          margin: { left: M, right: M },
          alternateRowStyles: { fillColor: [245, 249, 255] },
        });
        y = doc.lastAutoTable.finalY + 5;

      // ═══ CASE 2: BOTH PRICING - Two separate tables ═══
      } else if (data.pricing_type === 'both') {
        // ── Fixed Price Table ──
        doc.text('Fixed Program Fee:', M, y);
        y += 5;
        
        const fixedAmt = Number(data.fixed_price || 0);
        const fixedTableBody = [
          [{ content: 'Fixed Price Component', styles: { fontStyle: 'bold' } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { halign: 'right', fontStyle: 'bold' } }],
          [{ content: 'Subtotal (Fixed)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }],
        ];

        autoTable(doc, {
          startY: y,
          head: [['Description', 'Amount']],
          body: fixedTableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
          margin: { left: M, right: M },
          alternateRowStyles: { fillColor: [245, 249, 255] },
        });
        y = doc.lastAutoTable.finalY + 6;

        // ── Per-Student Pricing Table ──
        ensureSpace(15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text('Per-Student Program Fee:', M, y);
        y += 5;

        let perStudentTotal = 0;
        let perStudentTableBody;
        if (enteredGrades.length > 0) {
          perStudentTableBody = enteredGrades.map(gp => {
            if (gp.students && gp.price_per_student) {
              const tot = Number(gp.students) * Number(gp.price_per_student);
              perStudentTotal += tot;
              return [gp.grade, String(gp.students), `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, `Rs. ${tot.toLocaleString('en-IN')}`];
            }
            return [gp.grade, String(gp.students || ''), gp.price_per_student ? `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}` : '', ''];
          });
        } else {
          // Empty grade_pricing: show blank table Jr. KG to 10th
          perStudentTableBody = gradeOrder.map(grade => [grade, '', '', '']);
        }
        
        if (data.training_type === 'teacher_training' || data.training_type === 'both') {
          perStudentTableBody.push(['No. of Teachers', '', '', '']);
        }
        perStudentTableBody.push([
          { content: 'Subtotal (Per-Student)', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
          { content: String(data.total_students || ''), styles: { fontStyle: 'bold' } },
          '',
          { content: perStudentTotal ? `Rs. ${perStudentTotal.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
        ]);

        autoTable(doc, {
          startY: y,
          head: [['Grade', 'No. of Students', 'Price / Student', 'Total Amount']],
          body: perStudentTableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
          columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 38, halign: 'center' }, 2: { cellWidth: 57, halign: 'right' }, 3: { cellWidth: 57, halign: 'right' } },
          margin: { left: M, right: M },
          alternateRowStyles: { fillColor: [245, 249, 255] },
        });
        y = doc.lastAutoTable.finalY + 6;

        // ── Combined Total Table ──
        ensureSpace(15);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text('Combined Total:', M, y);
        y += 5;
        
        const combinedBase = fixedAmt + perStudentTotal;
        const combinedTableBody = [
          ['Fixed Component', fixedAmt ? `Rs. ${fixedAmt.toLocaleString('en-IN')}` : ''],
          ['Per-Student Component', perStudentTotal ? `Rs. ${perStudentTotal.toLocaleString('en-IN')}` : ''],
          [{ content: isExclusiveGST ? 'Subtotal (before GST)' : 'Grand Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } }, { content: combinedBase ? `Rs. ${combinedBase.toLocaleString('en-IN')}` : '', styles: { fontStyle: 'bold', textColor: [30, 58, 95], halign: 'right' } }],
        ];
        addGstRows(combinedTableBody, combinedBase, 2);

        autoTable(doc, {
          startY: y,
          head: [['Component', 'Amount']],
          body: combinedTableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
          columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 80, halign: 'right' } },
          margin: { left: M, right: M },
          alternateRowStyles: { fillColor: [245, 249, 255] },
        });
        y = doc.lastAutoTable.finalY + 5;

      // ═══ CASE 3: PER-STUDENT PRICING (default) ═══
      } else {
        doc.text('Below is the table outlining the count and program pricing per student:', M, y);
        y += 5;

        let tableTotal = 0;
        let gradeTableBody;
        
        if (enteredGrades.length > 0) {
          // Show entered grades with their data
          gradeTableBody = enteredGrades.map(gp => {
            if (gp.students && gp.price_per_student) {
              const tot = Number(gp.students) * Number(gp.price_per_student);
              tableTotal += tot;
              return [gp.grade, String(gp.students), `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, `Rs. ${tot.toLocaleString('en-IN')}`];
            }
            return [gp.grade, String(gp.students || ''), gp.price_per_student ? `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}` : '', ''];
          });
        } else {
          // Empty grade_pricing: render blank table from Jr. KG to 10th
          gradeTableBody = gradeOrder.map(grade => [grade, '', '', '']);
        }

        if (data.training_type === 'teacher_training' || data.training_type === 'both') {
          gradeTableBody.push(['No. of Teachers', '', '', '']);
        }
        
        const baseAmt = tableTotal > 0 ? tableTotal : Number(data.total_amount || 0);
        const baseAmtDisp = baseAmt ? `Rs. ${baseAmt.toLocaleString('en-IN')}` : '';
        
        gradeTableBody.push([
          { content: isExclusiveGST ? 'Subtotal (before GST)' : 'Total', styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
          { content: String(data.total_students || ''), styles: { fontStyle: 'bold' } },
          '',
          { content: baseAmtDisp, styles: { fontStyle: 'bold', textColor: [30, 58, 95] } },
        ]);
        addGstRows(gradeTableBody, baseAmt, 4);

        autoTable(doc, {
          startY: y,
          head: [['Grade', 'No. of Students', 'Price / Student', 'Total Amount']],
          body: gradeTableBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', halign: 'center' },
          styles: { fontSize: 8.5, cellPadding: 2.5, textColor: [50, 50, 50] },
          columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 38, halign: 'center' }, 2: { cellWidth: 57, halign: 'right' }, 3: { cellWidth: 57, halign: 'right' } },
          margin: { left: M, right: M },
          alternateRowStyles: { fillColor: [245, 249, 255] },
        });
        y = doc.lastAutoTable.finalY + 5;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(120, 120, 120);
      doc.text('* NOTE: In case of change in count it will take us additional 15 days to deliver the material', M, y);
      y += 7;

      // Requirements
      ensureSpace(25);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Requirements:', M, y);
      y += 5;
      ['Room with basic infrastructure provided with table & chairs and storage space for the Robotic kits',
        'WiFi / internet stability',
        'Projector / Smart Board',
      ].forEach(r => bullet(r));
      y += 3;

      // Additional Services Table — only show if entries exist
      const validServices = (data.additional_services || []).filter(s => s.item || s.qty || s.price);
      if (validServices.length > 0) {
        ensureSpace(38);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text('Additional Services / Components:', M, y);
        y += 4;
        const servicesBody = validServices.map(s => [
          s.item || '',
          String(s.qty || ''),
          s.price ? `Rs. ${Number(s.price).toLocaleString('en-IN')}` : '',
        ]);
        autoTable(doc, {
          startY: y,
          head: [['Item', 'Qty', 'Price']],
          body: servicesBody,
          theme: 'grid',
          headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9 },
          styles: { fontSize: 9, cellPadding: 4 },
          columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' } },
          margin: { left: M, right: M },
        });
        y = doc.lastAutoTable.finalY + 6;
      }

      // Payment Collection
      ensureSpace(22);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Payment Collection:', M, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Collection From: ${paymentCollectionLabel[data.payment_mode] || '________________________'}`, M + 4, y);
      y += 6;
      doc.text(`Payment Mode: ${paymentMethodLabel[data.payment_method] || '________________________'}`, M + 4, y);
      y += 7;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Notes for Payment: ', M + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text('Program Fees to be paid 100% in advance.', M + 4 + doc.getTextWidth('Notes for Payment: '), y);
      y += 7;

      // Payment Terms Table
      ensureSpace(30);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Payment Terms:', M, y);
      y += 4;

      const validTranches = (data.payment_tranches || []).filter(t => t.amount);
      const trancheRows = validTranches.length > 0
        ? validTranches.map(t => [
            `Rs. ${Number(t.amount).toLocaleString('en-IN')}`,
            t.percentage ? `${t.percentage}%` : '100%',
            t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '________________________',
          ])
        : [['________________________', '100%', '________________________']];

      autoTable(doc, {
        startY: y,
        head: [['Amount', 'Payment %', 'Due Date']],
        body: trancheRows,
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 0: { cellWidth: 75 }, 1: { cellWidth: 35, halign: 'center' }, 2: { cellWidth: 70 } },
        margin: { left: M, right: M },
      });
      y = doc.lastAutoTable.finalY + 6;

      // GST info - just show the GST type (calculations are in tables)
      const gstLabels = { inclusive_18: 'GST Inclusive @ 18%', exclusive_18: 'GST Exclusive @ 18%', book_gst_0: 'Book GST = 0%' };
      if (data.gst_type) {
        ensureSpace(8);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text('GST: ', M, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(50, 50, 50);
        doc.text(gstLabels[data.gst_type] || data.gst_type, M + doc.getTextWidth('GST: '), y);
        y += 6;
      }

      // Bank Details
      ensureSpace(30);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('Bank Details for Payment:', M, y);
      y += 5;
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(M, y, CW, 24, 2, 2, 'F');
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text('Account No: 50200063789133', M + 4, y + 6);
      doc.text('IFSC Code: HDFC0000240', M + 4, y + 12);
      doc.text('Bank: HDFC Bank  |  Branch: Sandoz House Worli', M + 4, y + 18);
      doc.text('Account Holder: Clonefutura Live Solutions Pvt Ltd', M + CW/2, y + 6);
      doc.text('GST No: 27AAKCC1113B1ZC', M + CW/2, y + 12);
      y += 30;

      // ── SECTION 3 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('3. PROGRAM EXECUTION & DELIVERABLES');
      const kitDeliverableLine = data.kit_type === 'lab_setup'
        ? `${data.lab_kit_count ? data.lab_kit_count + ' Lab Kit(s)' : 'Lab Kits'} will be supplied.`
        : data.kit_type === 'individual'
        ? 'Individual kits will be provided to each student.'
        : null;
      [
        'OLL will require a dedicated coordinator who will be the point of contact for the program\'s execution at the school level.',
        'Grade-specific individual textbooks will be provided.',
        ...(kitDeliverableLine ? [kitDeliverableLine] : []),
        '16 projects-based curriculum will be delivered.',
        'Teacher training will be provided.',
        'STEM certificates will be awarded to each participating child.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 4 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('4. KIT & BOOK MANAGEMENT');
      [
        'OLL will deliver the required kits and books to the school within 15 days of receiving full payment.',
        'The school is responsible for informing security and arranging proper storage for the kits and books upon arrival.',
        'The school is also required to verify the count of kits and books as per the delivery provided by OLL to ensure accuracy.',
        'Free Replacement for Damaged Components: In the event that any kit components are found to be damaged or defective, OLL will provide a free replacement for such components for the full duration of the program.',
        'Replacement for Lost Components & Books: If students misplace or lose components, they are required to purchase replacements either from the OLL website or directly from the educator. Misplaced components are not covered under the free replacement policy.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 5 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('5. EDUCATOR CONFIRMATION & TRAINING SCHEDULE');
      [
        'The school will provide OLL with the final timetable and holiday calendar of the school.',
        'OLL will take 15 days from receiving the timetable and calendar to allocate a certified educator for the program.',
        'Once allocated, the school will have the opportunity to approve the educator and provide feedback. If satisfied, OLL will move forward with the training sessions.',
        'In case the school wishes to request a change of the educator for valid reasons, OLL will evaluate the request and, if accepted, will take 15 days to allocate a new educator.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 6 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('6. REPORTS');
      bullet('OLL will collect physical/digital feedback forms from students and teachers once every three months. OLL will analyze these and share the report with the school.');
      y += 3;

      // ── SECTION 7 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('7. ASSESSMENT & AUDIT');
      [
        'OLL will conduct periodic on-site audits of educators to ensure quality and consistency in the delivery of the program.',
        'Students will undergo assessments at the end of the year that will include both theoretical and practical components to gauge their understanding and progress.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 8 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('8. DISPLAY');
      [
        'School is requested to inform the OLL team about all parent orientations and Parent Teacher Meetings. OLL will have representatives and projects showcased on a table.',
        'Students will prepare projects to showcase during a final exhibition, where parents will be invited to observe the students\' work.',
        'One final video will be professionally shot by OLL; school to give permission to shoot on a mutually agreed upon date.',
        'All videos and photos clicked by OLL/School team are permissible to be uploaded on social media platforms.',
        'For Competitions: In certain cases, students may need to arrange additional components for their projects. Our team will guide where to purchase from and even support students, including offering components for rent with a minimal deposit.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 9 ──────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('9. CERTIFICATION');
      [
        'Upon completion of the program, a graduation ceremony will be held where students will receive OLL certifications.',
        'Students list of First Name, Last Name, Grade and Division will be shared with OLL to make the certificates.',
        'A final compilation report summarizing each student\'s performance will also be provided to the school.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 10 ─────────────────────────────────────────────
      ensureSpace(12);
      sectionTitle('10. TERM OF AGREEMENT');

      const cStartDisplay = data.contract_start ? format(new Date(data.contract_start), 'dd MMMM yyyy') : '________________________';
      const cEndDisplay = data.contract_end ? format(new Date(data.contract_end), 'dd MMMM yyyy') : '________________________';

      [
        `This MoU will remain in effect from ${cStartDisplay} to ${cEndDisplay} (one academic year).`,
        'Either party may terminate the agreement with 30 days\' written notice if either party fails to meet their obligations.',
        'Renewal of the agreement for the following year will be based on mutual consent and performance evaluation.',
      ].forEach(item => bullet(item));
      y += 3;

      // ── SECTION 11: CONTACT DETAILS ────────────────────────────
      ensureSpace(12);
      sectionTitle('11. CONTACT DETAILS');

      const renderContact = (title, c, fallbackName, fallbackPhone, fallbackEmail) => {
        ensureSpace(30);
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 58, 95);
        doc.text(title, M, y);
        y += 6;
        [
          ['Name', c?.name || fallbackName || ''],
          ['Mobile', c?.phone_number || fallbackPhone || ''],
          ['E-mail', c?.email || fallbackEmail || ''],
        ].forEach(([lbl, val]) => {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(50, 50, 50);
          doc.text(`${lbl}: ${val || '________________________________________________________'}`, M + 4, y);
          y += 6;
        });
        y += 3;
      };

      renderContact(
        'Program Coordinator Details (From School):',
        coordinator.name ? coordinator : principal,
        school?.contact_name, school?.phone, school?.email
      );
      renderContact('Accounts Coordinator Details (From School):', accountsCoord);
      renderContact(
        'School Principal Details (From School):',
        principal,
        school?.contact_name, school?.phone, school?.email
      );

      // ── AUTHORIZED SIGNATORIES ─────────────────────────────────
      ensureSpace(65);
      doc.setDrawColor(200, 215, 235);
      doc.setLineWidth(0.3);
      doc.line(M, y, PW - M, y);
      y += 7;

      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('AUTHORIZED SIGNATORIES', M, y);
      y += 8;

      const sigW = (CW - 10) / 2;
      const sigH = 55;

      // OLL sig box
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(M, y, sigW, sigH, 2, 2, 'F');
      doc.setDrawColor(160, 185, 215);
      doc.setLineWidth(0.3);
      doc.roundedRect(M, y, sigW, sigH, 2, 2);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('OLL Representative', M + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text('Name: Vidushi Daga', M + 4, y + 15);
      doc.text('Designation: Chairman', M + 4, y + 21);
      doc.text('Signature:', M + 4, y + 32);
      doc.setDrawColor(120, 140, 170);
      doc.line(M + 32, y + 32, M + sigW - 4, y + 32);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Date: _______________________', M + 4, y + 48);

      // School sig box
      const rx = M + sigW + 10;
      doc.setFillColor(240, 245, 252);
      doc.roundedRect(rx, y, sigW, sigH, 2, 2, 'F');
      doc.roundedRect(rx, y, sigW, sigH, 2, 2);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 95);
      doc.text('School Representative', rx + 4, y + 7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 50, 50);
      doc.text(`Name: ${principal?.name || school?.contact_name || '________________________'}`, rx + 4, y + 15);
      doc.text(`Designation: ${principal?.role || '________________________'}`, rx + 4, y + 21);
      doc.text('Signature:', rx + 4, y + 32);
      doc.setDrawColor(120, 140, 170);
      doc.line(rx + 32, y + 32, rx + sigW - 4, y + 32);
      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);
      doc.text('Date: _______________________', rx + 4, y + 48);

      y += sigH + 5;

      // ── FOOTER ON ALL PAGES ────────────────────────────────────
      const totalPages = doc.internal.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        drawFooter(p, totalPages);
      }

      // ── DOWNLOAD ───────────────────────────────────────────────
      const fileName = `MOU_${(schoolName || 'School').replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.pdf`;
      doc.save(fileName);

      // ── UPLOAD & STORE IN DOCUMENTS ───────────────────────────
      try {
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', pdfFile);
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        const fileUrl = uploadRes.data.url;
        const existingDocs = school?.documents || [];
        const newDoc = {
          type: 'MOU',
          url: fileUrl,
          name: fileName,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.name || user?.email || 'Admin',
        };
        // Only save to documents if we have an ID
        if (school?.id) {
          await axios.patch(`${API}/schools/inquiry/${school.id}`, {
            documents: [...existingDocs, newDoc],
          }, { headers: getAuthHeaders() });
          setOnboardData(prev => ({ ...prev, mou_url: fileUrl }));
          fetchInquiries();
        }
        toast.success('MOU generated, downloaded & saved to documents!');
      } catch {
        toast.success('MOU downloaded! (Save to documents failed — check upload service)');
      }
    } catch (err) {
      console.error('MOU generation error:', err);
      toast.error('Failed to generate MOU: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingMOU(false);
    }
  };

  // ═══ GENERATE PARENT CIRCULAR DOC ═══════════════════════════════════════════
  const generateParentCircularPDF = async (schoolOverride = null, dataOverride = null, setDataFunc = null) => {
    const school = schoolOverride || showOnboardModal;
    const data = dataOverride || onboardData;
    const setData = setDataFunc || setOnboardData;
    
    if (!school) return;
    setGeneratingParentCircular(true);
    try {
      // Dynamic import of docx library to avoid webpack initialization issues
      const docx = await import('docx');
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, ImageRun, ExternalHyperlink, TableLayoutType } = docx;

      const schoolName = school?.school_name || school?.name || 'School';
      const academicYear = data.contract_start ? format(new Date(data.contract_start), 'yyyy') + '-' + (parseInt(format(new Date(data.contract_start), 'yy')) + 1).toString().padStart(2, '0') : '2026-27';
      
      // Get grade range from grade_pricing
      const enteredGrades = (data.grade_pricing || []).filter(gp => gp.grade && gp.price_per_student);
      const gradeOrder = ['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'];
      let gradeRangeText = '';
      if (enteredGrades.length > 0) {
        const sortedGrades = enteredGrades.map(g => g.grade).sort((a, b) => gradeOrder.indexOf(a) - gradeOrder.indexOf(b));
        gradeRangeText = sortedGrades.length > 1 ? `${sortedGrades[0]} to ${sortedGrades[sortedGrades.length - 1]}` : sortedGrades[0];
      }
      
      // Payment link
      const paymentLink = data.payment_link || school?.payment_link || `https://oll.co/school-pay/${school?.id || 'demo'}`;

      // Generate QR code as base64 image
      let qrImageData = null;
      try {
        const qrDataUrl = await QRCode.toDataURL(paymentLink, {
          width: 150,
          margin: 1,
          color: { dark: '#1e3a5f', light: '#ffffff' },
        });
        // Convert data URL to base64
        qrImageData = qrDataUrl.split(',')[1];
      } catch (qrErr) {
        console.error('QR Code generation failed:', qrErr);
      }

      // Build fee table rows
      let feeTableRows = [];
      if (enteredGrades.length > 0) {
        feeTableRows = enteredGrades.map(gp => 
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: gp.grade, size: 22 })], alignment: AlignmentType.CENTER })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: `Rs. ${Number(gp.price_per_student).toLocaleString('en-IN')}`, size: 22 })], alignment: AlignmentType.CENTER })],
              }),
            ],
          })
        );
      } else if (data.pricing_type === 'fixed' && data.fixed_price) {
        feeTableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'All Grades', size: 22 })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: `Rs. ${Number(data.fixed_price).toLocaleString('en-IN')}`, size: 22 })], alignment: AlignmentType.CENTER })] }),
            ],
          }),
        ];
      } else {
        feeTableRows = [
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '1st to 4th', size: 22 })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rs. ________', size: 22 })], alignment: AlignmentType.CENTER })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: '5th to 8th', size: 22 })], alignment: AlignmentType.CENTER })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: 'Rs. ________', size: 22 })], alignment: AlignmentType.CENTER })] }),
            ],
          }),
        ];
      }

      // Create document sections
      const docSections = [
        // School Name
        new Paragraph({
          children: [new TextRun({ text: schoolName, bold: true, size: 36, color: '1E3A5F' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }),
        // Title
        new Paragraph({
          children: [new TextRun({ text: `Robotics & A.I. for Academic Year ${academicYear}`, bold: true, size: 32, color: '1E3A5F' })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        // Dear Parents
        new Paragraph({
          children: [new TextRun({ text: 'Dear Parents,', bold: true, size: 24 })],
          spacing: { after: 200 },
        }),
        // Introduction paragraph
        new Paragraph({
          children: [
            new TextRun({ text: `As per the release of NEP 2020, Our school will introduce the Robotics & A.I. Program as a subject from next academic year. We are thrilled to announce our partnership with OLL, to train all our students of Classes from ${gradeRangeText || '_____ to _____'} grade in the field of Robotics & AI so that our children will have an upper hand in the future work industry. OLL is a skill partner with over 400+ Schools across India.`, size: 22 }),
          ],
          spacing: { after: 300 },
        }),
        // Program Deliverables heading
        new Paragraph({
          children: [new TextRun({ text: 'Program Deliverables', bold: true, size: 26, color: '1E3A5F' })],
          spacing: { before: 200, after: 200 },
        }),
        // Deliverables list
        new Paragraph({ children: [new TextRun({ text: '1. Take home Robotic Kit: ', bold: true, size: 22 }), new TextRun({ text: 'Every child gets their own Robotics Kit', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '2. Duration: ', bold: true, size: 22 }), new TextRun({ text: 'Year long - Once a Week, Offline in the school during school hours.', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '3. Assessment & Certification: ', bold: true, size: 22 }), new TextRun({ text: 'will be conducted by the expert from OLL. International Accredited Certificates by STEM.org will be provided after assessment', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '4. Tech Exhibition: ', bold: true, size: 22 }), new TextRun({ text: 'Parents will be invited to an exhibition where our students will proudly showcase their innovative robotics projects.', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '5. 16 Projects: ', bold: true, size: 22 }), new TextRun({ text: 'will be made from that kit', size: 22 })], spacing: { after: 100 } }),
        new Paragraph({ children: [new TextRun({ text: '6. Hard Copy Robotics & AI Books: ', bold: true, size: 22 }), new TextRun({ text: 'will be provided (Step by Step manual + videos, and PDFs)', size: 22 })], spacing: { after: 300 } }),
        // Fees heading
        new Paragraph({
          children: [new TextRun({ text: 'Following are the Fees for the Robotics Program', bold: true, size: 26, color: '1E3A5F' })],
          spacing: { before: 200, after: 200 },
        }),
        // Fee Table
        new Table({
          layout: TableLayoutType.FIXED,
          width: { size: 100, type: WidthType.PERCENTAGE },
          columnWidths: [4000, 4000],
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Grade', bold: true, size: 22, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                  shading: { fill: '1E3A5F' },
                  verticalAlign: 'center',
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Fee per Student', bold: true, size: 22, color: 'FFFFFF' })], alignment: AlignmentType.CENTER })],
                  shading: { fill: '1E3A5F' },
                  verticalAlign: 'center',
                }),
              ],
            }),
            ...feeTableRows,
          ],
        }),
        // Payment Link heading
        new Paragraph({
          children: [new TextRun({ text: `For Grades ${gradeRangeText || '1st to 8th'} Payment Link:`, bold: true, size: 24, color: '1E3A5F' })],
          spacing: { before: 300, after: 100 },
        }),
        // Payment Link (clickable)
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [new TextRun({ text: paymentLink, color: '0066CC', underline: {} , size: 22 })],
              link: paymentLink,
            }),
          ],
          spacing: { after: 200 },
        }),
      ];

      // Add QR code if generated
      if (qrImageData) {
        docSections.push(
          new Paragraph({
            children: [new TextRun({ text: 'Scan QR Code to Pay:', size: 22 })],
            spacing: { before: 100, after: 100 },
          }),
          new Paragraph({
            children: [
              new ImageRun({
                data: Uint8Array.from(atob(qrImageData), c => c.charCodeAt(0)),
                transformation: { width: 100, height: 100 },
                type: 'png',
              }),
            ],
            spacing: { after: 200 },
          })
        );
      }

      // Add remaining sections
      docSections.push(
        // Please Note
        new Paragraph({
          children: [
            new TextRun({ text: 'Please Note: ', bold: true, size: 22, color: 'B48200' }),
            new TextRun({ text: 'Students will receive their kits and books once the Robotics Classes commence in School.', size: 22, color: '664600' }),
          ],
          spacing: { before: 200, after: 300 },
          shading: { fill: 'FFF8E1' },
        }),
        // Closing
        new Paragraph({
          children: [new TextRun({ text: `We look forward to a progressive & dynamic year ${academicYear} on the Journey of Upskilling our students!`, size: 22 })],
          spacing: { after: 300 },
        }),
        // Regards
        new Paragraph({
          children: [new TextRun({ text: 'Regards,', bold: true, size: 24 })],
          spacing: { after: 50 },
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Principal', bold: true, size: 24 })],
          spacing: { after: 300 },
        }),
        // Helpline
        new Paragraph({
          children: [new TextRun({ text: 'For Queries – Call the OLL Helpline Number - 99201 88188', bold: true, size: 22, color: 'FFFFFF' })],
          alignment: AlignmentType.CENTER,
          shading: { fill: '1E3A5F' },
        })
      );

      // Create the document
      const doc = new Document({
        sections: [{
          properties: {},
          children: docSections,
        }],
      });

      // Generate the blob
      const blob = await Packer.toBlob(doc);
      
      // Download
      const fileName = `ParentCircular_${(schoolName).replace(/\s+/g, '_')}_${format(new Date(), 'ddMMMyyyy')}.docx`;
      saveAs(blob, fileName);

      // Upload & Store
      try {
        const docFile = new File([blob], fileName, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
        const formData = new FormData();
        formData.append('file', docFile);
        const uploadRes = await axios.post(`${API}/upload`, formData, {
          headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
        });
        const fileUrl = uploadRes.data.url;
        setData(prev => ({ ...prev, parent_circular_url: fileUrl }));
        
        // Also save to documents
        const existingDocs = school?.documents || [];
        const newDoc = {
          type: 'Parent Circular',
          url: fileUrl,
          name: fileName,
          uploaded_at: new Date().toISOString(),
          uploaded_by: user?.name || user?.email || 'Admin',
        };
        await axios.patch(`${API}/schools/inquiry/${school.id}`, {
          documents: [...existingDocs, newDoc],
        }, { headers: getAuthHeaders() });
        fetchInquiries();
        toast.success('Parent Circular generated, downloaded & saved!');
      } catch {
        toast.success('Parent Circular downloaded! (Save to documents failed)');
      }
    } catch (err) {
      console.error('Parent Circular generation error:', err);
      toast.error('Failed to generate Parent Circular: ' + (err.message || 'Unknown error'));
    } finally {
      setGeneratingParentCircular(false);
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
      // For online payments, tranches are not used
      const formattedTranches = onboardData.payment_mode === 'online' ? [] : onboardData.payment_tranches
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
        lab_kit_count: onboardData.kit_type === 'lab_setup' ? String(onboardData.lab_kit_count || '') : '',
        course_type: String(onboardData.course_type || ''),
        training_type: String(onboardData.training_type || ''),
        pricing_type: String(onboardData.pricing_type || 'per_student'),
        fixed_price: String(onboardData.fixed_price || ''),
        grade_pricing: onboardData.grade_pricing.filter(g => g.grade && g.students),
        total_students: totalStudents,
        total_amount: totalAmount,
        school_contacts: formattedContacts,
        payment_mode: String(onboardData.payment_mode || ''),
        payment_method: onboardData.payment_mode === 'online' ? 'student' : String(onboardData.payment_method || ''),
        payment_tranches: formattedTranches,
        gst_type: String(onboardData.gst_type || ''),
        school_address: String(onboardData.school_address || ''),
        additional_services: onboardData.additional_services || [],
        deadline_date: String(onboardData.deadline_date || ''),
        contract_start: contractStart,
        contract_end: contractEnd,
        mou_url: String(onboardData.mou_url || ''),
        is_draft: saveAsDraft,
        // School Share and GP Share
        school_share_type: String(onboardData.school_share_type || 'none'),
        school_share_calc: String(onboardData.school_share_calc || 'lumpsum'),
        school_share_value: String(onboardData.school_share_value || ''),
        school_share_amount: (() => {
          if (onboardData.school_share_type === 'none' || !onboardData.school_share_value) return 0;
          const shareValue = parseFloat(onboardData.school_share_value) || 0;
          if (onboardData.school_share_type === 'percentage') {
            return (shareValue / 100) * totalAmount;
          } else {
            if (onboardData.school_share_calc === 'per_student') {
              return shareValue * totalStudents;
            }
            return shareValue;
          }
        })(),
        gp_share_type: String(onboardData.gp_share_type || 'none'),
        gp_share_calc: String(onboardData.gp_share_calc || 'lumpsum'),
        gp_share_value: String(onboardData.gp_share_value || ''),
        gp_share_amount: (() => {
          if (onboardData.gp_share_type === 'none' || !onboardData.gp_share_value) return 0;
          const shareValue = parseFloat(onboardData.gp_share_value) || 0;
          if (onboardData.gp_share_type === 'percentage') {
            return (shareValue / 100) * totalAmount;
          } else {
            if (onboardData.gp_share_calc === 'per_student') {
              return shareValue * totalStudents;
            }
            return shareValue;
          }
        })(),
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
      lastOnboardInquiryId.current = null;
      setOnboardData({
        offering: '', model: '', book_type: '', kit_type: '', lab_kit_count: '', course_type: '', training_type: '',
        pricing_type: 'per_student', fixed_price: '',
        grade_pricing: [{ grade: '', price_per_student: '' }],
        total_students: 0, total_amount: 0, school_contacts: [{ name: '', phone_number: '', country_code: '+91', email: '', role: '' }],
        payment_mode: 'from_school', payment_method: '', payment_tranches: [{ amount: '', percentage: '', date: '', notes: '' }],
        deadline_date: '',
        contract_start: '', contract_end: '', mou_url: '', is_draft: false,
        school_share_type: 'none', school_share_calc: 'lumpsum', school_share_value: '', school_share_amount: 0,
        gp_share_type: 'none', gp_share_calc: 'lumpsum', gp_share_value: '', gp_share_amount: 0,
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
    // Calculate total based on pricing_type (include fixed_price when applicable)
    let totalAmount = 0;
    if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') {
      totalAmount += onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
    }
    if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
      totalAmount += parseFloat(onboardData.fixed_price) || 0;
    }
    
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
      const response = await axios.post(`${API}/schools/inquiry`, {
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

      // Send introduction email if checkbox is checked and email is valid
      if (newLead.sendIntroEmail && newLead.email && !newLead.email.endsWith('@school.oll')) {
        const createdId = response?.data?.id;
        if (createdId) {
          try {
            await axios.post(`${API}/schools/${createdId}/send-crm-email`, {
              email_type: 'introduction',
              to_email: newLead.email
            }, { headers: getAuthHeaders() });
            toast.success('Lead added & introduction email sent!');
          } catch (emailErr) {
            toast.success('Lead added successfully');
            toast.error('Could not send intro email: ' + (emailErr?.response?.data?.detail || 'Email error'));
          }
        } else {
          toast.success('Lead added successfully');
        }
      } else {
        toast.success('Lead added successfully');
      }

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
        assign_option: 'self',
        sendIntroEmail: false
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

  const handleRegenerateWorkflow = async (schoolId) => {
    if (!window.confirm('Regenerate workflow steps based on current program details?\n\nThis will add/remove steps to match the school\'s kit type and training type, while preserving completed step data.')) return;
    try {
      const response = await axios.post(`${API}/schools/${schoolId}/regenerate-workflow`, {}, {
        headers: getAuthHeaders()
      });
      toast.success(response.data.message || 'Workflow regenerated');
      fetchInquiries();
      if (showOnboardingWorkflowModal) {
        setShowOnboardingWorkflowModal({
          ...showOnboardingWorkflowModal,
          onboarding_workflow: response.data.workflow
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to regenerate workflow');
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

  // Fetch PO data from ProcureWay
  const fetchSchoolPoData = async (schoolId) => {
    setLoadingPoData(true);
    try {
      const response = await axios.get(`${API}/schools/${schoolId}/onboarding-po-info`, {
        headers: getAuthHeaders()
      });
      setSchoolPoData(response.data);
      
      // If we got PO data, update the kit_delivery step with it
      if (response.data?.has_po && response.data?.delivery_date) {
        await handleUpdateOnboardingStep(schoolId, 'kit_delivery', {
          data: {
            delivery_date: response.data.delivery_date,
            dispatch_date: response.data.dispatch_date || '',
            tracking_link: response.data.tracking_link || response.data.public_tracking_url || '',
            po_number: response.data.po_number,
            po_status: response.data.po_status,
            vendor_name: response.data.vendor_name
          }
        });
        toast.success('PO data fetched and synced');
      } else {
        toast.info(response.data?.message || 'No active POs found for this school');
      }
    } catch (error) {
      toast.error('Failed to fetch PO data');
      setSchoolPoData(null);
    } finally {
      setLoadingPoData(false);
    }
  };

  // Sync expenses from PO
  const syncExpensesFromPO = async (schoolId, poNumber = null) => {
    setSyncingExpenses(true);
    try {
      const payload = poNumber ? { po_number: poNumber } : {};
      const response = await axios.post(`${API}/schools/${schoolId}/sync-po-expenses`, payload, {
        headers: getAuthHeaders()
      });
      
      if (response.data?.expenses_created?.length > 0) {
        toast.success(`Created ${response.data.expenses_created.length} expense(s) from PO data`);
      } else {
        toast.info('No new expenses to sync (already exists or no amounts)');
      }
    } catch (error) {
      toast.error('Failed to sync expenses');
    } finally {
      setSyncingExpenses(false);
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
    // First check if school has onboarding_data directly (for renewed/converted schools)
    const existingOnboardData = school.onboarding_data;
    
    if (existingOnboardData && Object.keys(existingOnboardData).length > 0) {
      // Use the onboarding_data from the school record directly
      // Mark this as a direct onboarding_data edit (not a separate onboarding record)
      setEditOnboardData({
        school_id: school.id,
        is_direct_onboarding_data: true, // Flag to indicate this is embedded in school record
        school_name: school.school_name,
        contact_name: school.contact_name,
        phone: school.phone,
        email: school.email,
        location: school.location,
        board: school.board,
        address: school.address || '',
        // Spread the existing onboarding data
        offering: existingOnboardData.offering || '',
        model: existingOnboardData.model || school.model || '',
        book_type: existingOnboardData.book_type || '',
        kit_type: existingOnboardData.kit_type || '',
        lab_kit_count: existingOnboardData.lab_kit_count || '',
        course_type: existingOnboardData.course_type || '',
        training_type: existingOnboardData.training_type || '',
        pricing_type: existingOnboardData.pricing_type || 'per_student',
        fixed_price: existingOnboardData.fixed_price || '',
        grade_pricing: existingOnboardData.grade_pricing || [],
        total_students: existingOnboardData.total_students || school.total_students || 0,
        total_amount: existingOnboardData.total_amount || 0,
        school_contacts: existingOnboardData.school_contacts || [{ name: school.contact_name || '', phone: school.phone || '', email: school.email || '', role: 'Primary Contact' }],
        payment_mode: existingOnboardData.payment_mode || 'from_school',
        payment_method: existingOnboardData.payment_method || '',
        payment_tranches: existingOnboardData.payment_tranches || [],
        deadline_date: existingOnboardData.deadline_date || '',
        contract_start: existingOnboardData.contract_start || '',
        contract_end: existingOnboardData.contract_end || '',
        mou_url: existingOnboardData.mou_url || '',
        parent_circular_url: existingOnboardData.parent_circular_url || '',
        payment_link: existingOnboardData.payment_link || '',
        // Share fields
        school_share_type: existingOnboardData.school_share_type || 'none',
        school_share_calc: existingOnboardData.school_share_calc || 'lumpsum',
        school_share_value: existingOnboardData.school_share_value || '',
        school_share_amount: existingOnboardData.school_share_amount || 0,
        gp_share_type: existingOnboardData.gp_share_type || 'none',
        gp_share_calc: existingOnboardData.gp_share_calc || 'lumpsum',
        gp_share_value: existingOnboardData.gp_share_value || '',
        gp_share_amount: existingOnboardData.gp_share_amount || 0,
      });
      setShowEditOnboardingModal(school);
      return;
    }
    
    // Fallback: try to fetch from separate onboarding endpoint
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
        address: school.address || '',
        // Ensure share fields exist
        pricing_type: response.data.pricing_type || 'per_student',
        fixed_price: response.data.fixed_price || '',
        deadline_date: response.data.deadline_date || '',
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
        address: school.address || '',
        offering: '',
        model: school.model || '',
        book_type: '',
        kit_type: '',
        lab_kit_count: '',
        course_type: '',
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
        deadline_date: '',
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
      // Recalculate total_students and total_amount from grade_pricing
      const gradePricing = editOnboardData.grade_pricing || [];
      const calculatedTotalStudents = gradePricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
      let calculatedTotalAmount = 0;
      
      if (editOnboardData.pricing_type === 'per_student' || editOnboardData.pricing_type === 'both') {
        calculatedTotalAmount += gradePricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
      }
      if (editOnboardData.pricing_type === 'fixed' || editOnboardData.pricing_type === 'both') {
        calculatedTotalAmount += parseFloat(editOnboardData.fixed_price) || 0;
      }
      
      // Build the onboarding data object with recalculated values
      const onboardingData = {
        offering: editOnboardData.offering,
        model: editOnboardData.model,
        book_type: editOnboardData.book_type,
        kit_type: editOnboardData.kit_type,
        lab_kit_count: editOnboardData.kit_type === 'lab_setup' ? editOnboardData.lab_kit_count : '',
        course_type: editOnboardData.course_type,
        training_type: editOnboardData.training_type,
        pricing_type: editOnboardData.pricing_type,
        fixed_price: editOnboardData.fixed_price,
        grade_pricing: gradePricing,
        total_students: calculatedTotalStudents,
        total_amount: calculatedTotalAmount,
        school_contacts: editOnboardData.school_contacts,
        payment_mode: editOnboardData.payment_mode,
        payment_method: editOnboardData.payment_mode === 'online' ? 'student' : editOnboardData.payment_method,
        payment_tranches: editOnboardData.payment_mode === 'online' ? [] : editOnboardData.payment_tranches,
        deadline_date: editOnboardData.deadline_date,
        contract_start: editOnboardData.contract_start,
        contract_end: editOnboardData.contract_end,
        mou_url: editOnboardData.mou_url,
        parent_circular_url: editOnboardData.parent_circular_url,
        payment_link: editOnboardData.payment_link,
        school_share_type: editOnboardData.school_share_type,
        school_share_calc: editOnboardData.school_share_calc,
        school_share_value: editOnboardData.school_share_value,
        school_share_amount: editOnboardData.school_share_amount,
        gp_share_type: editOnboardData.gp_share_type,
        gp_share_calc: editOnboardData.gp_share_calc,
        gp_share_value: editOnboardData.gp_share_value,
        gp_share_amount: editOnboardData.gp_share_amount,
      };

      // Update school inquiry basic info AND onboarding_data for renewed/converted schools
      // Also update conversion_amount to keep it in sync with total_amount
      await axios.patch(`${API}/schools/inquiry/${editOnboardData.school_id}`, {
        school_name: editOnboardData.school_name,
        contact_name: editOnboardData.contact_name,
        phone: editOnboardData.phone,
        email: editOnboardData.email,
        location: editOnboardData.location,
        board: editOnboardData.board,
        address: editOnboardData.address,
        model: editOnboardData.model,
        total_students: calculatedTotalStudents,
        // Keep conversion_amount in sync with total_amount for display purposes
        conversion_amount: calculatedTotalAmount ? String(calculatedTotalAmount) : undefined,
        // Always update onboarding_data on the school record for renewed/converted schools
        onboarding_data: onboardingData,
      }, {
        headers: getAuthHeaders()
      });
      
      // Also update separate onboarding record if it exists (for backward compatibility)
      if (editOnboardData.id && !editOnboardData.is_direct_onboarding_data) {
        await axios.put(`${API}/schools/onboarding/${editOnboardData.id}`, onboardingData, {
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
          onClick={() => {
            setShowEmailModal(inquiry);
            setEmailModalType('introduction');
            setEmailModalToEmail(inquiry.email || '');
            setEmailModalCustomMsg('');
          }}
          className="text-xs px-2.5 py-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-700 flex items-center gap-1 font-medium"
          data-testid={`send-mail-${inquiry.id}`}
        >
          <Mail className="w-3 h-3" />
          Mail
        </button>
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
              onClick={() => openEditLeadModal(inquiry)}
              className="text-xs px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1 font-medium"
              data-testid={`edit-lead-${inquiry.id}`}
            >
              <Edit className="w-3 h-3" />
              Edit / Proposal
            </button>
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
              {inquiry.meeting_date ? 'Reschedule' : 'Schedule Meeting'}
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
                  user_type: 'school',
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
            <div className="relative group">
              <button
                className="text-xs px-2.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-600 text-white flex items-center gap-1 font-medium"
                data-testid={`renewal-${inquiry.id}`}
              >
                <Calendar className="w-3 h-3" />
                Renewal
                <ChevronDown className="w-3 h-3" />
              </button>
              <div className="absolute z-50 hidden group-hover:block top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[160px]">
                <button
                  onClick={() => openRenewalMeetingModal(inquiry)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-teal-600" />
                  Schedule Meeting
                </button>
                <button
                  onClick={() => openRenewalConvertModal(inquiry)}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 border-t"
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Direct Renewal (Skip Meeting)
                </button>
              </div>
            </div>
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
                  user_type: 'school',
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
            {documentsButton}
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
            {documentsButton}
            {baseButtons}
          </div>
        );
      
      case 'archived':
        return <div className="flex gap-1.5 flex-wrap items-center">{followupButton}{documentsButton}{baseButtons}</div>;
      
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
              <div className="text-sm text-cyan-600">Followups (7 Days)</div>
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
                Upcoming Followups (7 Days)
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {getThisWeekData().followups.length === 0 ? (
                  <p className="text-sm text-slate-500 text-center py-4">No followups scheduled this week</p>
                ) : (
                  getThisWeekData().followups.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-[#1E3A5F]">{item.school_name}</p>
                          {item.task_label && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                              {item.task_label}
                            </span>
                          )}
                        </div>
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

              {/* Scheduled Followup Tasks - show for new/lead status */}
              {(inquiry.status === 'new' || inquiry.status === 'lead') && inquiry.followup_tasks?.length > 0 && (() => {
                const pendingTasks = inquiry.followup_tasks.filter(t => t.status === 'pending');
                const completedCount = inquiry.followup_tasks.filter(t => t.status === 'completed' || t.status === 'sent').length;
                const nextTask = pendingTasks.sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date))[0];
                if (!nextTask) return null;
                return (
                  <div className="bg-blue-50/50 rounded px-2 py-1 mb-2">
                    <p className="text-[10px] text-blue-700 font-medium flex items-center gap-1">
                      <Mail className="w-2.5 h-2.5" /> 
                      Next: {format(new Date(nextTask.scheduled_date), 'dd MMM')}
                      <span className="ml-auto text-blue-500">({completedCount}/{inquiry.followup_tasks.length})</span>
                    </p>
                  </div>
                );
              })()}

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
                        width: `${(Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length / Math.max(Object.keys(inquiry.onboarding_workflow.steps || {}).length, 1) * 100).toFixed(0)}%` 
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className={inquiry.status === 'renewed' ? 'text-emerald-600' : 'text-purple-600'}>
                      {Object.values(inquiry.onboarding_workflow.steps || {}).filter(s => s.completed).length}/{Object.keys(inquiry.onboarding_workflow.steps || {}).length}
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
              <option value="vice_principal">Vice Principal</option>
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
                        {viewInquiry.onboarding_data.payment_method && viewInquiry.onboarding_data.payment_mode !== 'online' && (
                          <div>
                            <p className="text-xs text-purple-600">Payment Method</p>
                            <p className="font-medium text-purple-800 capitalize">{viewInquiry.onboarding_data.payment_method}</p>
                          </div>
                        )}
                        {viewInquiry.onboarding_data.payment_mode === 'online' && viewInquiry.onboarding_data.payment_method === 'student' && (
                          <div className="col-span-2">
                            <p className="text-xs text-purple-600 mb-1">Student Payment Links</p>
                            <div className="flex flex-col gap-1">
                              <a 
                                href={`/school-pay/${viewInquiry.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-green-200 transition-colors w-fit"
                              >
                                <CreditCard className="w-3 h-3" />
                                Fee Payment Page
                              </a>
                              <a 
                                href={`/admin/school-payments/${viewInquiry.id}`}
                                className="text-sm text-blue-700 bg-blue-100 px-2 py-1 rounded inline-flex items-center gap-1 hover:bg-blue-200 transition-colors w-fit"
                              >
                                <BarChart3 className="w-3 h-3" />
                                Payment Tracker
                              </a>
                            </div>
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
                            <button 
                              onClick={() => downloadFile(viewInquiry.onboarding_data.mou_url, `MOU_${viewInquiry.school_name?.replace(/\s+/g, '_') || 'School'}.pdf`)}
                              className="inline-flex items-center gap-2 text-sm text-green-600 hover:text-green-800 bg-white/50 px-3 py-2 rounded border border-green-200"
                            >
                              <Download className="w-4 h-4" />
                              Download MOU
                            </button>
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
                                  {/* Show added by name for tickets */}
                                  {item.type === 'ticket' && item.details?.raised_by_name && (
                                    <p className="text-xs text-slate-500 mt-0.5">
                                      Added by: <span className="font-medium">{item.details.raised_by_name}</span>
                                      {item.details.user_type && (
                                        <span className="ml-2 px-1.5 py-0.5 bg-slate-200 rounded text-xs capitalize">{item.details.user_type}</span>
                                      )}
                                    </p>
                                  )}
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
            <DialogTitle>
              {showRescheduleModal?.meeting_date ? 'Reschedule Meeting' : 'Schedule Meeting'} — {showRescheduleModal?.school_name}
            </DialogTitle>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {showRescheduleModal?.meeting_date ? 'Reason for Rescheduling' : 'Notes (optional)'}
              </label>
              <Textarea
                placeholder={showRescheduleModal?.meeting_date ? 'Enter reason...' : 'Any notes about this meeting...'}
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
                {showRescheduleModal?.meeting_date ? 'Reschedule Meeting' : 'Schedule Meeting'}
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
                          onClick={() => downloadFile(doc.url, `${doc.type}_${showDocumentsModal?.school_name?.replace(/\s+/g, '_') || 'School'}.pdf`)}
                          className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          Download
                        </button>
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

      {/* Edit Lead / Generate Proposal Modal */}
      <Dialog open={!!showEditLeadModal} onOpenChange={() => setShowEditLeadModal(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-amber-600" />
              Edit Lead / Generate Proposal - {showEditLeadModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Program Details Section */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4" /> Program Details
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Offering</label>
                  <select
                    value={editLeadData.offering}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, offering: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="">Select Offering</option>
                    {offerings.map(o => (
                      <option key={o.id} value={o.id}>{o.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Training Type</label>
                  <select
                    value={editLeadData.training_type}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, training_type: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="teacher_training">Teacher Training</option>
                    <option value="student_training">Student Training</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grades From</label>
                  <select
                    value={editLeadData.grades_from}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, grades_from: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    {['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Grades To</label>
                  <select
                    value={editLeadData.grades_to}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, grades_to: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    {['Jr. Kg', 'Sr. Kg', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Program Type</label>
                  <select
                    value={editLeadData.program_type}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, program_type: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="lab_setup">Lab Setup</option>
                    <option value="per_student">Per Student Kit</option>
                  </select>
                </div>
                {editLeadData.program_type === 'lab_setup' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">No. of Lab Kits</label>
                      <Input
                        type="number"
                        value={editLeadData.lab_kit_count}
                        onChange={(e) => setEditLeadData(prev => ({ ...prev, lab_kit_count: parseInt(e.target.value) || 30 }))}
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Kit Ratio (Kit:Students)</label>
                      <select
                        value={editLeadData.kit_ratio}
                        onChange={(e) => setEditLeadData(prev => ({ ...prev, kit_ratio: e.target.value }))}
                        className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                      >
                        <option value="1:1">1:1 (1 Kit per Student)</option>
                        <option value="1:2">1:2 (1 Kit per 2 Students)</option>
                        <option value="1:3">1:3 (1 Kit per 3 Students)</option>
                      </select>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Course Type</label>
                  <select
                    value={editLeadData.course_type}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, course_type: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="only_robotics">Only Robotics & AI</option>
                    <option value="robotics_coding_ai">Robotics, Coding & AI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
                  <select
                    value={editLeadData.model}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="compulsory">Compulsory</option>
                    <option value="optional">Optional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Book Type</label>
                  <select
                    value={editLeadData.book_type}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, book_type: e.target.value }))}
                    className="w-full h-9 text-sm border border-slate-200 rounded-lg px-3"
                  >
                    <option value="individual">Individual Books (per child)</option>
                    <option value="shared">Shared / No Books</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Fees Structure Section (like conversion popup) */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" /> Fees Structure
              </h3>
              
              {/* Pricing Type Selection */}
              <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <label className="block text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                  <DollarSign className="w-4 h-4" /> Pricing Type*
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricing_type"
                      value="per_student"
                      checked={editLeadData.pricing_type === 'per_student'}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Per Student</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricing_type"
                      value="fixed"
                      checked={editLeadData.pricing_type === 'fixed'}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Fixed Price</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="pricing_type"
                      value="both"
                      checked={editLeadData.pricing_type === 'both'}
                      onChange={(e) => setEditLeadData(prev => ({ ...prev, pricing_type: e.target.value }))}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm text-slate-700">Both</span>
                  </label>
                </div>
              </div>
              
              {/* Fixed Price Input - shown for fixed or both */}
              {(editLeadData.pricing_type === 'fixed' || editLeadData.pricing_type === 'both') && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-green-700 mb-1">Fixed Price (₹/year)</label>
                  <Input
                    type="number"
                    value={editLeadData.fixed_price}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, fixed_price: e.target.value }))}
                    placeholder="Enter fixed total price"
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Minimum Students - only show for per_student or both */}
              {(editLeadData.pricing_type === 'per_student' || editLeadData.pricing_type === 'both') && (
                <div className="mb-4">
                  <label className="block text-xs font-medium text-green-700 mb-1">Minimum Students Required</label>
                  <Input
                    type="number"
                    value={editLeadData.min_students}
                    onChange={(e) => setEditLeadData(prev => ({ ...prev, min_students: parseInt(e.target.value) || 800 }))}
                    className="h-9 text-sm"
                  />
                </div>
              )}

              {/* Grade-wise Pricing Table - only show for per_student or both */}
              {(editLeadData.pricing_type === 'per_student' || editLeadData.pricing_type === 'both') && (
              <div className="bg-white rounded-lg border border-green-200 overflow-hidden">
                <div className="grid grid-cols-12 gap-2 p-2 bg-green-100 text-xs font-semibold text-green-800">
                  <div className="col-span-6">Grade (e.g. 1-5)</div>
                  <div className="col-span-5">Price/Student (₹)</div>
                  <div className="col-span-1"></div>
                </div>
                {editLeadData.grade_pricing.map((gp, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 p-2 border-t border-green-100 items-center">
                    <div className="col-span-6">
                      <Input
                        type="text"
                        placeholder="Grade (e.g. 1-5)"
                        value={gp.grade}
                        onChange={(e) => {
                          const newGrades = [...editLeadData.grade_pricing];
                          newGrades[idx] = { ...newGrades[idx], grade: e.target.value };
                          setEditLeadData(prev => ({ ...prev, grade_pricing: newGrades }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-5">
                      <Input
                        type="number"
                        placeholder="Price per student"
                        value={gp.price_per_student}
                        onChange={(e) => {
                          const newGrades = [...editLeadData.grade_pricing];
                          newGrades[idx] = { ...newGrades[idx], price_per_student: e.target.value };
                          setEditLeadData(prev => ({ ...prev, grade_pricing: newGrades }));
                        }}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      {editLeadData.grade_pricing.length > 1 && (
                        <button
                          onClick={() => {
                            const newGrades = editLeadData.grade_pricing.filter((_, i) => i !== idx);
                            setEditLeadData(prev => ({ ...prev, grade_pricing: newGrades }));
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                <div className="p-2 border-t border-green-100">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditLeadData(prev => ({
                      ...prev,
                      grade_pricing: [...prev.grade_pricing, { grade: '', price_per_student: '' }]
                    }))}
                    className="text-green-600 hover:text-green-700 text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Grade
                  </Button>
                </div>
              </div>
              )}
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <Textarea
                value={editLeadData.notes}
                onChange={(e) => setEditLeadData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes about this lead..."
                className="h-20"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t flex-wrap">
              <Button
                variant="outline"
                onClick={() => handleSaveEditLead(false)}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-1" /> Save Details
              </Button>
              <Button
                onClick={() => generateProposalPDF()}
                disabled={generatingProposal}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              >
                {generatingProposal ? (
                  <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-1" /> Generate Proposal</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  // Auto-save proposal data before opening email modal
                  if (showEditLeadModal?.id) {
                    await autoSaveProposalData(showEditLeadModal.id, editLeadData);
                  }
                  setShowEmailModal(showEditLeadModal);
                  setEmailModalType('proposal');
                  setEmailModalToEmail(showEditLeadModal?.email || '');
                  setEmailModalCustomMsg('');
                }}
                className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                data-testid="send-proposal-email-btn"
              >
                <Mail className="w-4 h-4 mr-1" /> Send Proposal Email
                {lastProposalPDF?.schoolId === showEditLeadModal?.id && (
                  <span className="ml-1 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">+ PDF</span>
                )}
              </Button>
              <Button
                onClick={() => handleSaveEditLead(true)}
                className="flex-1 bg-purple-500 hover:bg-purple-600 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" /> Save & Move to Meeting Done
              </Button>
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
                  disabled={(date) => date < startOfDay(new Date()) || date > addDays(new Date(), 60) || date.getDay() === 0}
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
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" preventClose>
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
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, kit_type: e.target.value, lab_kit_count: e.target.value !== 'lab_setup' ? '' : prev.lab_kit_count }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-kit-type"
                >
                  <option value="">Select kit type</option>
                  <option value="lab_setup">Lab Kit</option>
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

            {/* Course Type, Model & Lab Kit Count */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Course Type</label>
                <select
                  value={renewalConvertData.course_type || ''}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, course_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-course-type"
                >
                  <option value="">Select course type</option>
                  <option value="only_robotics">Only Robotics</option>
                  <option value="robotics_coding_ai">Robotics, Coding & AI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Model</label>
                <select
                  value={renewalConvertData.model || ''}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="renewal-model"
                >
                  <option value="">Select model</option>
                  <option value="Compulsory">Compulsory</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
              {renewalConvertData.kit_type === 'lab_setup' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">No. of Lab Kits *</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter number of lab kits"
                    value={renewalConvertData.lab_kit_count || ''}
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, lab_kit_count: e.target.value }))}
                    className="h-10"
                    data-testid="renewal-lab-kit-count"
                  />
                </div>
              )}
            </div>

            {/* School Address */}
            <div>
              <label className="text-sm font-medium text-slate-700">School Address</label>
              <Textarea
                placeholder="Enter full school address"
                value={renewalConvertData.address || ''}
                onChange={(e) => setRenewalConvertData(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="mt-1"
                data-testid="renewal-address"
              />
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
                        <option value="vice_principal">Vice Principal</option>
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
                    onChange={(e) => setRenewalConvertData(prev => ({ ...prev, payment_mode: e.target.value, payment_method: e.target.value === 'online' ? 'student' : prev.payment_method }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                    data-testid="renewal-payment-mode"
                  >
                    <option value="from_school">From School</option>
                    <option value="from_student">From Student (Offline)</option>
                    <option value="from_distributor">From Distributor</option>
                    <option value="online">Online (Student Payment via Cashfree)</option>
                  </select>
                </div>
                {renewalConvertData.payment_mode !== 'online' && (
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
                )}
              </div>

              {/* GST Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">GST Type</label>
                <select
                  value={renewalConvertData.gst_type || ''}
                  onChange={(e) => setRenewalConvertData(prev => ({ ...prev, gst_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  data-testid="renewal-gst-type"
                >
                  <option value="">Select GST type</option>
                  <option value="inclusive_18">GST Inclusive @ 18%</option>
                  <option value="exclusive_18">GST Exclusive @ 18%</option>
                  <option value="book_gst_0">Book GST = 0%</option>
                </select>
              </div>

              {/* Online Student Payment Info */}
              {renewalConvertData.payment_mode === 'online' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">Online Student Fee Collection</p>
                  <p className="text-xs text-green-700 mb-2">
                    A payment link will be generated where students can pay their fees online via UPI, Cards, or Net Banking.
                  </p>
                  <p className="text-xs text-green-600">
                    Payment link: <span className="font-mono">/school-pay/{`{school_id}`}</span>
                  </p>
                  
                  {/* Deadline Date for Online Payments */}
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <label className="text-sm font-medium text-green-800">Payment Deadline (Optional)</label>
                    <p className="text-xs text-green-600 mb-2">Set a deadline for students to complete their payments</p>
                    <Input
                      type="date"
                      value={renewalConvertData.deadline_date || ''}
                      onChange={(e) => setRenewalConvertData(prev => ({ ...prev, deadline_date: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
              
              {/* Payment Tranches - Only show for non-online payment modes */}
              {renewalConvertData.payment_mode !== 'online' && (
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
              )}
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

            {/* Parent Circular (shown when payment_mode is 'online' - OLL Collects Online via Cashfree) */}
            {renewalConvertData.payment_mode === 'online' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <label className="text-sm font-medium text-yellow-800 mb-2 block">Parent Circular</label>
                <p className="text-xs text-yellow-600 mb-3">Generate or upload a circular to be shared with parents for online fee collection</p>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => generateParentCircularPDF(showRenewalConvertModal, renewalConvertData, setRenewalConvertData)}
                      disabled={generatingParentCircular}
                      className="flex-1 border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                      data-testid="renewal-generate-parent-circular-btn"
                    >
                      {generatingParentCircular ? (
                        <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-1" /> Generate Circular</>
                      )}
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="cursor-pointer"
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
                    </div>
                  </div>
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

            {/* Document Generation Section */}
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
              <h4 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Generate Documents
              </h4>
              <div className="flex flex-wrap gap-2">
                {/* Generate Proposal Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateProposalPDF(showRenewalConvertModal, renewalConvertData)}
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  data-testid="renewal-generate-proposal"
                >
                  <FileText className="w-4 h-4 mr-1" /> Generate Proposal
                </Button>
                
                {/* Generate MOU Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateMOUPDF(showRenewalConvertModal, renewalConvertData)}
                  className="text-purple-600 border-purple-200 hover:bg-purple-50"
                  data-testid="renewal-generate-mou"
                >
                  <FileSignature className="w-4 h-4 mr-1" /> Generate MOU
                </Button>
                
                {/* Generate Parent Circular - only when payment from student (online via Cashfree) */}
                {renewalConvertData.payment_mode === 'from_student' && renewalConvertData.payment_method === 'online' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateParentCircularPDF(showRenewalConvertModal, renewalConvertData, setRenewalConvertData)}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                    data-testid="renewal-generate-parent-circular"
                  >
                    <Mail className="w-4 h-4 mr-1" /> Generate Parent Circular
                  </Button>
                )}
              </div>
            </div>

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
        <DialogContent className="max-w-lg" preventClose>
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
                  onChange={(e) => setConvertData({...convertData, kit_type: e.target.value, lab_kit_count: e.target.value !== 'lab_setup' ? '' : convertData.lab_kit_count})}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">Select</option>
                  <option value="lab_setup">Lab Kit</option>
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

            {/* Course Type & Lab Kit Count */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Course Type</label>
                <select
                  value={convertData.course_type}
                  onChange={(e) => setConvertData({...convertData, course_type: e.target.value})}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                  data-testid="convert-course-type"
                >
                  <option value="">Select</option>
                  <option value="only_robotics">Only Robotics</option>
                  <option value="robotics_coding_ai">Robotics, Coding & AI</option>
                </select>
              </div>
              {convertData.kit_type === 'lab_setup' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">No. of Lab Kits *</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter number of lab kits"
                    value={convertData.lab_kit_count}
                    onChange={(e) => setConvertData({...convertData, lab_kit_count: e.target.value})}
                    className="h-9"
                    data-testid="convert-lab-kit-count"
                  />
                </div>
              )}
            </div>

            {/* School Address */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Address</label>
              <Textarea
                placeholder="Enter full school address"
                value={convertData.address}
                onChange={(e) => setConvertData({...convertData, address: e.target.value})}
                rows={2}
                data-testid="convert-address"
              />
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

            {/* Send Introduction Email Checkbox */}
            <div className={`rounded-lg p-3 border ${newLead.sendIntroEmail ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-200'}`}>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newLead.sendIntroEmail}
                  onChange={(e) => setNewLead({...newLead, sendIntroEmail: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded"
                  data-testid="send-intro-email-checkbox"
                />
                <div>
                  <span className="text-sm font-medium text-slate-800">Send introduction email</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {newLead.email && !newLead.email.endsWith('@school.oll')
                      ? `Will send to ${newLead.email}`
                      : 'Add a valid email above to enable this'}
                  </p>
                </div>
                <Mail className="w-4 h-4 text-blue-500 ml-auto" />
              </label>
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

      {/* Send Mail Modal */}
      <Dialog open={!!showEmailModal} onOpenChange={() => setShowEmailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-blue-600" />
              Send Email — {showEmailModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Email type selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: 'introduction', label: 'Introduction', color: 'blue' },
                  { value: 'meeting_confirmation', label: 'Meeting Confirm', color: 'green' },
                  { value: 'proposal', label: 'Proposal', color: 'amber' },
                  { value: 'mou', label: 'MOU / Agreement', color: 'purple' },
                  { value: 'followup', label: 'General Follow-up', color: 'slate' },
                  { value: 'followup_1', label: 'F1: OLL Program', color: 'sky' },
                  { value: 'followup_2', label: 'F2: Partner Schools', color: 'sky' },
                  { value: 'followup_3', label: 'F3: Admissions +15%', color: 'sky' },
                  { value: 'followup_4', label: 'F4: Last Note', color: 'sky' },
                ].map(({ value, label, color }) => (
                  <button
                    key={value}
                    onClick={() => setEmailModalType(value)}
                    className={`text-sm px-3 py-2 rounded-lg border-2 font-medium transition-all ${
                      emailModalType === value
                        ? `bg-${color}-100 border-${color}-500 text-${color}-700`
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                    data-testid={`email-type-${value}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* To Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">To Email</label>
              <Input
                value={emailModalToEmail}
                onChange={(e) => setEmailModalToEmail(e.target.value)}
                placeholder="recipient@school.com"
                type="email"
                data-testid="email-modal-to"
              />
              {(!emailModalToEmail || emailModalToEmail.endsWith('@school.oll')) && (
                <p className="text-xs text-amber-600 mt-1">Please enter a valid email address</p>
              )}
            </div>

            {/* Custom message (for followup) */}
            {emailModalType === 'followup' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Message (optional)</label>
                <Textarea
                  value={emailModalCustomMsg}
                  onChange={(e) => setEmailModalCustomMsg(e.target.value)}
                  placeholder="Add a personal note to include in the email..."
                  className="h-20"
                  data-testid="email-modal-custom-msg"
                />
              </div>
            )}

            <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
              <strong>Reply-to:</strong> info@oll.co &nbsp;|&nbsp; <strong>From:</strong> OLL Team
              {emailModalType === 'proposal' && lastProposalPDF?.schoolId === showEmailModal?.id && (
                <span className="ml-2 text-green-700 font-semibold">&#10003; Proposal PDF will be attached</span>
              )}
              {emailModalType === 'proposal' && lastProposalPDF?.schoolId !== showEmailModal?.id && (
                <span className="ml-2 text-amber-600">&#9888; Generate the proposal first to attach PDF</span>
              )}
            </div>

            <div className="flex gap-3 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowEmailModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!emailModalToEmail || emailModalToEmail.endsWith('@school.oll')) {
                    toast.error('Please enter a valid email address');
                    return;
                  }
                  setEmailModalSending(true);
                  try {
                    // Include proposal PDF if available for this school and type is 'proposal'
                    const hasPDF = emailModalType === 'proposal' && lastProposalPDF?.schoolId === showEmailModal?.id;
                    await axios.post(`${API}/schools/${showEmailModal.id}/send-crm-email`, {
                      email_type: emailModalType,
                      to_email: emailModalToEmail,
                      custom_message: emailModalCustomMsg,
                      meeting_date: showEmailModal.meeting_date,
                      meeting_time: showEmailModal.meeting_time,
                      meeting_mode: showEmailModal.meeting_type,
                      task_id: emailModalTaskId || undefined,
                      ...(hasPDF ? { pdf_base64: lastProposalPDF.base64, pdf_filename: lastProposalPDF.filename } : {})
                    }, { headers: getAuthHeaders() });
                    toast.success(`Email sent to ${emailModalToEmail}${hasPDF ? ' with PDF attached!' : ''}`);
                    setShowEmailModal(null);
                    setEmailModalTaskId(null);
                    fetchInquiries();
                  } catch (err) {
                    toast.error(err?.response?.data?.detail || 'Failed to send email');
                  } finally {
                    setEmailModalSending(false);
                  }
                }}
                disabled={emailModalSending || !emailModalToEmail || emailModalToEmail.endsWith('@school.oll')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="send-email-confirm-btn"
              >
                {emailModalSending ? (
                  <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-4 h-4 mr-1" /> Send Email</>
                )}
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
            {/* Scheduled Followup Emails Section */}
            {(showFollowupModal?.status === 'new' || showFollowupModal?.status === 'lead') && showFollowupModal?.followup_tasks?.length > 0 && (
              <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-blue-600" />
                  Scheduled Followup Emails ({showFollowupModal.followup_tasks.filter(t => t.status === 'completed').length}/{showFollowupModal.followup_tasks.length} completed)
                </h4>
                <div className="space-y-2">
                  {showFollowupModal.followup_tasks.map((task) => {
                    const labels = { followup_1: 'F1: OLL Program', followup_2: 'F2: Partner Schools', followup_3: 'F3: Admissions +15%', followup_4: 'F4: Last Note' };
                    return (
                      <div key={task.id} className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-slate-100">
                        <span className="text-xs font-semibold text-slate-700 flex-1 truncate">{labels[task.email_type] || task.email_type}</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="text-xs text-slate-500 hover:text-blue-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-50">
                              <CalendarClock className="w-3 h-3" />
                              {format(new Date(task.scheduled_date), 'dd MMM')}
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="end">
                            <CalendarComponent 
                              mode="single" 
                              selected={new Date(task.scheduled_date)} 
                              onSelect={(d) => { if(d) handleUpdateFollowupDate(showFollowupModal.id, task.id, d); }} 
                            />
                          </PopoverContent>
                        </Popover>
                        <select
                          value={task.status === 'sent' ? 'completed' : task.status}
                          onChange={(e) => handleUpdateFollowupStatus(showFollowupModal.id, task.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                          data-testid={`followup-status-${task.id}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="completed">Completed</option>
                        </select>
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50"
                          disabled={task.status === 'sent' || task.status === 'completed'}
                          onClick={() => handleSendFollowupEmail(showFollowupModal, task)}
                          data-testid={`send-followup-${task.id}`}
                        >
                          {task.status === 'sent' || task.status === 'completed' ? 'Sent' : 'Send'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
                  onChange={(e) => setOnboardData(prev => ({ ...prev, kit_type: e.target.value, lab_kit_count: e.target.value !== 'lab_setup' ? '' : prev.lab_kit_count }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select kit type</option>
                  <option value="lab_setup">Lab Kit</option>
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

            {/* Course Type, Model & Lab Kit Count */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Course Type</label>
                <select
                  value={onboardData.course_type || ''}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, course_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="onboard-course-type"
                >
                  <option value="">Select course type</option>
                  <option value="only_robotics">Only Robotics</option>
                  <option value="robotics_coding_ai">Robotics, Coding & AI</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Model</label>
                <select
                  value={onboardData.model || ''}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                  data-testid="onboard-model"
                >
                  <option value="">Select model</option>
                  <option value="Compulsory">Compulsory</option>
                  <option value="Optional">Optional</option>
                </select>
              </div>
              {onboardData.kit_type === 'lab_setup' && (
                <div>
                  <label className="text-sm font-medium text-slate-700">No. of Lab Kits *</label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Enter number of lab kits"
                    value={onboardData.lab_kit_count || ''}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, lab_kit_count: e.target.value }))}
                    className="h-10"
                    data-testid="onboard-lab-kit-count"
                  />
                </div>
              )}
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
              {(() => {
                let base = 0;
                if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') {
                  base += onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                }
                if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
                  base += parseFloat(onboardData.fixed_price) || 0;
                }
                const gst = onboardData.gst_type === 'exclusive_18' ? Math.round(base * 0.18) : 0;
                const grand = base + gst;
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-green-800">{gst > 0 ? 'Subtotal:' : 'Grand Total:'}</span>
                      <span className="font-bold text-lg text-green-800">₹{base.toLocaleString()}</span>
                    </div>
                    {gst > 0 && (
                      <>
                        <div className="flex justify-between items-center text-sm text-green-700 mt-1">
                          <span>+ GST @ 18% (Exclusive):</span>
                          <span>₹{gst.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-green-300 mt-1 pt-1">
                          <span className="font-bold text-green-800">Grand Total (incl. GST):</span>
                          <span className="font-bold text-lg text-green-800">₹{grand.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </>
                );
              })()}
            </div>

            {/* School Share */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <label className="text-sm font-medium text-purple-800 mb-2 block">School Share (Revenue Sharing)</label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-500">Type</label>
                  <select
                    value={onboardData.school_share_type}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, school_share_type: e.target.value }))}
                    className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>
                {onboardData.school_share_type !== 'none' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Calculation</label>
                      <select
                        value={onboardData.school_share_calc}
                        onChange={(e) => setOnboardData(prev => ({ ...prev, school_share_calc: e.target.value }))}
                        className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="lumpsum">Lumpsum</option>
                        <option value="per_student">Per Student</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">
                        {onboardData.school_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <Input
                        type="number"
                        placeholder={onboardData.school_share_type === 'percentage' ? '10' : '5000'}
                        value={onboardData.school_share_value}
                        onChange={(e) => setOnboardData(prev => ({ ...prev, school_share_value: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              {onboardData.school_share_type !== 'none' && onboardData.school_share_value && (
                <div className="mt-2 p-2 bg-purple-100 rounded text-sm">
                  <span className="font-medium text-purple-800">Calculated School Share: ₹</span>
                  <span className="font-bold text-purple-900">
                    {(() => {
                      const totalStudents = onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                      let grandTotal = 0;
                      if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') {
                        grandTotal += onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                      }
                      if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
                        grandTotal += parseFloat(onboardData.fixed_price) || 0;
                      }
                      const shareValue = parseFloat(onboardData.school_share_value) || 0;
                      if (onboardData.school_share_type === 'percentage') {
                        return ((shareValue / 100) * grandTotal).toLocaleString();
                      } else {
                        if (onboardData.school_share_calc === 'per_student') {
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
                    value={onboardData.gp_share_type}
                    onChange={(e) => setOnboardData(prev => ({ ...prev, gp_share_type: e.target.value }))}
                    className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="none">None</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="amount">Fixed Amount (₹)</option>
                  </select>
                </div>
                {onboardData.gp_share_type !== 'none' && (
                  <>
                    <div>
                      <label className="text-xs text-slate-500">Calculation</label>
                      <select
                        value={onboardData.gp_share_calc}
                        onChange={(e) => setOnboardData(prev => ({ ...prev, gp_share_calc: e.target.value }))}
                        className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="lumpsum">Lumpsum</option>
                        <option value="per_student">Per Student</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-500">
                        {onboardData.gp_share_type === 'percentage' ? 'Percentage' : 'Amount'}
                      </label>
                      <Input
                        type="number"
                        placeholder={onboardData.gp_share_type === 'percentage' ? '5' : '2000'}
                        value={onboardData.gp_share_value}
                        onChange={(e) => setOnboardData(prev => ({ ...prev, gp_share_value: e.target.value }))}
                        className="h-9"
                      />
                    </div>
                  </>
                )}
              </div>
              {onboardData.gp_share_type !== 'none' && onboardData.gp_share_value && (
                <div className="mt-2 p-2 bg-orange-100 rounded text-sm">
                  <span className="font-medium text-orange-800">Calculated GP Share: ₹</span>
                  <span className="font-bold text-orange-900">
                    {(() => {
                      const totalStudents = onboardData.grade_pricing.reduce((sum, g) => sum + (parseInt(g.students) || 0), 0);
                      let grandTotal = 0;
                      if (onboardData.pricing_type === 'per_student' || onboardData.pricing_type === 'both') {
                        grandTotal += onboardData.grade_pricing.reduce((sum, g) => sum + ((parseInt(g.students) || 0) * (parseFloat(g.price_per_student) || 0)), 0);
                      }
                      if (onboardData.pricing_type === 'fixed' || onboardData.pricing_type === 'both') {
                        grandTotal += parseFloat(onboardData.fixed_price) || 0;
                      }
                      const shareValue = parseFloat(onboardData.gp_share_value) || 0;
                      if (onboardData.gp_share_type === 'percentage') {
                        return ((shareValue / 100) * grandTotal).toLocaleString();
                      } else {
                        if (onboardData.gp_share_calc === 'per_student') {
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
                        <option value="vice_principal">Vice Principal</option>
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


            {/* School Address */}
            <div>
              <label className="text-sm font-medium text-slate-700">School Address</label>
              <Input
                placeholder="Enter school full address"
                value={onboardData.school_address || ''}
                onChange={(e) => setOnboardData(prev => ({ ...prev, school_address: e.target.value }))}
                className="h-10"
                data-testid="onboard-school-address"
              />
            </div>

            {/* Additional Services / Components */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-700">Additional Services / Components</label>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setOnboardData(prev => ({ ...prev, additional_services: [...(prev.additional_services || []), { item: '', qty: '', price: '' }] }))}
                  className="text-blue-600"
                  data-testid="add-additional-service"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Row
                </Button>
              </div>
              <div className="space-y-2">
                {(onboardData.additional_services || [{ item: '', qty: '', price: '' }]).map((svc, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                    <Input
                      placeholder="Item / Service"
                      value={svc.item || ''}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, additional_services: (prev.additional_services || []).map((s, i) => i === idx ? { ...s, item: e.target.value } : s) }))}
                      className="col-span-6 h-9 text-sm"
                    />
                    <Input
                      placeholder="Qty"
                      type="number"
                      min="0"
                      value={svc.qty || ''}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, additional_services: (prev.additional_services || []).map((s, i) => i === idx ? { ...s, qty: e.target.value } : s) }))}
                      className="col-span-2 h-9 text-sm"
                    />
                    <Input
                      placeholder="Price (₹)"
                      type="number"
                      min="0"
                      value={svc.price || ''}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, additional_services: (prev.additional_services || []).map((s, i) => i === idx ? { ...s, price: e.target.value } : s) }))}
                      className="col-span-3 h-9 text-sm"
                    />
                    {(onboardData.additional_services || []).length > 1 && (
                      <button
                        onClick={() => setOnboardData(prev => ({ ...prev, additional_services: prev.additional_services.filter((_, i) => i !== idx) }))}
                        className="col-span-1 text-red-400 hover:text-red-600 text-xs"
                      >✕</button>
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
                    onChange={(e) => setOnboardData(prev => ({ ...prev, payment_mode: e.target.value, payment_method: e.target.value === 'online' ? 'student' : prev.payment_method }))}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="from_school">From School</option>
                    <option value="from_student">From Student (Offline)</option>
                    <option value="from_distributor">From Distributor</option>
                    <option value="online">Online (Student Payment via Cashfree)</option>
                  </select>
                </div>
                {onboardData.payment_mode !== 'online' && (
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
                )}
              </div>
              
              {/* GST Type */}
              <div>
                <label className="text-sm font-medium text-slate-700">GST Type</label>
                <select
                  value={onboardData.gst_type || ''}
                  onChange={(e) => setOnboardData(prev => ({ ...prev, gst_type: e.target.value }))}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  data-testid="onboard-gst-type"
                >
                  <option value="">Select GST type</option>
                  <option value="inclusive_18">GST Inclusive @ 18%</option>
                  <option value="exclusive_18">GST Exclusive @ 18%</option>
                  <option value="book_gst_0">Book GST = 0%</option>
                </select>
              </div>

              {/* Online Student Payment Info */}
              {onboardData.payment_mode === 'online' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-green-800 mb-1">Online Student Fee Collection</p>
                  <p className="text-xs text-green-700 mb-2">
                    A payment link will be generated where students can pay their fees online via UPI, Cards, or Net Banking.
                  </p>
                  <p className="text-xs text-green-600">
                    Payment link: <span className="font-mono">/school-pay/{`{school_id}`}</span>
                  </p>
                  
                  {/* Deadline Date for Online Payments */}
                  <div className="mt-3 pt-3 border-t border-green-200">
                    <label className="text-sm font-medium text-green-800">Payment Deadline (Optional)</label>
                    <p className="text-xs text-green-600 mb-2">Set a deadline for students to complete their payments</p>
                    <Input
                      type="date"
                      value={onboardData.deadline_date || ''}
                      onChange={(e) => setOnboardData(prev => ({ ...prev, deadline_date: e.target.value }))}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
              
              {/* Payment Tranches - Only show for non-online payment modes */}
              {onboardData.payment_mode !== 'online' && (
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
              )}
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

            {/* Parent Circular (shown when payment_mode is 'online' - OLL Collects Online via Cashfree) */}
            {onboardData.payment_mode === 'online' && (
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <label className="text-sm font-medium text-yellow-800 mb-2 block">Parent Circular</label>
                <p className="text-xs text-yellow-600 mb-3">Generate or upload a circular to be shared with parents for online fee collection</p>
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
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={generateParentCircularPDF}
                      disabled={generatingParentCircular}
                      className="flex-1 border-yellow-500 text-yellow-700 hover:bg-yellow-100"
                      data-testid="generate-parent-circular-btn"
                    >
                      {generatingParentCircular ? (
                        <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><FileText className="w-4 h-4 mr-1" /> Generate Circular</>
                      )}
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="cursor-pointer"
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
                    </div>
                  </div>
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

            <div className="flex gap-3 pt-2 flex-wrap">
              <Button variant="outline" onClick={() => setShowOnboardModal(null)} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={generateMOUPDF}
                disabled={generatingMOU}
                className="flex-1 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F]/10"
                data-testid="generate-mou-btn"
              >
                {generatingMOU ? (
                  <><RefreshCw className="w-4 h-4 mr-1 animate-spin" /> Generating...</>
                ) : (
                  <><FileText className="w-4 h-4 mr-1" /> Generate MOU</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowEmailModal(showOnboardModal);
                  setEmailModalType('mou');
                  setEmailModalToEmail(showOnboardModal?.email || '');
                  setEmailModalCustomMsg('');
                }}
                className="flex-1 border-blue-500 text-blue-600 hover:bg-blue-50"
                data-testid="send-mou-email-btn"
              >
                <Mail className="w-4 h-4 mr-1" /> Send MOU Email
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
                {/* School Address */}
                <div className="mt-3">
                  <label className="text-sm font-medium text-slate-700">School Address</label>
                  <Textarea
                    placeholder="Enter full school address"
                    value={editOnboardData.address || ''}
                    onChange={(e) => setEditOnboardData(prev => ({ ...prev, address: e.target.value }))}
                    rows={2}
                    className="mt-1"
                    data-testid="edit-school-address"
                  />
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
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, kit_type: e.target.value, lab_kit_count: e.target.value !== 'lab_setup' ? '' : prev.lab_kit_count }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="">Select Kit Type</option>
                      <option value="lab_setup">Lab Kit</option>
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
                    <label className="text-sm font-medium text-slate-700">Course Type</label>
                    <select
                      value={editOnboardData.course_type || ''}
                      onChange={(e) => setEditOnboardData(prev => ({ ...prev, course_type: e.target.value }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                      data-testid="edit-course-type"
                    >
                      <option value="">Select Course Type</option>
                      <option value="only_robotics">Only Robotics</option>
                      <option value="robotics_coding_ai">Robotics, Coding & AI</option>
                    </select>
                  </div>
                  {editOnboardData.kit_type === 'lab_setup' && (
                    <div>
                      <label className="text-sm font-medium text-slate-700">No. of Lab Kits</label>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Enter number of lab kits"
                        value={editOnboardData.lab_kit_count || ''}
                        onChange={(e) => setEditOnboardData(prev => ({ ...prev, lab_kit_count: e.target.value }))}
                        data-testid="edit-lab-kit-count"
                      />
                    </div>
                  )}
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
                          <option value="vice_principal">Vice Principal</option>
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
                      onChange={(e) => setEditOnboardData(prev => ({ 
                        ...prev, 
                        payment_mode: e.target.value,
                        payment_method: e.target.value === 'online' ? 'student' : prev.payment_method
                      }))}
                      className="w-full h-10 px-4 border border-slate-200 rounded-lg bg-white"
                    >
                      <option value="from_school">From School</option>
                      <option value="from_student">From Student (Offline)</option>
                      <option value="online">Online (Student Payment via Cashfree)</option>
                    </select>
                  </div>
                  {editOnboardData.payment_mode !== 'online' && (
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
                  )}
                </div>
                
                {/* Online Student Payment Info */}
                {editOnboardData.payment_mode === 'online' && (
                  <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-green-800 mb-1">Online Student Fee Collection</p>
                    <p className="text-xs text-green-700">
                      Students will pay their fees online via UPI, Cards, or Net Banking.
                    </p>
                    {showEditOnboardingModal?.id && (
                      <div className="mt-2 flex gap-2">
                        <a 
                          href={`/school-pay/${showEditOnboardingModal.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" /> Payment Link
                        </a>
                        <a 
                          href={`/admin/school-payments/${showEditOnboardingModal.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <BarChart3 className="w-3 h-3" /> Payment Tracker
                        </a>
                      </div>
                    )}
                  </div>
                )}
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
              {/* Payment Tranches - Only show for non-online payment modes */}
              {editOnboardData.payment_mode !== 'online' && (
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
              )}

              {/* Deadline Date - Only show for online payment mode */}
              {editOnboardData.payment_mode === 'online' && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-800 mb-3">Payment Deadline (Optional)</h4>
                  <p className="text-xs text-green-600 mb-2">Set a deadline for students to complete their payments</p>
                  <Input
                    type="date"
                    value={editOnboardData.deadline_date || ''}
                    onChange={(e) => setEditOnboardData(prev => ({ ...prev, deadline_date: e.target.value }))}
                    className="bg-white"
                  />
                </div>
              )}

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
              <div className="flex items-center gap-2">
                {/* Export to Excel button for online payment mode */}
                {showOnboardingWorkflowModal?.onboarding_data?.payment_mode === 'online' && showOnboardingWorkflowModal?.onboarding_data?.payment_method === 'student' && (
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('oll_token');
                        const response = await axios.get(`${API}/api/school-payment/tracker/${showOnboardingWorkflowModal.id}`, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        
                        const payments = response.data.payments || [];
                        const stats = response.data.stats || {};
                        
                        if (payments.length === 0) {
                          toast.error('No payment data to export');
                          return;
                        }
                        
                        // Prepare data for Excel
                        const data = payments.map(p => ({
                          'Date': p.paid_at ? format(new Date(p.paid_at), 'MMM d, yyyy h:mm a') : '-',
                          'Student Name': p.student_name || '',
                          'Phone': p.phone || '',
                          'Grade': p.grade || '',
                          'Division': p.division || '-',
                          'Amount': p.amount || 0,
                          'Status': p.status || 'pending',
                          'Transaction ID': p.transaction_id || '-'
                        }));

                        // Create workbook
                        const wb = XLSX.utils.book_new();
                        
                        // Summary data
                        const summaryData = [
                          ['School Payment Report'],
                          ['School:', showOnboardingWorkflowModal?.school_name || 'School'],
                          ['Generated:', new Date().toLocaleString()],
                          ['Total Collected:', `₹${(stats.total_collected || 0).toLocaleString('en-IN')}`],
                          ['Students Paid:', stats.paid_count || 0],
                          ['Collection %:', `${stats.collection_percentage || 0}%`],
                          [''],
                        ];

                        const ws = XLSX.utils.aoa_to_sheet(summaryData);
                        XLSX.utils.sheet_add_json(ws, data, { origin: 'A8' });

                        ws['!cols'] = [
                          { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 },
                          { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 20 }
                        ];

                        XLSX.utils.book_append_sheet(wb, ws, 'Payments');
                        XLSX.writeFile(wb, `${showOnboardingWorkflowModal?.school_name || 'School'}_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
                        toast.success('Excel file exported!');
                      } catch (err) {
                        console.error('Export error:', err);
                        toast.error('Failed to export data');
                      }
                    }}
                    className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Excel
                  </button>
                )}
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
                <button
                  onClick={() => handleRegenerateWorkflow(showOnboardingWorkflowModal.id)}
                  className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center gap-1"
                  title="Re-sync steps based on current program details (kit type & training type)"
                >
                  <RefreshCw className="w-3 h-3" /> Sync Steps
                </button>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          {showOnboardingWorkflowModal?.onboarding_workflow && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ 
                    width: `${Object.values(showOnboardingWorkflowModal.onboarding_workflow.steps || {}).filter(s => s.completed).length / Math.max(Object.keys(showOnboardingWorkflowModal.onboarding_workflow.steps || {}).length, 1) * 100}%` 
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
                          {/* Online Student Payment Links - Show if payment_mode is online */}
                          {showOnboardingWorkflowModal?.onboarding_data?.payment_mode === 'online' && showOnboardingWorkflowModal?.onboarding_data?.payment_method === 'student' && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <p className="text-sm font-medium text-green-800 mb-2">Online Student Fee Collection</p>
                              <div className="flex flex-wrap gap-2">
                                <a 
                                  href={`/school-pay/${showOnboardingWorkflowModal.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  <CreditCard className="w-3.5 h-3.5" /> Student Payment Link
                                </a>
                                <a 
                                  href={`/admin/school-payments/${showOnboardingWorkflowModal.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                  <BarChart3 className="w-3.5 h-3.5" /> Payment Tracker
                                </a>
                                <button
                                  onClick={() => {
                                    const url = `${window.location.origin}/school-pay/${showOnboardingWorkflowModal.id}`;
                                    navigator.clipboard.writeText(url);
                                    toast.success('Payment link copied!');
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-600 text-white text-xs rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> Copy Link
                                </button>
                              </div>
                              {showOnboardingWorkflowModal?.onboarding_data?.deadline_date && (
                                <p className="text-xs text-green-700 mt-2">
                                  Deadline: {format(new Date(showOnboardingWorkflowModal.onboarding_data.deadline_date), 'MMM d, yyyy')}
                                </p>
                              )}
                            </div>
                          )}
                          
                          {/* Show Payment Tranches from onboarding_data */}
                          {showOnboardingWorkflowModal?.onboarding_data?.payment_mode !== 'online' && showOnboardingWorkflowModal?.onboarding_data?.payment_tranches?.length > 0 ? (
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
                                        <button 
                                          onClick={() => downloadFile(tranchePayment.invoice_url, `Invoice_${showOnboardingWorkflowModal.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche${idx + 1}.pdf`)}
                                          className="text-blue-600 text-xs flex items-center gap-1 hover:underline"
                                        >
                                          <Download className="w-3 h-3" /> Invoice
                                        </button>
                                      ) : (
                                        <span className="text-slate-400 text-xs">No invoice</span>
                                      )}
                                      {tranchePayment?.receipt_url ? (
                                        <button 
                                          onClick={() => downloadFile(tranchePayment.receipt_url, `Receipt_${showOnboardingWorkflowModal.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche${idx + 1}.pdf`)}
                                          className="text-green-600 text-xs flex items-center gap-1 hover:underline"
                                        >
                                          <Download className="w-3 h-3" /> Receipt
                                        </button>
                                      ) : (
                                        <span className="text-slate-400 text-xs">No receipt</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : showOnboardingWorkflowModal?.onboarding_data?.payment_mode !== 'online' && (
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
                          {/* Fetch from ProcureWay button */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchSchoolPoData(showOnboardingWorkflowModal.id)}
                              disabled={loadingPoData}
                              className="text-xs"
                            >
                              {loadingPoData ? (
                                <>
                                  <RefreshCcw className="w-3 h-3 animate-spin mr-1" />
                                  Fetching...
                                </>
                              ) : (
                                <>
                                  <RefreshCcw className="w-3 h-3 mr-1" />
                                  Fetch from ProcureWay
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => syncExpensesFromPO(showOnboardingWorkflowModal.id)}
                              disabled={syncingExpenses}
                              className="text-xs text-green-600 border-green-200 hover:bg-green-50"
                            >
                              {syncingExpenses ? (
                                <>
                                  <RefreshCcw className="w-3 h-3 animate-spin mr-1" />
                                  Syncing...
                                </>
                              ) : (
                                <>
                                  <DollarSign className="w-3 h-3 mr-1" />
                                  Sync Expenses
                                </>
                              )}
                            </Button>
                          </div>
                          
                          {/* Show PO info if available */}
                          {step.data?.po_number && (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                              <div className="flex items-center gap-2 text-blue-700 font-medium mb-2">
                                <Package className="w-4 h-4" />
                                PO: {step.data.po_number}
                                {step.data.po_status && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                                    step.data.po_status === 'dispatched' ? 'bg-green-100 text-green-700' :
                                    step.data.po_status === 'sent' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {step.data.po_status}
                                  </span>
                                )}
                              </div>
                              {step.data.vendor_name && (
                                <p className="text-xs text-slate-600">Vendor: {step.data.vendor_name}</p>
                              )}
                            </div>
                          )}
                          
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
                            <div className="flex gap-2">
                              <Input
                                value={step.data?.tracking_link || ''}
                                onChange={(e) => handleUpdateOnboardingStep(
                                  showOnboardingWorkflowModal.id, key,
                                  { data: { tracking_link: e.target.value } }
                                )}
                                placeholder="Enter tracking URL"
                                className="h-9 flex-1"
                              />
                              {step.data?.tracking_link && (
                                <a
                                  href={step.data.tracking_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center justify-center h-9 px-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
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
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Raise Ticket - {showRaiseTicketModal?.school_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* User Type Selector - FIRST */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="block text-sm font-medium text-[#1E3A5F] mb-3">Who is raising this query? *</label>
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
                        ? 'border-[#1E3A5F] bg-white text-[#1E3A5F] shadow-sm'
                        : 'border-blue-200 bg-blue-50/50 text-slate-600 hover:border-blue-300 hover:bg-white'
                    }`}
                    data-testid={`ticket-user-type-${type.value}`}
                  >
                    <type.icon className="w-5 h-5 mx-auto mb-1" />
                    <span className="block text-sm font-medium">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Contact Info Section - Name comes after User Type */}
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
            
            <div className="flex gap-3 pt-2 sticky bottom-0 bg-white border-t mt-4 -mx-6 px-6 pb-2">
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
