import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Building2, GraduationCap, Upload, Download, Eye, 
  CheckCircle2, Clock, AlertCircle, Calendar, Search, Filter,
  FileText, Receipt, CreditCard, X, ExternalLink, ChevronDown, ChevronRight,
  Phone, Mail, User, Trash2, Wallet, BanknoteIcon, RefreshCw, BarChart3, FilePlus
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import axios from 'axios';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Normalize gst_type values (support both old and new format)
const getGstLabel = (gst) => {
  if (!gst) return null;
  if (gst === 'book_gst_0' || gst === 'book_gst') return 'Book GST';
  if (gst === 'inclusive_18' || gst === 'inclusive') return 'Inclusive';
  if (gst === 'exclusive_18' || gst === 'exclusive') return 'Exclusive';
  return null;
};
const getGstColorClass = (gst) => {
  if (gst === 'book_gst_0' || gst === 'book_gst') return 'bg-blue-100 text-blue-700';
  if (gst === 'inclusive_18' || gst === 'inclusive') return 'bg-emerald-100 text-emerald-700';
  return 'bg-orange-100 text-orange-700';
};

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

    // Determine extension from URL
    let extensionFromUrl = '';
    const urlPath = absoluteUrl.split('?')[0];
    const cloudinaryMatch = urlPath.match(/\/([^/]+)\.([a-zA-Z0-9]+)$/);
    if (cloudinaryMatch) {
      extensionFromUrl = `.${cloudinaryMatch[2].toLowerCase()}`;
    } else {
      const urlExtMatch = urlPath.match(/\.([a-zA-Z0-9]+)$/);
      if (urlExtMatch) extensionFromUrl = `.${urlExtMatch[1].toLowerCase()}`;
    }

    // Route Cloudinary and VendorPlus/emergent.host URLs through the backend proxy
    // to avoid CORS + auth issues in the browser
    const isTrusted = absoluteUrl.includes('cloudinary.com') || absoluteUrl.includes('emergent.host');
    const fetchUrl = isTrusted
      ? `${API}/proxy/file?url=${encodeURIComponent(absoluteUrl)}&filename=${encodeURIComponent(filename || '')}`
      : absoluteUrl;

    const response = await fetch(fetchUrl, isTrusted ? { credentials: 'include' } : {});
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

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
};

