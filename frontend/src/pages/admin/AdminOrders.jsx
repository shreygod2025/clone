import React, { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Building2, GraduationCap, Upload, Download, Eye, 
  CheckCircle2, Clock, AlertCircle, Calendar, Search, Filter,
  FileText, Receipt, CreditCard, X, ExternalLink, ChevronDown, ChevronRight,
  Phone, Mail, User
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
    const response = await fetch(absoluteUrl);
    if (!response.ok) throw new Error('Download failed');
    
    const blob = await response.blob();
    
    // Determine file extension from content-type or URL
    const contentType = response.headers.get('content-type') || '';
    let extension = '';
    if (contentType.includes('pdf')) extension = '.pdf';
    else if (contentType.includes('png')) extension = '.png';
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = '.jpg';
    else if (contentType.includes('webp')) extension = '.webp';
    else if (contentType.includes('doc')) extension = '.docx';
    else if (contentType.includes('excel') || contentType.includes('spreadsheet')) extension = '.xlsx';
    else {
      // Try to get extension from URL
      const urlPath = absoluteUrl.split('?')[0];
      const urlExt = urlPath.match(/\.([a-zA-Z0-9]+)$/);
      extension = urlExt ? `.${urlExt[1]}` : '.pdf';
    }
    
    // Clean filename and ensure it has the right extension
    let cleanFilename = filename.replace(/\.[^/.]+$/, ''); // Remove any existing extension
    cleanFilename = `${cleanFilename}${extension}`;
    
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = cleanFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
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
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedSchools, setExpandedSchools] = useState({}); // Track expanded schools
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [showSchoolDetails, setShowSchoolDetails] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(null);
  const [loadingSchoolDetails, setLoadingSchoolDetails] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [paymentUpdate, setPaymentUpdate] = useState({
    status: '',
    payment_date: '',
    transaction_id: '',
    notes: '',
    invoice_url: '',
    receipt_url: '',
    gst_type: '',
    payment_link: ''
  });

  useEffect(() => {
    fetchPayments();
  }, [activeTab]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/orders/${activeTab}-payments`, {
        headers: getAuthHeaders()
      });
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      // Initialize with empty array if endpoint doesn't exist yet
      setPayments([]);
    } finally {
      setLoading(false);
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
    
    try {
      await axios.patch(`${API}/orders/${showPaymentModal.id}`, {
        ...paymentUpdate,
        type: activeTab
      }, { headers: getAuthHeaders() });
      
      toast.success('Payment updated successfully');
      setShowPaymentModal(null);
      setPaymentUpdate({ status: '', payment_date: '', transaction_id: '', notes: '', invoice_url: '', receipt_url: '', gst_type: '' });
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
      payment_link: payment.payment_link || ''
    });
  };

  const fetchSchoolDetails = async (schoolId) => {
    setLoadingSchoolDetails(true);
    try {
      const response = await axios.get(`${API}/schools/inquiries`, {
        headers: getAuthHeaders()
      });
      const school = response.data.find(s => s.id === schoolId);
      if (school) {
        setShowSchoolDetails(school);
      } else {
        toast.error('School details not found');
      }
    } catch (error) {
      toast.error('Failed to fetch school details');
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
          hasOverdue: false,
          hasPending: false,
        };
      }
      
      groups[schoolId].tranches.push(payment);
      groups[schoolId].totalAmount += payment.amount || 0;
      if (payment.status === 'paid') {
        groups[schoolId].paidAmount += payment.amount || 0;
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
        </div>

        {/* Stats Cards - Redesigned */}
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
        </div>

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

        {/* Payments Table */}
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
                              {group.paidAmount > 0 && group.paidAmount < group.totalAmount && (
                                <div className="mt-1">
                                  <p className="text-xs text-green-600 font-medium">₹{group.paidAmount.toLocaleString()} paid</p>
                                  <div className="w-20 h-1.5 bg-slate-200 rounded-full mt-1 overflow-hidden">
                                    <div 
                                      className="h-full bg-green-500 rounded-full transition-all" 
                                      style={{ width: `${(group.paidAmount / group.totalAmount) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                              {group.tranches[0]?.gst_type && group.tranches.length === 1 && (
                                <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                                  group.tranches[0].gst_type === 'book_gst' ? 'bg-blue-100 text-blue-700' :
                                  group.tranches[0].gst_type === 'inclusive' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {group.tranches[0].gst_type === 'book_gst' ? 'Book GST' : group.tranches[0].gst_type === 'inclusive' ? 'Inclusive' : 'Exclusive'}
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
                                    <a href={getAbsoluteUrl(group.tranches[0].invoice_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="View Invoice">
                                      <FileText className="w-4 h-4 text-blue-600" />
                                    </a>
                                  )}
                                  {group.tranches[0].receipt_url && (
                                    <a href={getAbsoluteUrl(group.tranches[0].receipt_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="View Receipt">
                                      <Receipt className="w-4 h-4 text-green-600" />
                                    </a>
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
                                    {payment.gst_rate && ` @ ${payment.gst_rate}%`}
                                  </p>
                                )}
                                {payment.gst_type && (
                                  <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                                    payment.gst_type === 'book_gst' ? 'bg-blue-100 text-blue-700' :
                                    payment.gst_type === 'inclusive' ? 'bg-emerald-100 text-emerald-700' :
                                    'bg-amber-100 text-amber-700'
                                  }`}>
                                    {payment.gst_type === 'book_gst' ? 'Book GST' : payment.gst_type === 'inclusive' ? 'Inclusive' : 'Exclusive'}
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
                                  <a href={getAbsoluteUrl(payment.invoice_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="View Invoice">
                                    <FileText className="w-4 h-4 text-blue-600" />
                                  </a>
                                )}
                                {payment.receipt_url && (
                                  <a href={getAbsoluteUrl(payment.receipt_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="View Receipt">
                                    <Receipt className="w-4 h-4 text-green-600" />
                                  </a>
                                )}
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
                              {payment.description || payment.parent_name || 'Student enrollment'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div>
                          <p className="font-bold text-lg text-slate-800">₹{(payment.amount || 0).toLocaleString()}</p>
                          {payment.gst_amount > 0 && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              GST: ₹{(payment.gst_amount || 0).toLocaleString()}
                              {payment.gst_rate && ` @ ${payment.gst_rate}%`}
                            </p>
                          )}
                          {payment.tranche_info && (
                            <p className="text-xs text-slate-500 mt-1">{payment.tranche_info}</p>
                          )}
                          {payment.gst_type && (
                            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                              payment.gst_type === 'book_gst' ? 'bg-blue-100 text-blue-700' :
                              payment.gst_type === 'inclusive' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-amber-100 text-amber-700'
                            }`}>
                              {payment.gst_type === 'book_gst' ? 'Book GST' :
                               payment.gst_type === 'inclusive' ? 'Inclusive' : 'Exclusive'}
                            </span>
                          )}
                        </div>
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
                        ) : (
                          <span className="text-slate-400 text-sm">Not set</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(payment)}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center justify-end gap-2">
                          {/* Document indicators */}
                          {(payment.invoice_url || payment.receipt_url) && (
                            <div className="flex items-center gap-1 mr-2">
                              {payment.invoice_url && (
                                <a href={getAbsoluteUrl(payment.invoice_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors" title="View Invoice">
                                  <FileText className="w-4 h-4 text-blue-600" />
                                </a>
                              )}
                              {payment.receipt_url && (
                                <a href={getAbsoluteUrl(payment.receipt_url)} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-green-50 rounded-lg hover:bg-green-100 transition-colors" title="View Receipt">
                                  <Receipt className="w-4 h-4 text-green-600" />
                                </a>
                              )}
                            </div>
                          )}
                          {payment.conversion_details && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowStudentDetails(payment)}
                              className="text-slate-600 hover:text-blue-600 hover:bg-blue-50"
                              data-testid={`view-student-details-${payment.id}`}
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openPaymentModal(payment)}
                            className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:border-orange-300"
                            data-testid={`update-payment-${payment.id}`}
                          >
                            Update
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

              {/* Invoice Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Invoice</label>
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
                      onClick={() => setPaymentUpdate(prev => ({ ...prev, invoice_url: '' }))}
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
                      onClick={() => setPaymentUpdate(prev => ({ ...prev, receipt_url: '' }))}
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
                  data-testid="save-payment-btn"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Save Payment
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
                          <a 
                            href={showSchoolDetails.onboarding_workflow.steps.mou_signing.data.document_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            View MOU
                          </a>
                        ) : showSchoolDetails.documents?.find(d => d.type === 'MOU') && (
                          <a 
                            href={getAbsoluteUrl(showSchoolDetails.documents.find(d => d.type === 'MOU').url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            View MOU
                          </a>
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
                      <a 
                        href={getAbsoluteUrl(showStudentDetails.invoice_url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        View Invoice
                      </a>
                    )}
                    {showStudentDetails.receipt_url && (
                      <a 
                        href={getAbsoluteUrl(showStudentDetails.receipt_url)} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 hover:underline flex items-center gap-1 text-sm"
                      >
                        <Receipt className="w-4 h-4" />
                        View Receipt
                      </a>
                    )}
                  </div>
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