const AdminOrders = () => {
  const { getAuthHeaders } = useAuth();
  const [activeTab, setActiveTab] = useState('school');
  const [payments, setPayments] = useState([]);
  const [schoolStudentPayments, setSchoolStudentPayments] = useState([]);
  const [schoolStudentStats, setSchoolStudentStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSchools, setExpandedSchools] = useState({}); // Track expanded schools
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [showSchoolDetails, setShowSchoolDetails] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(null);
  const [showViewModal, setShowViewModal] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(null);
  const schoolDataCache = React.useRef({});
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  // Send Invoice Email states
  const [sendEmailModal, setSendEmailModal] = useState(null); // { payment, group }
  const [sendingEmail, setSendingEmail] = useState(null); // payment_id
  const [invoiceSentMap, setInvoiceSentMap] = useState({}); // { [payment_id]: { sent_at, count } }
  const [paymentUpdate, setPaymentUpdate] = useState({
    status: '',
    payment_date: '',
    transaction_id: '',
    notes: '',
    invoice_url: '',
    receipt_url: '',
    gst_type: '',
    payment_link: '',
    paid_amount: 0
  });

  useEffect(() => {
    if (activeTab === 'school-students') {
      fetchSchoolStudentPayments();
    } else {
      fetchPayments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/${activeTab}-payments`, {
        headers: getAuthHeaders()
      });
      const data = response.data;
      setPayments(data);
      // Load saved invoice statuses for all school payments
      if (activeTab === 'school' && Array.isArray(data)) {
        const statusMap = {};
        await Promise.all(data.map(async (p) => {
          try {
            const r = await axios.get(`${API}/orders/${p.id}/invoice-status`, { headers: getAuthHeaders() });
            if (r.data.exists) {
              statusMap[p.id] = {
                saved: true,
                invoice_no: r.data.invoice_no,
                sent_at: r.data.last_sent_at || null,
                email_type: null,
              };
            }
          } catch { /* ignore */ }
        }));
        if (Object.keys(statusMap).length > 0) {
          setInvoiceSentMap(prev => ({ ...prev, ...statusMap }));
        }
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSchoolStudentPayments = async () => {
    setLoading(true);
    try {
      // Use new aggregated endpoint
      const response = await axios.get(`${API}/orders/school-student-payments`, {
        headers: getAuthHeaders()
      });
      
      const { schools, overall_stats } = response.data;
      
      // Set school summaries as stats
      const stats = {};
      schools.forEach(s => {
        stats[s.school_id] = s;
      });
      
      setSchoolStudentStats(stats);
      setSchoolStudentPayments(schools); // Use schools array directly for display
      
      // Store overall stats in a ref or separate state if needed
      console.log('Overall stats:', overall_stats);
    } catch (error) {
      console.error('Error fetching school student payments:', error);
      setSchoolStudentPayments([]);
      setSchoolStudentStats({});
    } finally {
      setLoading(false);
    }
  };
  
  // Export school payments to Excel
  const handleExportSchoolPayments = async (schoolId, schoolName) => {
    try {
      toast.loading(`Exporting ${schoolName}...`, { id: 'export' });
      
      const response = await axios.get(`${API}/orders/school-student-payments/${schoolId}/export`, {
        headers: getAuthHeaders()
      });
      
      const { export_data, school_name } = response.data;
      
      if (!export_data || export_data.length === 0) {
        toast.dismiss('export');
        toast.error('No payment data to export');
        return;
      }
      
      // Create Excel file using xlsx
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(export_data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payments');
      
      // Auto-fit columns
      const maxWidth = 20;
      const colWidths = Object.keys(export_data[0] || {}).map(key => ({
        wch: Math.min(maxWidth, Math.max(key.length, ...export_data.map(row => String(row[key] || '').length)))
      }));
      worksheet['!cols'] = colWidths;
      
      // Generate filename
      const sanitizedName = school_name.replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `${sanitizedName}_Payments_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
      
      XLSX.writeFile(workbook, filename);
      toast.dismiss('export');
      toast.success(`Exported ${export_data.length} records`);
    } catch (error) {
      console.error('Export error:', error);
      toast.dismiss('export');
      toast.error('Failed to export data');
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;
    
    const setUploading = type === 'invoice' ? setUploadingInvoice : setUploadingReceipt;
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      
      setPaymentUpdate(prev => ({
        ...prev,
        [type === 'invoice' ? 'invoice_url' : 'receipt_url']: response.data.url
      }));
      toast.success(`${type === 'invoice' ? 'Invoice' : 'Receipt'} uploaded successfully`);
    } catch (error) {
      toast.error(`Failed to upload ${type}`);
    } finally {
      setUploading(false);
    }
  };

  const handleUpdatePayment = async () => {
    if (!showPaymentModal) return;
    const isPaymentConfirm = ['paid', 'partial'].includes(paymentUpdate.status) && activeTab === 'school';
    try {
      await axios.patch(`${API}/orders/${showPaymentModal.id}`, {
        ...paymentUpdate,
        type: activeTab
      }, { headers: getAuthHeaders() });

      toast.success('Payment updated successfully');

      // Auto-send confirmation email if paid or partial
      if (isPaymentConfirm) {
        try {
      // Silently generate & save invoice (always regenerate on paid/partial to reflect updated balance)
          if (true) {
            let schoolData = schoolDataCache.current[showPaymentModal.school_id];
            if (!schoolData) {
              const r = await axios.get(`${API}/orders/school-details/${showPaymentModal.school_id}`, { headers: getAuthHeaders() });
              schoolData = r.data;
              schoolDataCache.current[showPaymentModal.school_id] = schoolData;
            }
            const { invoiceNo, base64 } = await generateInvoicePDF(
              { ...showPaymentModal, status: paymentUpdate.status, paid_amount: paymentUpdate.paid_amount },
              schoolData, { skipDownload: true }
            );
            await axios.post(`${API}/orders/save-invoice-pdf`, {
              payment_id: showPaymentModal.id,
              school_id: showPaymentModal.school_id,
              tranche_index: showPaymentModal.tranche_index ?? 0,
              invoice_no: invoiceNo,
              pdf_base64: base64,
              amount: showPaymentModal.amount,
              due_date: showPaymentModal.due_date || '',
              status: paymentUpdate.status,
              tranche_info: showPaymentModal.tranche_info || `Tranche ${(showPaymentModal.tranche_index ?? 0) + 1}`,
            }, { headers: getAuthHeaders() });
            setInvoiceSentMap(prev => ({ ...prev, [showPaymentModal.id]: { ...prev[showPaymentModal.id], invoice_no: invoiceNo, saved: true } }));
          }
          // Send confirmation email
          const sentAmount = paymentUpdate.status === 'partial'
            ? (paymentUpdate.paid_amount || showPaymentModal.amount)
            : showPaymentModal.amount;
          const res = await axios.post(`${API}/orders/send-invoice-email`, {
            school_id: showPaymentModal.school_id,
            payment_id: showPaymentModal.id,
            tranche_index: showPaymentModal.tranche_index,
            amount: sentAmount,
            due_date: showPaymentModal.due_date || '',
            status: paymentUpdate.status,
            tranche_info: showPaymentModal.tranche_info || `Tranche ${(showPaymentModal.tranche_index ?? 0) + 1}`,
          }, { headers: getAuthHeaders() });
          toast.success(`Confirmation email sent to ${res.data.sent_to.length} contact(s)`);
          setInvoiceSentMap(prev => ({ ...prev, [showPaymentModal.id]: { ...prev[showPaymentModal.id], sent_at: new Date().toISOString(), invoice_no: res.data.invoice_no } }));
        } catch (emailErr) {
          console.error('Confirmation email failed:', emailErr);
          toast.warning('Payment saved but confirmation email failed to send');
        }
      }

      setShowPaymentModal(null);
      setPaymentUpdate({ status: '', payment_date: '', transaction_id: '', notes: '', invoice_url: '', receipt_url: '', gst_type: '', paid_amount: 0 });
      fetchPayments();
    } catch (error) {
      toast.error('Failed to update payment');
    }
  };

  const openPaymentModal = (payment) => {
    setShowPaymentModal(payment);
    setPaymentUpdate({
      status: payment.status || 'pending',
      payment_date: payment.payment_date || '',
      transaction_id: payment.transaction_id || '',
      notes: payment.notes || '',
      invoice_url: payment.invoice_url || '',
      receipt_url: payment.receipt_url || '',
      gst_type: payment.gst_type || '',
      payment_link: payment.payment_link || '',
      paid_amount: payment.paid_amount || 0
    });
  };

  const fetchSchoolDetails = async (schoolId) => {
    setLoadingSchoolDetails(true);
    try {
      // Use dedicated endpoint that doesn't have role-based filtering
      const response = await axios.get(`${API}/orders/school-details/${schoolId}`, {
        headers: getAuthHeaders()
      });
      setShowSchoolDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch school details:', error);
      toast.error(error.response?.data?.detail || 'Failed to fetch school details');
    } finally {
      setLoadingSchoolDetails(false);
    }
  };

  const getStatusBadge = (payment) => {
    let status = payment.status || 'pending';
    
    // Auto-mark overdue if due date has passed and not paid
    if (status === 'pending' && payment.due_date && isPast(parseISO(payment.due_date))) {
      status = 'overdue';
    }
    
    const daysOverdue = payment.due_date && status === 'overdue' 
      ? differenceInDays(new Date(), parseISO(payment.due_date))
      : 0;
    
    return (
      <div className="flex items-center gap-2">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}>
          {status === 'overdue' ? `Overdue (${daysOverdue}d)` : status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>
    );
  };

  const filteredPayments = payments.filter(p => {
    const matchesSearch = searchQuery === '' || 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.parent_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let status = p.status || 'pending';
    if (status === 'pending' && p.due_date && isPast(parseISO(p.due_date))) {
      status = 'overdue';
    }
    
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Sort by due date (most recent first), then by status (overdue > pending > paid)
  const sortedPayments = [...filteredPayments].sort((a, b) => {
    const statusOrder = { overdue: 0, pending: 1, partial: 2, paid: 3, cancelled: 4 };
    
    let statusA = a.status || 'pending';
    let statusB = b.status || 'pending';
    if (statusA === 'pending' && a.due_date && isPast(parseISO(a.due_date))) statusA = 'overdue';
    if (statusB === 'pending' && b.due_date && isPast(parseISO(b.due_date))) statusB = 'overdue';
    
    // First by status
    if (statusOrder[statusA] !== statusOrder[statusB]) {
      return statusOrder[statusA] - statusOrder[statusB];
    }
    
    // Then by due date
    if (a.due_date && b.due_date) {
      return new Date(a.due_date) - new Date(b.due_date);
    }
    return 0;
  });

  // Group school payments by school_id for sub-row display
  const groupedSchoolPayments = useMemo(() => {
    if (activeTab !== 'school') return [];
    
    const groups = {};
    sortedPayments.forEach(payment => {
      const schoolId = payment.school_id;
      if (!schoolId) return;
      
      if (!groups[schoolId]) {
        groups[schoolId] = {
          school_id: schoolId,
          school_name: payment.school_name,
          contact_name: payment.contact_name,
          tranches: [],
          totalAmount: 0,
          paidAmount: 0,
          receivableAmount: 0,
          hasOverdue: false,
          hasPending: false,
        };
      }
      
      groups[schoolId].tranches.push(payment);
      groups[schoolId].totalAmount += payment.amount || 0;
      
      // Calculate paid and receivable amounts
      if (payment.status === 'paid') {
        groups[schoolId].paidAmount += payment.amount || 0;
      } else if (payment.status === 'partial') {
        // For partial payments, add the paid_amount to paidAmount and the rest to receivable
        const partialPaid = payment.paid_amount || 0;
        groups[schoolId].paidAmount += partialPaid;
        groups[schoolId].receivableAmount += (payment.amount || 0) - partialPaid;
      } else {
        // Pending or other status - full amount is receivable
        groups[schoolId].receivableAmount += payment.amount || 0;
      }
      
      let status = payment.status || 'pending';
      if (status === 'pending' && payment.due_date && isPast(parseISO(payment.due_date))) {
        groups[schoolId].hasOverdue = true;
      } else if (status === 'pending') {
        groups[schoolId].hasPending = true;
      }
    });
    
    // Sort groups by urgency (overdue first, then pending, then all paid)
    return Object.values(groups).sort((a, b) => {
      if (a.hasOverdue && !b.hasOverdue) return -1;
      if (!a.hasOverdue && b.hasOverdue) return 1;
      if (a.hasPending && !b.hasPending) return -1;
      if (!a.hasPending && b.hasPending) return 1;
      return 0;
    });
  }, [sortedPayments, activeTab]);

  // Toggle school expansion
  const toggleSchoolExpand = (schoolId) => {
    setExpandedSchools(prev => ({
      ...prev,
      [schoolId]: !prev[schoolId]
    }));
  };

  const stats = {
    total: payments.length,
    pending: payments.filter(p => (p.status || 'pending') === 'pending' && (!p.due_date || !isPast(parseISO(p.due_date)))).length,
    overdue: payments.filter(p => (p.status || 'pending') === 'pending' && p.due_date && isPast(parseISO(p.due_date))).length,
    paid: payments.filter(p => p.status === 'paid').length,
    totalAmount: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
    collectedAmount: payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
    receivablesAmount: payments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0),
  };
  
  // Generate Invoice PDF for a school payment tranche
  const handleGenerateInvoice = async (payment) => {
    const paymentId = payment.id;
    setGeneratingInvoice(paymentId);
    try {
      let schoolData = schoolDataCache.current[payment.school_id];
      if (!schoolData) {
        const res = await axios.get(`${API}/orders/school-details/${payment.school_id}`, {
          headers: getAuthHeaders()
        });
        schoolData = res.data;
        schoolDataCache.current[payment.school_id] = schoolData;
      }
      // Generate, download, and get base64 back
      const { invoiceNo, base64 } = await generateInvoicePDF(payment, schoolData);

      // Save to invoices collection so Send Email uses the same PDF
      try {
        await axios.post(`${API}/orders/save-invoice-pdf`, {
          payment_id: payment.id,
          school_id: payment.school_id,
          tranche_index: payment.tranche_index ?? 0,
          invoice_no: invoiceNo,
          pdf_base64: base64,
          amount: payment.amount,
          due_date: payment.due_date || '',
          status: payment.status || 'pending',
          tranche_info: payment.tranche_info || `Tranche ${(payment.tranche_index ?? 0) + 1}`,
        }, { headers: getAuthHeaders() });
        setInvoiceSentMap(prev => ({ ...prev, [payment.id]: { invoice_no: invoiceNo, saved: true } }));
        toast.success(`Invoice ${invoiceNo} downloaded & saved`);
      } catch {
        // Save failed silently — download still succeeded
        toast.success('Invoice PDF downloaded');
      }
    } catch (error) {
      console.error('Invoice generation error:', error);
      toast.error('Failed to generate invoice');
    } finally {
      setGeneratingInvoice(null);
    }
  };

  // Email type helper (mirrors backend logic)
  const getEmailType = (payment) => {
    const status = payment.status || 'pending';
    if (status === 'paid') return 'confirmation';
    if (status === 'overdue') return 'overdue';
    if (status === 'pending' && payment.due_date && isPast(parseISO(payment.due_date))) return 'overdue';
    return 'invoice';
  };

  // Send Invoice Email handler
  const handleSendInvoiceEmail = async () => {
    if (!sendEmailModal) return;
    const { payment } = sendEmailModal;
    setSendingEmail(payment.id);
    try {
      // If no saved invoice yet, silently generate & save it (jsPDF format, no download)
      if (!invoiceSentMap[payment.id]?.saved) {
        let schoolData = schoolDataCache.current[payment.school_id];
        if (!schoolData) {
          const r = await axios.get(`${API}/orders/school-details/${payment.school_id}`, { headers: getAuthHeaders() });
          schoolData = r.data;
          schoolDataCache.current[payment.school_id] = schoolData;
        }
        const { invoiceNo, base64 } = await generateInvoicePDF(payment, schoolData, { skipDownload: true });
        await axios.post(`${API}/orders/save-invoice-pdf`, {
          payment_id: payment.id,
          school_id: payment.school_id,
          tranche_index: payment.tranche_index ?? 0,
          invoice_no: invoiceNo,
          pdf_base64: base64,
          amount: payment.amount,
          due_date: payment.due_date || '',
          status: payment.status || 'pending',
          tranche_info: payment.tranche_info || `Tranche ${(payment.tranche_index ?? 0) + 1}`,
        }, { headers: getAuthHeaders() });
        setInvoiceSentMap(prev => ({ ...prev, [payment.id]: { ...prev[payment.id], invoice_no: invoiceNo, saved: true } }));
      }

      // Now send email — backend will use the saved jsPDF PDF from invoices collection
      const res = await axios.post(`${API}/orders/send-invoice-email`, {
        school_id: payment.school_id,
        payment_id: payment.id,
        tranche_index: payment.tranche_index,
        amount: payment.amount,
        due_date: payment.due_date || '',
        status: payment.status || 'pending',
        tranche_info: payment.tranche_info || `Tranche ${(payment.tranche_index || 0) + 1}`,
      }, { headers: getAuthHeaders() });
      const { email_type, sent_to, invoice_no, is_resend } = res.data;
      toast.success(`Invoice #${invoice_no} emailed to ${sent_to.length} contact(s)`);
      setInvoiceSentMap(prev => ({ ...prev, [payment.id]: { ...prev[payment.id], sent_at: new Date().toISOString(), email_type, invoice_no } }));
      setSendEmailModal(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send invoice email');
    } finally {
      setSendingEmail(null);
    }
  };

  // Delete payment handler
  const handleDeletePayment = async (payment) => {
    try {
      const endpoint = activeTab === 'school' 
        ? `${API}/orders/school-payments/${payment.id}`
        : `${API}/orders/student-payments/${payment.id}`;
      
      await axios.delete(endpoint, { headers: getAuthHeaders() });
      toast.success('Payment record deleted');
      setDeleteConfirm(null);
      fetchPayments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Failed to delete payment');
    }
  };

  // Payment sync state and handlers
  const [syncingPayment, setSyncingPayment] = useState(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncReport, setSyncReport] = useState(null);
  const [showSyncReport, setShowSyncReport] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState(null);

  // Fetch scheduler status on mount
  useEffect(() => {
    const fetchSchedulerStatus = async () => {
      try {
        const response = await axios.get(`${API}/payments/scheduler-status`, {
          headers: getAuthHeaders()
        });
        setSchedulerStatus(response.data);
      } catch (error) {
        console.error('Failed to fetch scheduler status:', error);
      }
    };
    fetchSchedulerStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync single payment with Cashfree
  const handleSyncPayment = async (orderId) => {
    setSyncingPayment(orderId);
    try {
      const response = await axios.post(`${API}/payments/sync-single/${orderId}`, {}, {
        headers: getAuthHeaders()
      });
      
      const { old_status, new_status, synced, status_changed, transaction_id, error } = response.data;
      
      if (error) {
        toast.error(`Sync failed: ${error}`);
      } else if (status_changed) {
        toast.success(`Payment synced: ${old_status} → ${new_status}`);
        // Refresh data
        if (activeTab === 'school-students') {
          fetchSchoolStudentPayments();
        } else {
          fetchPayments();
        }
      } else {
        toast.info(`Status unchanged: ${new_status}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error.response?.data?.detail || 'Failed to sync payment');
    } finally {
      setSyncingPayment(null);
    }
  };

  // Sync all pending payments with Cashfree
  const handleSyncAllPayments = async (paymentType = 'all') => {
    setSyncingAll(true);
    const loadingToast = toast.loading('Syncing all pending payments with Cashfree...', { duration: 60000 });
    
    try {
      const response = await axios.post(`${API}/payments/sync-all?payment_type=${paymentType}`, {}, {
        headers: getAuthHeaders()
      });
      
      const { summary, results } = response.data;
      
      toast.dismiss(loadingToast);
      
      if (summary.total_updated > 0) {
        toast.success(`Synced ${summary.total_updated} payments. Checked: ${summary.total_checked}, Errors: ${summary.total_errors}`);
        // Refresh data
        if (activeTab === 'school-students') {
          fetchSchoolStudentPayments();
        } else {
          fetchPayments();
        }
      } else if (summary.total_errors > 0) {
        toast.warning(`No updates found. ${summary.total_errors} errors occurred.`);
      } else {
        toast.info(`All ${summary.total_checked} payments are already in sync.`);
      }
      
      // Store detailed report
      setSyncReport(response.data);
      setShowSyncReport(true);
      
    } catch (error) {
      console.error('Bulk sync error:', error);
      toast.dismiss(loadingToast);
      toast.error(error.response?.data?.detail || 'Failed to sync payments');
    } finally {
      setSyncingAll(false);
    }
  };

  // Get payment status report
  const handleGetStatusReport = async () => {
    try {
      const response = await axios.get(`${API}/payments/status-report`, {
        headers: getAuthHeaders()
      });
      setSyncReport(response.data);
      setShowSyncReport(true);
    } catch (error) {
      console.error('Status report error:', error);
      toast.error('Failed to get status report');
    }
  };

  const exportPaymentsToCSV = () => {
    const data = activeTab === 'school-students' ? schoolStudentPayments : sortedPayments;
    let headers, rows;
    if (activeTab === 'school') {
      headers = ['School Name', 'Contact', 'Amount (₹)', 'Status', 'Due Date', 'Payment Date', 'Payment Method'];
      rows = data.map(p => [
        p.school_name || p.name || '',
        p.contact_name || p.contact || '',
        p.amount || 0,
        p.status || '',
        p.due_date ? format(parseISO(p.due_date), 'dd MMM yyyy') : '',
        p.payment_date ? format(parseISO(p.payment_date), 'dd MMM yyyy') : '',
        p.payment_method || '',
      ]);
    } else if (activeTab === 'student') {
      headers = ['Student Name', 'Parent Name', 'Course', 'Amount (₹)', 'Status', 'Due Date'];
      rows = data.map(p => [
        p.student_name || p.name || '',
        p.parent_name || '',
        p.course_name || p.program || '',
        p.amount || 0,
        p.status || '',
        p.due_date ? format(parseISO(p.due_date), 'dd MMM yyyy') : '',
      ]);
    } else {
      headers = ['School', 'Student', 'Amount (₹)', 'Status', 'Date'];
      rows = data.map(p => [
        p.school_name || '',
        p.student_name || p.name || '',
        p.amount || 0,
        p.status || '',
        p.created_at ? format(new Date(p.created_at), 'dd MMM yyyy') : '',
      ]);
    }
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payments_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${data.length} records`);
  };

  return (
    <AdminLayout title="Orders & Payments">
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('school')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'school'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            data-testid="school-payments-tab"
          >
            <Building2 className="w-4 h-4" />
            School Payments
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'student'
                ? 'border-orange-500 text-orange-600 bg-orange-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            data-testid="student-payments-tab"
          >
            <GraduationCap className="w-4 h-4" />
            Student Payments
          </button>
          <button
            onClick={() => setActiveTab('school-students')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'school-students'
                ? 'border-green-500 text-green-600 bg-green-50/50'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
            data-testid="school-student-payments-tab"
          >
            <CreditCard className="w-4 h-4" />
            School Student Payments (Online)
          </button>
          <div className="ml-auto flex items-center pb-1">
            <Button
              variant="outline"
              onClick={exportPaymentsToCSV}
              className="text-green-700 border-green-300 hover:bg-green-50 text-sm h-8 px-3"
              data-testid="export-payments-csv-btn"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Payment Sync Panel - For managing Cashfree payment status sync */}
        <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-indigo-50 rounded-xl p-4 border border-indigo-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-indigo-900">Cashfree Payment Sync</h3>
                <p className="text-xs text-indigo-600">
                  {schedulerStatus?.running ? (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      Auto-sync active (every {schedulerStatus.interval_minutes} min)
                      {schedulerStatus.next_run && (
                        <span className="text-slate-500 ml-1">
                          • Next: {new Date(schedulerStatus.next_run).toLocaleTimeString()}
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full"></span>
                      Auto-sync disabled
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGetStatusReport}
                className="border-indigo-300 text-indigo-700 hover:bg-indigo-100"
                data-testid="payment-status-report-btn"
              >
                <BarChart3 className="w-4 h-4 mr-1" />
                Status Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSyncAllPayments('student')}
                disabled={syncingAll}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                data-testid="sync-student-payments-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
                Sync Student Payments
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSyncAllPayments('school')}
                disabled={syncingAll}
                className="border-green-300 text-green-700 hover:bg-green-100"
                data-testid="sync-school-payments-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
                Sync School Payments
              </Button>
              <Button
                onClick={() => handleSyncAllPayments('all')}
                disabled={syncingAll}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                data-testid="sync-all-payments-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-1 ${syncingAll ? 'animate-spin' : ''}`} />
                {syncingAll ? 'Syncing...' : 'Sync All Payments'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards - Show different stats based on active tab */}
        {activeTab !== 'school-students' ? (
          /* Stats for School Payments and Student Payments tabs */
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Orders</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{stats.total}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Receipt className="w-6 h-6 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-white rounded-2xl p-5 border border-amber-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-amber-500 uppercase tracking-wide">Pending</p>
                  <p className="text-3xl font-bold text-amber-600 mt-1">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Clock className="w-6 h-6 text-amber-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-white rounded-2xl p-5 border border-red-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Overdue</p>
                  <p className="text-3xl font-bold text-red-600 mt-1">{stats.overdue}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-5 border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Paid</p>
                  <p className="text-3xl font-bold text-emerald-600 mt-1">{stats.paid}</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Collected</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">₹{stats.collectedAmount.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-500 uppercase tracking-wide">Receivables</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1">₹{stats.receivablesAmount?.toLocaleString() || 0}</p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Stats for School Student Payments (Online) tab - computed from schoolStudentStats */
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Schools</p>
                  <p className="text-3xl font-bold text-slate-800 mt-1">{Object.keys(schoolStudentStats).length}</p>
                </div>
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-slate-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-white rounded-2xl p-5 border border-emerald-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-emerald-500 uppercase tracking-wide">Total Collected</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">
                    ₹{Object.values(schoolStudentStats).reduce((sum, s) => sum + (s.total_collected || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <DollarSign className="w-6 h-6 text-emerald-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-5 border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Students Paid</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">
                    {Object.values(schoolStudentStats).reduce((sum, s) => sum + (s.paid_count || 0), 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-white rounded-2xl p-5 border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-purple-500 uppercase tracking-wide">Collection Rate</p>
                  <p className="text-3xl font-bold text-purple-600 mt-1">
                    {(() => {
                      const totalCollected = Object.values(schoolStudentStats).reduce((sum, s) => sum + (s.total_collected || 0), 0);
                      const totalExpected = Object.values(schoolStudentStats).reduce((sum, s) => sum + (s.total_expected || 0), 0);
                      return totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0;
                    })()}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-purple-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder={`Search ${activeTab === 'school' ? 'schools' : 'students'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="payment-search"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-4 border border-slate-200 rounded-lg bg-white"
            data-testid="status-filter"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="overdue">Overdue</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>

        {/* Payments Table - Only for school and student tabs */}
        {(activeTab === 'school' || activeTab === 'student') && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-3 border-orange-500 border-t-transparent mx-auto"></div>
              <p className="text-slate-500 mt-4 font-medium">Loading payments...</p>
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="p-20 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                <Receipt className="w-12 h-12 text-slate-300" />
              </div>
              <p className="text-xl font-semibold text-slate-700">No payments found</p>
              <p className="text-sm text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
                {activeTab === 'school' 
                  ? 'School payments will appear here when schools are converted with payment tranches'
                  : 'Student payments will appear here when students book sessions'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-800 to-slate-700">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">
                      {activeTab === 'school' ? 'School' : 'Student'}
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Amount</th>
                    {activeTab === 'student' && (
                      <>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Payment From</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Payment Mode</th>
                      </>
                    )}
                    <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Due Date</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                    <th className="text-right px-6 py-4 text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeTab === 'school' ? (
                    /* Grouped School Payments with Expandable Sub-rows */
                    groupedSchoolPayments.map((group) => (
                      <React.Fragment key={group.school_id}>
                        {/* School Parent Row */}
                        <tr 
                          className={`hover:bg-orange-50/50 transition-all duration-200 ${group.tranches.length > 1 ? 'bg-gradient-to-r from-orange-50/30 to-white' : ''} ${group.hasOverdue ? 'border-l-4 border-l-red-400' : group.hasPending ? 'border-l-4 border-l-amber-400' : ''}`}
                          onClick={() => group.tranches.length > 1 && toggleSchoolExpand(group.school_id)}
                        >
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              {group.tranches.length > 1 ? (
                                <button 
                                  className={`p-2 rounded-xl transition-all duration-200 ${expandedSchools[group.school_id] ? 'bg-orange-100 rotate-0' : 'bg-slate-100 hover:bg-orange-50'}`}
                                  onClick={(e) => { e.stopPropagation(); toggleSchoolExpand(group.school_id); }}
                                >
                                  {expandedSchools[group.school_id] ? (
                                    <ChevronDown className="w-5 h-5 text-orange-600" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-slate-500" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-br from-orange-100 to-orange-50 rounded-xl flex items-center justify-center">
                                  <Building2 className="w-5 h-5 text-orange-600" />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-800 text-base">{group.school_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <p className="text-sm text-slate-500">{group.contact_name}</p>
                                  {group.tranches.length > 1 && (
                                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                                      {group.tranches.length} tranches
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div>
                              <p className="font-bold text-lg text-slate-800">₹{group.totalAmount.toLocaleString()}</p>
                              <div className="mt-1 space-y-0.5">
                                <p className="text-xs text-green-600 font-medium">
                                  Paid: ₹{group.paidAmount.toLocaleString()}
                                </p>
                                <p className="text-xs text-orange-600 font-medium">
                                  Receivable: ₹{group.receivableAmount.toLocaleString()}
                                </p>
                              </div>
                              {group.paidAmount > 0 && group.paidAmount < group.totalAmount && (
                                <div className="mt-1">
                                  <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full transition-all" 
                                      style={{ width: `${(group.paidAmount / group.totalAmount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {group.tranches[0]?.gst_type && group.tranches.length === 1 && getGstLabel(group.tranches[0].gst_type) && (
                                <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getGstColorClass(group.tranches[0].gst_type)}`}>
                                  {getGstLabel(group.tranches[0].gst_type)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {group.tranches.length === 1 && group.tranches[0].due_date ? (
                              <div className="flex items-center gap-2">
                                <Calendar className={`w-4 h-4 ${isPast(parseISO(group.tranches[0].due_date)) && group.tranches[0].status !== 'paid' ? 'text-red-500' : 'text-slate-400'}`} />
                                <p className={`text-sm font-medium ${
                                  isPast(parseISO(group.tranches[0].due_date)) && group.tranches[0].status !== 'paid'
                                    ? 'text-red-600'
                                    : 'text-slate-700'
                                }`}>
                                  {format(parseISO(group.tranches[0].due_date), 'MMM d, yyyy')}
                                </p>
                              </div>
                            ) : group.tranches.length > 1 ? (
                              <span className="text-slate-500 text-sm italic">Multiple dates</span>
                            ) : (
                              <span className="text-slate-400 text-sm">Not set</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {group.tranches.length === 1 ? (
                              getStatusBadge(group.tranches[0])
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {group.hasOverdue && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Overdue
                                  </span>
                                )}
                                {group.hasPending && !group.hasOverdue && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Pending
                                  </span>
                                )}
                                {group.paidAmount === group.totalAmount && (
                                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Paid
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-2">
                              {/* Document indicators */}
                              {group.tranches.length === 1 && (group.tranches[0].invoice_url || group.tranches[0].receipt_url) && (
                                <div className="flex items-center gap-1 mr-2">
                                  {group.tranches[0].invoice_url && (
                                    <button onClick={() => downloadFile(group.tranches[0].invoice_url, `Invoice_${group.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche1`)} className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Download Invoice">
                                      <FileText className="w-4 h-4 text-blue-600" />
                                    </button>
                                  )}
                                  {group.tranches[0].receipt_url && (
                                    <button onClick={() => downloadFile(group.tranches[0].receipt_url, `Receipt_${group.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche1`)} className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Download Receipt">
                                      <Receipt className="w-4 h-4 text-green-600" />
                                    </button>
                                  )}
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); fetchSchoolDetails(group.school_id); }}
                                className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                                data-testid={`view-details-${group.school_id}`}
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                              {group.tranches.length === 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(group.tranches[0]); }}
                                  disabled={generatingInvoice === group.tranches[0].id}
                                  className={`${invoiceSentMap[group.tranches[0].id]?.saved ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300'}`}
                                  data-testid={`generate-invoice-${group.tranches[0].id}`}
                                  title={invoiceSentMap[group.tranches[0].id]?.saved ? `Saved: ${invoiceSentMap[group.tranches[0].id].invoice_no}` : 'Generate Invoice'}
                                >
                                  {invoiceSentMap[group.tranches[0].id]?.saved
                                    ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />{generatingInvoice === group.tranches[0].id ? 'Saving...' : 'Invoice'}</>
                                    : <><FilePlus className="w-3.5 h-3.5 mr-1" />{generatingInvoice === group.tranches[0].id ? 'Generating...' : 'Invoice'}</>}
                                </Button>
                              )}
                              {group.tranches.length === 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); setSendEmailModal({ payment: group.tranches[0], group }); }}
                                  className={`${invoiceSentMap[group.tranches[0].id]?.sent_at ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-teal-200 text-teal-600 hover:bg-teal-50 hover:border-teal-300'}`}
                                  data-testid={`send-invoice-email-${group.tranches[0].id}`}
                                >
                                  <Mail className="w-3.5 h-3.5 mr-1" />
                                  {invoiceSentMap[group.tranches[0].id]?.sent_at ? 'Resend' : 'Send Email'}
                                </Button>
                              )}
                              {group.tranches.length === 1 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); openPaymentModal(group.tranches[0]); }}
                                  className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                                  data-testid={`update-payment-${group.tranches[0].id}`}
                                >
                                  Update
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        
                        {/* Tranche Sub-rows (only shown when expanded and has multiple tranches) */}
                        {expandedSchools[group.school_id] && group.tranches.length > 1 && group.tranches.map((payment, idx) => (
                          <tr key={payment.id} className="bg-gradient-to-r from-slate-50 to-white hover:from-orange-50/30 hover:to-white transition-all duration-200 border-l-2 border-l-orange-200">
                            <td className="px-6 py-4 pl-16">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600 font-semibold text-sm">
                                  {idx + 1}
                                </div>
                                <p className="text-sm font-medium text-slate-700">{payment.tranche_info || `Tranche ${idx + 1}`}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="font-semibold text-slate-800">₹{(payment.amount || 0).toLocaleString()}</p>
                                {payment.gst_amount > 0 && (
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    GST: ₹{(payment.gst_amount || 0).toLocaleString()}
                                  </p>
                                )}
                                {payment.gst_type && getGstLabel(payment.gst_type) && (
                                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getGstColorClass(payment.gst_type)}`}>
                                    {getGstLabel(payment.gst_type)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              {payment.due_date ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className={`w-4 h-4 ${isPast(parseISO(payment.due_date)) && payment.status !== 'paid' ? 'text-red-500' : 'text-slate-400'}`} />
                                  <p className={`text-sm ${
                                    isPast(parseISO(payment.due_date)) && payment.status !== 'paid' ? 'text-red-600 font-medium' : 'text-slate-600'
                                  }`}>
                                    {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                                  </p>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-sm">Not set</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              {getStatusBadge(payment)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-end gap-2">
                                {payment.invoice_url && (
                                  <button onClick={() => downloadFile(payment.invoice_url, `Invoice_${group.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche${idx + 1}`)} className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Download Invoice">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  </button>
                                )}
                                {payment.receipt_url && (
                                  <button onClick={() => downloadFile(payment.receipt_url, `Receipt_${group.school_name?.replace(/\s+/g, '_') || 'School'}_Tranche${idx + 1}`)} className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Download Receipt">
                                    <Receipt className="w-4 h-4 text-green-600" />
                                  </button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateInvoice(payment)}
                                  disabled={generatingInvoice === payment.id}
                                  className={`${invoiceSentMap[payment.id]?.saved ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' : 'border-indigo-200 text-indigo-600 hover:bg-indigo-50'}`}
                                  data-testid={`generate-invoice-${payment.id}`}
                                  title={invoiceSentMap[payment.id]?.saved ? `Saved: ${invoiceSentMap[payment.id].invoice_no}` : 'Generate Invoice'}
                                >
                                  {invoiceSentMap[payment.id]?.saved
                                    ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1" />{generatingInvoice === payment.id ? '...' : 'Invoice'}</>
                                    : <><FilePlus className="w-3.5 h-3.5 mr-1" />{generatingInvoice === payment.id ? '...' : 'Invoice'}</>}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSendEmailModal({ payment, group })}
                                  className={`${invoiceSentMap[payment.id]?.sent_at ? 'border-green-200 text-green-700 hover:bg-green-50' : 'border-teal-200 text-teal-600 hover:bg-teal-50'}`}
                                  data-testid={`send-invoice-email-${payment.id}`}
                                >
                                  <Mail className="w-3.5 h-3.5 mr-1" />
                                  {invoiceSentMap[payment.id]?.sent_at ? 'Resend' : 'Send Email'}
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPaymentModal(payment)}
                                  className="border-orange-200 text-orange-600 hover:bg-orange-50"
                                  data-testid={`update-payment-${payment.id}`}
                                >
                                  Update
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  ) : (
                    /* Student Payments - Redesigned */
                    sortedPayments.map((payment) => (
                    <tr key={payment.id} className={`hover:bg-orange-50/50 transition-all duration-200 ${
                      payment.status === 'pending' && payment.due_date && isPast(parseISO(payment.due_date)) 
                        ? 'border-l-4 border-l-red-400' 
                        : payment.status === 'pending' ? 'border-l-4 border-l-amber-400' : ''
                    }`}>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-50 rounded-xl flex items-center justify-center">
                            <GraduationCap className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800 text-base">
                              {payment.student_name}
                            </p>
                            <p className="text-sm text-slate-500">
                              {payment.phone && <span className="mr-2">{payment.phone}</span>}
                              {payment.batch_name && <span className="text-blue-600">• {payment.batch_name}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-bold text-lg text-slate-800">₹{(payment.amount || 0).toLocaleString()}</p>
                          {payment.gst_amount > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">GST: ₹{(payment.gst_amount || 0).toLocaleString()}</p>
                          )}
                          {payment.gst_type && getGstLabel(payment.gst_type) && (
                            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getGstColorClass(payment.gst_type)}`}>
                              {getGstLabel(payment.gst_type)}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Payment From */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {payment.payment_from === 'school' ? (
                            <Building2 className="w-4 h-4 text-orange-500" />
                          ) : (
                            <User className="w-4 h-4 text-blue-500" />
                          )}
                          <span className={`text-sm font-medium capitalize ${
                            payment.payment_from === 'school' ? 'text-orange-700' : 'text-blue-700'
                          }`}>
                            {payment.payment_from || 'Individual'}
                          </span>
                        </div>
                      </td>
                      {/* Payment Mode */}
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {payment.payment_mode === 'online' ? (
                            <CreditCard className="w-4 h-4 text-green-500" />
                          ) : payment.payment_mode === 'cash' ? (
                            <BanknoteIcon className="w-4 h-4 text-amber-500" />
                          ) : (
                            <Wallet className="w-4 h-4 text-slate-400" />
                          )}
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {payment.payment_mode || payment.payment_method || 'N/A'}
                          </span>
                        </div>
                        {payment.transaction_id && (
                          <p className="text-xs text-slate-400 mt-1 font-mono">{payment.transaction_id}</p>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {payment.due_date ? (
                          <div className="flex items-center gap-2">
                            <Calendar className={`w-4 h-4 ${isPast(parseISO(payment.due_date)) && payment.status !== 'paid' ? 'text-red-500' : 'text-slate-400'}`} />
                            <p className={`text-sm font-medium ${
                              isPast(parseISO(payment.due_date)) && payment.status !== 'paid'
                                ? 'text-red-600'
                                : 'text-slate-700'
                            }`}>
                              {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ) : payment.payment_date ? (
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                            <p className="text-sm font-medium text-green-700">
                              {format(parseISO(payment.payment_date), 'MMM d, yyyy')}
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-sm">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(payment)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {/* Document buttons */}
                          {payment.invoice_url && (
                            <button onClick={() => downloadFile(payment.invoice_url, `Invoice_${payment.student_name?.replace(/\s+/g, '_') || 'Student'}`)} className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="Download Invoice">
                              <FileText className="w-4 h-4 text-blue-600" />
                            </button>
                          )}
                          {payment.receipt_url && (
                            <button onClick={() => downloadFile(payment.receipt_url, `Receipt_${payment.student_name?.replace(/\s+/g, '_') || 'Student'}`)} className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="Download Receipt">
                              <Receipt className="w-4 h-4 text-green-600" />
                            </button>
                          )}
                          {/* Sync Button - Only show for non-PAID payments */}
                          {payment.status !== 'paid' && payment.status !== 'PAID' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSyncPayment(payment.id)}
                              disabled={syncingPayment === payment.id}
                              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                              title="Sync with Cashfree"
                              data-testid={`sync-payment-${payment.id}`}
                            >
                              <RefreshCw className={`w-4 h-4 ${syncingPayment === payment.id ? 'animate-spin' : ''}`} />
                            </Button>
                          )}
                          {/* View Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowViewModal(payment)}
                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                            data-testid={`view-student-${payment.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {/* Update Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentModal(payment)}
                            className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                            data-testid={`update-payment-${payment.id}`}
                          >
                            Update
                          </Button>
                          {/* Delete Button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirm(payment)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            data-testid={`delete-payment-${payment.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
        )}

        {/* School Student Payments (Online) Tab */}
        {activeTab === 'school-students' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mt-6">
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-3 border-green-500 border-t-transparent mx-auto"></div>
                <p className="text-slate-500 mt-4 font-medium">Loading school student payments...</p>
              </div>
            ) : Object.keys(schoolStudentStats).length === 0 ? (
              <div className="p-20 text-center">
                <div className="w-24 h-24 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <CreditCard className="w-12 h-12 text-green-300" />
                </div>
                <p className="text-xl font-semibold text-slate-700">No online student payments yet</p>
                <p className="text-sm text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
                  When you convert schools with "Online (Student Payment via Cashfree)" mode, student payments will appear here.
                </p>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                {/* School-wise Summary Cards */}
                {Object.values(schoolStudentStats).map((schoolStat) => (
                  <div key={schoolStat.school_id} className="border border-slate-200 rounded-xl overflow-hidden" data-testid={`school-row-${schoolStat.school_id}`}>
                    {/* School Header */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 border-b border-green-100">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-green-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-lg text-slate-800">{schoolStat.school_name}</h3>
                            <p className="text-sm text-slate-500">
                              {schoolStat.city && `${schoolStat.city} • `}
                              {schoolStat.paid_count || 0} / {schoolStat.total_students || 0} students paid
                              {schoolStat.pending_count > 0 && <span className="text-amber-600"> • {schoolStat.pending_count} pending</span>}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-green-600">
                            ₹{(schoolStat.total_collected || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-slate-500">
                            of ₹{(schoolStat.total_expected || 0).toLocaleString()} ({schoolStat.collection_percentage || 0}%)
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-4">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div 
                            className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(schoolStat.collection_percentage || 0, 100)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Grade Stats */}
                      {schoolStat.grade_stats && Object.keys(schoolStat.grade_stats).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {Object.entries(schoolStat.grade_stats).map(([grade, data]) => (
                            <span key={grade} className="bg-white text-slate-700 px-3 py-1 rounded-full text-xs border border-slate-200">
                              Grade {grade}: <span className="text-green-600 font-medium">{data.paid}</span> paid
                              {data.pending > 0 && <span className="text-amber-600"> ({data.pending} pending)</span>}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <a 
                          href={`/admin/school-payments/${schoolStat.school_id}`}
                          className="inline-flex items-center gap-1.5 bg-white text-green-700 px-4 py-2 rounded-lg text-sm font-medium border border-green-200 hover:bg-green-50 transition-colors"
                          data-testid={`view-tracker-${schoolStat.school_id}`}
                        >
                          <Eye className="w-4 h-4" />
                          View Tracker
                        </a>
                        <button 
                          onClick={() => handleExportSchoolPayments(schoolStat.school_id, schoolStat.school_name)}
                          className="inline-flex items-center gap-1.5 bg-white text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-200 hover:bg-blue-50 transition-colors"
                          data-testid={`export-${schoolStat.school_id}`}
                        >
                          <Download className="w-4 h-4" />
                          Export Excel
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/school-pay/${schoolStat.school_id}`);
                            toast.success('Payment link copied!');
                          }}
                          className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Copy Payment Link
                        </button>
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/school-payment-tracker-public/${schoolStat.school_id}`);
                            toast.success('Public tracker link copied!');
                          }}
                          className="inline-flex items-center gap-1.5 bg-white text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                          Copy Tracker Link
                        </button>
                      </div>
                    </div>
                    
                    {/* Recent Payments Preview */}
                    {schoolStat.recent_payments && schoolStat.recent_payments.length > 0 && (
                      <div className="p-4">
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Recent Payments</p>
                        <div className="space-y-2">
                          {schoolStat.recent_payments.map((payment, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                  <User className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-slate-800">{payment.student_name}</p>
                                  <p className="text-xs text-slate-500">Grade {payment.grade} {payment.division && `| ${payment.division}`}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold text-green-600">₹{(payment.amount || 0).toLocaleString()}</p>
                                <p className="text-xs text-slate-400 font-mono">{payment.transaction_id || '-'}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Payment Update Modal */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Update Payment - {showPaymentModal?.school_name || showPaymentModal?.student_name}
            </DialogTitle>
          </DialogHeader>

          {showPaymentModal && (
            <div className="space-y-4">
              {/* Payment Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold text-lg text-slate-800">₹{(showPaymentModal.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Due Date</p>
                    <p className="font-medium text-slate-800">
                      {showPaymentModal.due_date 
                        ? format(parseISO(showPaymentModal.due_date), 'MMM d, yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                  {showPaymentModal.tranche_info && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Tranche Info</p>
                      <p className="text-sm text-slate-700">{showPaymentModal.tranche_info}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Status *</label>
                <select
                  value={paymentUpdate.status}
                  onChange={(e) => setPaymentUpdate(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="payment-status-select"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial Payment</option>
                  <option value="paid">Paid</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                {['paid', 'partial'].includes(paymentUpdate.status) && activeTab === 'school' && (
                  <p className="text-xs text-green-700 mt-1.5 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    A payment confirmation email will be sent automatically to school contacts.
                  </p>
                )}
              </div>

              {/* GST Type */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">GST Type</label>
                <select
                  value={paymentUpdate.gst_type}
                  onChange={(e) => setPaymentUpdate(prev => ({ ...prev, gst_type: e.target.value }))}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="gst-type-select"
                >
                  <option value="">Select GST Type</option>
                  <option value="book_gst">Book GST</option>
                  <option value="inclusive">Inclusive GST</option>
                  <option value="exclusive">Exclusive GST</option>
                </select>
              </div>

              {/* Payment Date */}
              {(paymentUpdate.status === 'paid' || paymentUpdate.status === 'partial') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentUpdate.payment_date}
                    onChange={(e) => setPaymentUpdate(prev => ({ ...prev, payment_date: e.target.value }))}
                  />
                </div>
              )}

              {/* Partial Payment Amount */}
              {paymentUpdate.status === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Amount Received <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₹</span>
                    <Input
                      type="number"
                      placeholder="Enter amount received"
                      value={paymentUpdate.paid_amount || ''}
                      onChange={(e) => setPaymentUpdate(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
                      className="pl-8"
                      data-testid="partial-amount-input"
                    />
                  </div>
                  {showPaymentModal?.amount && (
                    <p className="text-xs text-slate-500 mt-1">
                      Total Amount: ₹{showPaymentModal.amount.toLocaleString()} | 
                      Remaining: ₹{Math.max(0, (showPaymentModal.amount - (paymentUpdate.paid_amount || 0))).toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {/* Transaction ID */}
              {(paymentUpdate.status === 'paid' || paymentUpdate.status === 'partial') && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Transaction ID / Reference</label>
                  <Input
                    placeholder="Enter transaction reference"
                    value={paymentUpdate.transaction_id}
                    onChange={(e) => setPaymentUpdate(prev => ({ ...prev, transaction_id: e.target.value }))}
                  />
                </div>
              )}

              {/* Invoice Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Invoice</label>

                {/* System-generated invoice (if saved) */}
                {invoiceSentMap[showPaymentModal?.id]?.saved && (
                  <div className="mb-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-indigo-700">
                          System Invoice #{invoiceSentMap[showPaymentModal.id].invoice_no}
                        </p>
                        {invoiceSentMap[showPaymentModal.id]?.sent_at && (
                          <p className="text-xs text-indigo-500">
                            Emailed {format(new Date(invoiceSentMap[showPaymentModal.id].sent_at), 'MMM d, h:mm a')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateInvoice(showPaymentModal)}
                      disabled={generatingInvoice === showPaymentModal?.id}
                      className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      <Download className="w-3.5 h-3.5 mr-1" />
                      {generatingInvoice === showPaymentModal?.id ? 'Downloading...' : 'Download'}
                    </Button>
                  </div>
                )}

                {/* Manual invoice upload */}
                {paymentUpdate.invoice_url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Invoice uploaded
                    </span>
                    <a 
                      href={getAbsoluteUrl(paymentUpdate.invoice_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View
                    </a>
                    <button 
                      onClick={() => setPaymentUpdate(prev => ({ ...prev, invoice_url: '', clear_invoice: true }))}
                      className="text-xs text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'invoice')}
                      className="text-sm"
                      disabled={uploadingInvoice}
                    />
                    {uploadingInvoice && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                  </div>
                )}
              </div>

              {/* Receipt Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Receipt</label>
                {paymentUpdate.receipt_url ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Receipt uploaded
                    </span>
                    <a 
                      href={getAbsoluteUrl(paymentUpdate.receipt_url)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline"
                    >
                      View
                    </a>
                    <button 
                      onClick={() => setPaymentUpdate(prev => ({ ...prev, receipt_url: '', clear_receipt: true }))}
                      className="text-xs text-red-600 underline"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => handleFileUpload(e.target.files[0], 'receipt')}
                      className="text-sm"
                      disabled={uploadingReceipt}
                    />
                    {uploadingReceipt && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
                <Textarea
                  placeholder="Add any notes about this payment..."
                  value={paymentUpdate.notes}
                  onChange={(e) => setPaymentUpdate(prev => ({ ...prev, notes: e.target.value }))}
                  className="min-h-[80px]"
                />
              </div>

              {/* Payment Link (for student payments with online mode) */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Link</label>
                <Input
                  type="url"
                  placeholder="https://payment-gateway.com/pay/..."
                  value={paymentUpdate.payment_link}
                  onChange={(e) => setPaymentUpdate(prev => ({ ...prev, payment_link: e.target.value }))}
                />
                <p className="text-xs text-slate-500 mt-1">Optional: Add online payment link for parents</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowPaymentModal(null)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdatePayment} 
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={uploadingInvoice || uploadingReceipt}
                  data-testid="save-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  {uploadingInvoice || uploadingReceipt ? 'Uploading...' : 'Save Payment'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* School Details Modal */}
      <Dialog open={!!showSchoolDetails} onOpenChange={() => setShowSchoolDetails(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              School Conversion Details - {showSchoolDetails?.school_name}
            </DialogTitle>
          </DialogHeader>

          {loadingSchoolDetails ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading school details...</p>
            </div>
          ) : showSchoolDetails && (
            <div className="space-y-6">
              {/* Basic School Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">School Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">School Name</p>
                    <p className="font-medium">{showSchoolDetails.school_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Contact Person</p>
                    <p className="font-medium">{showSchoolDetails.contact_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium">{showSchoolDetails.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium">{showSchoolDetails.email || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Location</p>
                    <p className="font-medium">{showSchoolDetails.city || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Board</p>
                    <p className="font-medium">{showSchoolDetails.board || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Onboarding Data */}
              {showSchoolDetails.onboarding_data && (
                <>
                  {/* Contract Details */}
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-700 mb-3">Contract Details</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Total Students</p>
                        <p className="font-bold text-lg">{showSchoolDetails.onboarding_data.total_students || 0}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Total Amount</p>
                        <p className="font-bold text-lg text-green-600">
                          ₹{(showSchoolDetails.onboarding_data.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Contract Start</p>
                        <p className="font-medium">
                          {showSchoolDetails.onboarding_data.contract_start 
                            ? format(parseISO(showSchoolDetails.onboarding_data.contract_start), 'MMM d, yyyy')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Contract End</p>
                        <p className="font-medium">
                          {showSchoolDetails.onboarding_data.contract_end 
                            ? format(parseISO(showSchoolDetails.onboarding_data.contract_end), 'MMM d, yyyy')
                            : '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Model</p>
                        <p className="font-medium capitalize">{showSchoolDetails.onboarding_data.model || '-'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Payment Mode</p>
                        <p className="font-medium capitalize">
                          {showSchoolDetails.onboarding_data.payment_mode?.replace(/_/g, ' ') || '-'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* MOU Document */}
                  {(showSchoolDetails.onboarding_workflow?.steps?.mou_signing?.data?.document_link || 
                    showSchoolDetails.documents?.find(d => d.type === 'MOU')) && (
                    <div className="bg-amber-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-amber-700 mb-3 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        MOU Document
                      </h4>
                      <div className="flex items-center gap-3">
                        {showSchoolDetails.onboarding_workflow?.steps?.mou_signing?.data?.document_link ? (
                          <button 
                            onClick={() => downloadFile(showSchoolDetails.onboarding_workflow.steps.mou_signing.data.document_link, `MOU_${showSchoolDetails.school_name?.replace(/\s+/g, '_') || 'School'}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download MOU
                          </button>
                        ) : showSchoolDetails.documents?.find(d => d.type === 'MOU') && (
                          <button 
                            onClick={() => downloadFile(showSchoolDetails.documents.find(d => d.type === 'MOU').url, `MOU_${showSchoolDetails.school_name?.replace(/\s+/g, '_') || 'School'}`)}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                          >
                            <Download className="w-4 h-4" />
                            Download MOU
                          </button>
                        )}
                        {showSchoolDetails.onboarding_workflow?.steps?.mou_signing?.completed && (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Signed
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Accounts Coordinator - Highlighted */}
                  {(() => {
                    const accountsCoordinator = showSchoolDetails.onboarding_data?.school_contacts?.find(
                      c => c.role === 'accounts_coordinator' || c.role === 'accountant' || c.role?.toLowerCase().includes('account')
                    );
                    if (!accountsCoordinator) return null;
                    return (
                      <div className="bg-cyan-50 rounded-lg p-4 border-2 border-cyan-200">
                        <h4 className="text-sm font-semibold text-cyan-700 mb-3 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          Accounts Coordinator
                        </h4>
                        <div className="flex items-center gap-4 bg-white rounded-lg p-3">
                          <div className="w-10 h-10 rounded-full bg-cyan-100 flex items-center justify-center">
                            <User className="w-5 h-5 text-cyan-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{accountsCoordinator.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              {accountsCoordinator.phone && (
                                <a href={`tel:${accountsCoordinator.phone}`} className="text-sm text-cyan-600 flex items-center gap-1 hover:underline">
                                  <Phone className="w-3 h-3" />
                                  {accountsCoordinator.phone}
                                </a>
                              )}
                              {accountsCoordinator.email && (
                                <a href={`mailto:${accountsCoordinator.email}`} className="text-sm text-cyan-600 flex items-center gap-1 hover:underline">
                                  <Mail className="w-3 h-3" />
                                  {accountsCoordinator.email}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Grade-wise Pricing */}
                  {showSchoolDetails.onboarding_data.grade_pricing?.length > 0 && (
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-purple-700 mb-3">Grade-wise Pricing</h4>
                      <div className="space-y-2">
                        {showSchoolDetails.onboarding_data.grade_pricing.map((g, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                            <span className="font-medium">Grade {g.grade}</span>
                            <span className="text-slate-600">{g.students} students</span>
                            <span className="text-green-600">₹{g.price_per_student}/student</span>
                            <span className="font-bold">₹{((g.students || 0) * (g.price_per_student || 0)).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* School Contacts */}
                  {showSchoolDetails.onboarding_data.school_contacts?.length > 0 && (
                    <div className="bg-green-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-green-700 mb-3">School Team Contacts</h4>
                      <div className="space-y-2">
                        {showSchoolDetails.onboarding_data.school_contacts.map((c, idx) => (
                          <div key={idx} className="flex items-center gap-4 bg-white rounded-lg p-3">
                            <div className="flex-1">
                              <p className="font-medium">{c.name}</p>
                              <p className="text-sm text-slate-500 capitalize">{c.role?.replace(/_/g, ' ')}</p>
                            </div>
                            <p className="text-sm">{c.phone}</p>
                            {c.email && <p className="text-sm text-slate-500">{c.email}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment Tranches */}
                  {showSchoolDetails.onboarding_data.payment_tranches?.length > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-4">
                      <h4 className="text-sm font-semibold text-yellow-700 mb-3">Payment Tranches</h4>
                      <div className="space-y-2">
                        {showSchoolDetails.onboarding_data.payment_tranches.map((t, idx) => (
                          <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3">
                            <span className="font-medium">Tranche {idx + 1}</span>
                            {t.percentage && <span className="text-slate-600">{t.percentage}%</span>}
                            <span className="font-bold">₹{(t.amount || 0).toLocaleString()}</span>
                            <span className="text-sm text-slate-500">
                              {t.date ? format(parseISO(t.date), 'MMM d, yyyy') : '-'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* MOU Document */}
                  {showSchoolDetails.onboarding_data.mou_url && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium text-slate-700 mb-2">MOU Document</p>
                      <div className="flex items-center gap-3">
                        <a 
                          href={getAbsoluteUrl(showSchoolDetails.onboarding_data.mou_url)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <FileText className="w-4 h-4" />
                          View MOU
                        </a>
                        <button 
                          onClick={() => downloadFile(showSchoolDetails.onboarding_data.mou_url, `MOU_${showSchoolDetails.school_name?.replace(/\s+/g, '_') || 'School'}.pdf`)}
                          className="text-green-600 hover:underline flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {!showSchoolDetails.onboarding_data && (
                <div className="text-center py-8 text-slate-500">
                  <p>No conversion details available for this school.</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* View Payment Modal (for Student Payments) */}
      <Dialog open={!!showViewModal} onOpenChange={() => setShowViewModal(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Payment Details
            </DialogTitle>
          </DialogHeader>

          {showViewModal && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Student Name</p>
                    <p className="font-medium text-slate-800">{showViewModal.student_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Parent/Guardian</p>
                    <p className="font-medium text-slate-800">{showViewModal.parent_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium text-slate-800">{showViewModal.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium text-slate-800">{showViewModal.email || '-'}</p>
                  </div>
                  {showViewModal.batch_name && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Batch</p>
                      <p className="font-medium text-slate-800">{showViewModal.batch_name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-3">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold text-lg text-green-600">₹{(showViewModal.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    {getStatusBadge(showViewModal)}
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Payment From</p>
                    <div className="flex items-center gap-2 mt-1">
                      {showViewModal.payment_from === 'school' ? (
                        <Building2 className="w-4 h-4 text-orange-500" />
                      ) : (
                        <User className="w-4 h-4 text-blue-500" />
                      )}
                      <span className="font-medium capitalize">{showViewModal.payment_from || 'Individual'}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Payment Mode</p>
                    <div className="flex items-center gap-2 mt-1">
                      {showViewModal.payment_mode === 'online' ? (
                        <CreditCard className="w-4 h-4 text-green-500" />
                      ) : showViewModal.payment_mode === 'cash' ? (
                        <BanknoteIcon className="w-4 h-4 text-amber-500" />
                      ) : (
                        <Wallet className="w-4 h-4 text-slate-400" />
                      )}
                      <span className="font-medium capitalize">{showViewModal.payment_mode || showViewModal.payment_method || 'N/A'}</span>
                    </div>
                  </div>
                  {showViewModal.transaction_id && (
                    <div className="col-span-2">
                      <p className="text-xs text-slate-500">Transaction ID</p>
                      <p className="font-mono text-sm text-slate-700 bg-white px-2 py-1 rounded">{showViewModal.transaction_id}</p>
                    </div>
                  )}
                  {showViewModal.due_date && (
                    <div>
                      <p className="text-xs text-slate-500">Due Date</p>
                      <p className="font-medium">{format(parseISO(showViewModal.due_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {showViewModal.payment_date && (
                    <div>
                      <p className="text-xs text-slate-500">Payment Date</p>
                      <p className="font-medium text-green-700">{format(parseISO(showViewModal.payment_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* GST Info */}
              {showViewModal.gst_type && getGstLabel(showViewModal.gst_type) && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3">GST Information</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">GST Type</p>
                      <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${getGstColorClass(showViewModal.gst_type)}`}>
                        {getGstLabel(showViewModal.gst_type)}
                      </span>
                    </div>
                    {showViewModal.gst_amount > 0 && (
                      <div>
                        <p className="text-xs text-slate-500">GST Amount</p>
                        <p className="font-medium">₹{(showViewModal.gst_amount || 0).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {showViewModal.notes && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-amber-700 mb-2">Notes</h4>
                  <p className="text-sm text-slate-700">{showViewModal.notes}</p>
                </div>
              )}

              {/* Documents */}
              {(showViewModal.invoice_url || showViewModal.receipt_url) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-3">Documents</p>
                  <div className="flex items-center gap-3">
                    {showViewModal.invoice_url && (
                      <button 
                        onClick={() => downloadFile(showViewModal.invoice_url, `Invoice_${showViewModal.student_name?.replace(/\s+/g, '_') || 'Student'}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        Download Invoice
                      </button>
                    )}
                    {showViewModal.receipt_url && (
                      <button 
                        onClick={() => downloadFile(showViewModal.receipt_url, `Receipt_${showViewModal.student_name?.replace(/\s+/g, '_') || 'Student'}`)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        <Receipt className="w-4 h-4" />
                        Download Receipt
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setShowViewModal(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Invoice Email Confirmation Modal */}
      <Dialog open={!!sendEmailModal} onOpenChange={() => setSendEmailModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-700">
              <Mail className="w-5 h-5" />
              Send Invoice Email
            </DialogTitle>
          </DialogHeader>
          {sendEmailModal && (() => {
            const { payment, group } = sendEmailModal;
            const emailType = getEmailType(payment);
            const emailTypeLabel = emailType === 'overdue' ? 'Overdue Notice' : emailType === 'confirmation' ? 'Payment Confirmation' : 'Invoice';
            const emailTypeBadge = emailType === 'overdue'
              ? 'bg-red-100 text-red-700 border-red-200'
              : emailType === 'confirmation'
              ? 'bg-green-100 text-green-700 border-green-200'
              : 'bg-blue-100 text-blue-700 border-blue-200';
            return (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">School</span>
                    <span className="font-semibold text-slate-800">{group?.school_name || payment.school_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tranche</span>
                    <span className="font-medium">{payment.tranche_info || `Tranche ${(payment.tranche_index || 0) + 1}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount</span>
                    <span className="font-semibold">₹{(payment.amount || 0).toLocaleString()}</span>
                  </div>
                  {payment.due_date && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Due Date</span>
                      <span className={isPast(parseISO(payment.due_date)) && payment.status !== 'paid' ? 'text-red-600 font-medium' : ''}>
                        {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <Mail className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      Email type: <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold border ${emailTypeBadge}`}>{emailTypeLabel}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Invoice PDF will be generated &amp; attached. Sent to Accounts &amp; Principal contacts.
                    </p>
                    {invoiceSentMap[payment.id]?.saved && !invoiceSentMap[payment.id]?.sent_at && (
                      <p className="text-xs text-indigo-700 mt-1 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Invoice already generated — same PDF will be sent.
                      </p>
                    )}
                    {invoiceSentMap[payment.id]?.sent_at && (
                      <p className="text-xs text-green-700 mt-1 font-medium">Previously sent — this will resend the same invoice.</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => setSendEmailModal(null)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendInvoiceEmail}
                    disabled={sendingEmail === payment.id}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                    data-testid="confirm-send-invoice-email"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    {sendingEmail === payment.id ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete Payment Record
            </DialogTitle>
          </DialogHeader>

          {deleteConfirm && (
            <div className="space-y-4">
              <div className="bg-red-50 rounded-lg p-4 border border-red-100">
                <p className="text-sm text-red-800">
                  Are you sure you want to delete this payment record?
                </p>
                <div className="mt-3 space-y-1 text-sm">
                  <p><span className="text-slate-500">Student:</span> <span className="font-medium">{deleteConfirm.student_name}</span></p>
                  <p><span className="text-slate-500">Amount:</span> <span className="font-medium">₹{(deleteConfirm.amount || 0).toLocaleString()}</span></p>
                  <p><span className="text-slate-500">Status:</span> <span className="font-medium capitalize">{deleteConfirm.status || 'pending'}</span></p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                This action cannot be undone. The payment record will be permanently removed.
              </p>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeletePayment(deleteConfirm)} 
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  data-testid="confirm-delete-btn"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Details Modal */}
      <Dialog open={!!showStudentDetails} onOpenChange={() => setShowStudentDetails(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              Student Payment Details - {showStudentDetails?.student_name}
            </DialogTitle>
          </DialogHeader>

          {showStudentDetails && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="bg-slate-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Student Name</p>
                    <p className="font-medium">{showStudentDetails.student_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Parent/Guardian</p>
                    <p className="font-medium">{showStudentDetails.parent_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Phone</p>
                    <p className="font-medium">{showStudentDetails.phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Email</p>
                    <p className="font-medium">{showStudentDetails.email || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Conversion Details */}
              {showStudentDetails.conversion_details && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-700 mb-3">Enrollment Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500">Program/Skill</p>
                      <p className="font-medium">{showStudentDetails.conversion_details.skill || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Age Group</p>
                      <p className="font-medium">{showStudentDetails.conversion_details.age_group || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Learning Mode</p>
                      <p className="font-medium capitalize">{showStudentDetails.conversion_details.learning_mode?.replace(/_/g, ' ') || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Center</p>
                      <p className="font-medium">{showStudentDetails.conversion_details.center || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">City</p>
                      <p className="font-medium">{showStudentDetails.conversion_details.city || '-'}</p>
                    </div>
                    {showStudentDetails.conversion_details.demo_date && (
                      <div>
                        <p className="text-xs text-slate-500">Demo Date</p>
                        <p className="font-medium">{showStudentDetails.conversion_details.demo_date}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Info */}
              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-3">Payment Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500">Amount</p>
                    <p className="font-bold text-lg text-green-600">₹{(showStudentDetails.amount || 0).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Status</p>
                    {getStatusBadge(showStudentDetails)}
                  </div>
                  {showStudentDetails.due_date && (
                    <div>
                      <p className="text-xs text-slate-500">Due Date</p>
                      <p className="font-medium">{format(parseISO(showStudentDetails.due_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                  {showStudentDetails.payment_date && (
                    <div>
                      <p className="text-xs text-slate-500">Payment Date</p>
                      <p className="font-medium">{format(parseISO(showStudentDetails.payment_date), 'MMM d, yyyy')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {(showStudentDetails.invoice_url || showStudentDetails.receipt_url) && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Documents</p>
                  <div className="flex items-center gap-4">
                    {showStudentDetails.invoice_url && (
                      <button 
                        onClick={() => downloadFile(showStudentDetails.invoice_url, `Invoice_${showStudentDetails.student_name?.replace(/\s+/g, '_') || 'Student'}`)}
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Invoice
                      </button>
                    )}
                    {showStudentDetails.receipt_url && (
                      <button 
                        onClick={() => downloadFile(showStudentDetails.receipt_url, `Receipt_${showStudentDetails.student_name?.replace(/\s+/g, '_') || 'Student'}`)}
                        className="text-green-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <Download className="w-4 h-4" />
                        Download Receipt
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Sync Report Modal */}
      <Dialog open={showSyncReport} onOpenChange={setShowSyncReport}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Payment Status Report
            </DialogTitle>
          </DialogHeader>
          {syncReport && (
            <div className="space-y-6 text-sm">
              {/* Summary if available */}
              {syncReport.summary && (
                <div className="bg-indigo-50 rounded-lg p-4">
                  <h4 className="font-semibold text-indigo-800 mb-3">Sync Summary</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-slate-800">{syncReport.summary.total_checked}</p>
                      <p className="text-xs text-slate-500">Checked</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{syncReport.summary.total_updated}</p>
                      <p className="text-xs text-slate-500">Updated</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-red-600">{syncReport.summary.total_errors}</p>
                      <p className="text-xs text-slate-500">Errors</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Report */}
              {syncReport.student_payments && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Student Payments
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      {syncReport.student_payments.total} total
                    </span>
                  </h4>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(syncReport.student_payments.by_status || {}).map(([status, count]) => (
                      <div key={status} className={`rounded-lg p-2 text-center ${
                        status === 'PAID' ? 'bg-green-100 text-green-800' :
                        status === 'PENDING' || status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        <p className="font-bold">{count}</p>
                        <p className="text-xs">{status}</p>
                      </div>
                    ))}
                  </div>
                  {syncReport.student_payments.pending_list?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Pending Payments ({syncReport.student_payments.pending_list.length}):</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {syncReport.student_payments.pending_list.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-amber-50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium">{p.student_name}</span>
                              <span className="text-xs text-slate-500 ml-2">₹{p.amount?.toLocaleString()}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSyncPayment(p.order_id);
                                setShowSyncReport(false);
                              }}
                              className="text-indigo-600 hover:bg-indigo-100"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Sync
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {syncReport.school_payments && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-3 flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    School Student Payments
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {syncReport.school_payments.total} total
                    </span>
                  </h4>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {Object.entries(syncReport.school_payments.by_status || {}).map(([status, count]) => (
                      <div key={status} className={`rounded-lg p-2 text-center ${
                        status === 'PAID' ? 'bg-green-100 text-green-800' :
                        status === 'PENDING' || status === 'ACTIVE' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        <p className="font-bold">{count}</p>
                        <p className="text-xs">{status}</p>
                      </div>
                    ))}
                  </div>
                  {syncReport.school_payments.pending_list?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-2">Pending Payments ({syncReport.school_payments.pending_list.length}):</p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {syncReport.school_payments.pending_list.map((p, i) => (
                          <div key={i} className="flex items-center justify-between bg-amber-50 rounded px-3 py-2">
                            <div>
                              <span className="font-medium">{p.student_name}</span>
                              <span className="text-xs text-slate-500 ml-2">₹{p.amount?.toLocaleString()}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                handleSyncPayment(p.order_id);
                                setShowSyncReport(false);
                              }}
                              className="text-indigo-600 hover:bg-indigo-100"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Sync
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sync Results Details */}
              {syncReport.results && (
                <div className="space-y-4">
                  {syncReport.results.student_payments?.details?.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Updated Student Payments</h4>
                      <div className="space-y-2">
                        {syncReport.results.student_payments.details.map((d, i) => (
                          <div key={i} className="flex items-center justify-between bg-green-50 rounded px-3 py-2 text-sm">
                            <span className="font-medium">{d.student_name}</span>
                            <span className="text-slate-600">{d.old_status} → <span className="text-green-700 font-semibold">{d.new_status}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {syncReport.results.school_payments?.details?.length > 0 && (
                    <div className="border rounded-lg p-4">
                      <h4 className="font-semibold text-green-800 mb-2">Updated School Payments</h4>
                      <div className="space-y-2">
                        {syncReport.results.school_payments.details.map((d, i) => (
                          <div key={i} className="flex items-center justify-between bg-green-50 rounded px-3 py-2 text-sm">
                            <span className="font-medium">{d.student_name}</span>
                            <span className="text-slate-600">{d.old_status} → <span className="text-green-700 font-semibold">{d.new_status}</span></span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminOrders;
