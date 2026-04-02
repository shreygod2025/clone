import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Search, Users, CreditCard, TrendingUp, Check, Clock, Copy, FileSpreadsheet, Edit2, RefreshCw, X, Save, RotateCcw, AlertTriangle, FileText, ShieldCheck, Undo2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from 'sonner';
import axios from 'axios';
import * as XLSX from 'xlsx';
import { downloadReceiptPDF } from '../../utils/receiptPdfGenerator';

const API = process.env.REACT_APP_BACKEND_URL;

const SchoolPaymentTracker = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  const hasFetched = useRef(false);
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [gradeStats, setGradeStats] = useState({});
  const [schoolName, setSchoolName] = useState('');
  
  // Filters
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Edit modal
  const [editModal, setEditModal] = useState(null); // payment object
  const [editData, setEditData] = useState({ student_name: '', grade: '', division: '' });
  const [saving, setSaving] = useState(false);

  // Unified refund modal
  const [refundModal, setRefundModal] = useState(null); // payment object (Cashfree refund)
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');
  const [refunding, setRefunding] = useState(false);

  // Unified refund modal state
  const [unifiedRefundModal, setUnifiedRefundModal] = useState(null); // payment object
  const [refundTab, setRefundTab] = useState('cashfree'); // 'cashfree' | 'manual'
  const [refundPlatform, setRefundPlatform] = useState('Cashfree');
  const [markingRefunded, setMarkingRefunded] = useState(false);

  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingPayment, setSyncingPayment] = useState(null); // payment id being synced

  const handleSyncPending = async () => {
    setSyncingAll(true);
    const toastId = toast.loading('Syncing pending payments with Cashfree...');
    try {
      const token = localStorage.getItem('oll_token');
      const res = await axios.post(
        `${API}/api/payments/sync-all?payment_type=school`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { summary } = res.data;
      toast.dismiss(toastId);
      if (summary.total_updated > 0) {
        toast.success(`${summary.total_updated} payment(s) updated!`);
        fetchPayments();
      } else if (summary.total_errors > 0) {
        toast.warning(`Sync ran but ${summary.total_errors} errors. Check Admin Orders for details.`);
      } else {
        toast.info(`${summary.total_checked} payments checked — all in sync.`);
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleVerifyPayment = async (paymentId) => {
    setSyncingPayment(paymentId);
    try {
      const token = localStorage.getItem('oll_token');
      const res = await axios.post(
        `${API}/api/payments/sync-single/${paymentId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const { status_changed, old_status, new_status } = res.data;
      if (status_changed) {
        toast.success(`Payment updated: ${old_status} → ${new_status}`);
        fetchPayments();
      } else {
        toast.info(`Status unchanged: ${new_status}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed');
    } finally {
      setSyncingPayment(null);
    }
  };

  useEffect(() => {
    if (schoolId && !hasFetched.current) {
      hasFetched.current = true;
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  useEffect(() => {
    if (hasFetched.current && gradeFilter !== 'all') {
      fetchPayments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gradeFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('oll_token');
      if (!token) { navigate('/admin/login'); return; }
      const params = {};
      if (gradeFilter && gradeFilter !== 'all') params.grade = gradeFilter;
      
      const response = await axios.get(`${API}/api/school-payment/tracker/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setPayments(response.data.payments || []);
      setStats(response.data.stats || {});
      setGradeStats(response.data.grade_stats || {});
      if (response.data.payments?.length > 0) {
        setSchoolName(response.data.payments[0].school_name);
      }
    } catch (error) {
      if (error.response?.status !== 401) toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount || 0);

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const copyPaymentLink = () => {
    const link = `${window.location.origin}/school-pay/${schoolId}`;
    navigator.clipboard.writeText(link);
    toast.success('Payment link copied!');
  };

  const exportToCSV = () => {
    const data = filteredPayments;
    const headers = ['Date', 'Student Name', 'Phone', 'Grade', 'Division', 'Amount', 'Status', 'Transaction ID'];
    const rows = data.map(p => [formatDate(p.paid_at || p.created_at), p.student_name, p.phone, p.grade, p.division || '-', p.amount, p.status, p.transaction_id || '-']);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolName || 'School'}_Payments_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const exportToXLSX = () => {
    const data = filteredPayments.map(p => ({
      'Date': formatDate(p.paid_at || p.created_at),
      'Student Name': p.student_name || '',
      'Phone': p.phone || '',
      'Grade': p.grade || '',
      'Division': p.division || '-',
      'Amount': p.amount || 0,
      'Status': p.status || 'PENDING',
      'Transaction ID': p.transaction_id || '-'
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [{ wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 20 }];
    const summaryData = [['School Payment Report'], ['School:', schoolName || ''], ['Generated:', new Date().toLocaleString()], ['Total Collected:', formatCurrency(stats.total_collected)], ['Students Paid:', stats.paid_count || 0], ['']];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.sheet_add_json(summaryWs, data, { origin: 'A7' });
    summaryWs['!cols'] = ws['!cols'];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Payments');
    XLSX.writeFile(wb, `${schoolName || 'School'}_Payments_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel file exported successfully');
  };

  // Edit student record
  const openEditModal = (payment) => {
    setEditData({ student_name: payment.student_name || '', grade: payment.grade || '', division: payment.division || '' });
    setEditModal(payment);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('oll_token');
      await axios.patch(`${API}/api/school-payment/student/${editModal.id}`, editData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Student record updated');
      setEditModal(null);
      // Update local state
      setPayments(prev => prev.map(p => p.id === editModal.id ? { ...p, ...editData } : p));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update record');
    } finally {
      setSaving(false);
    }
  };

  // Mark as refunded — status update only, with platform info
  const handleMarkRefunded = async () => {
    setMarkingRefunded(true);
    try {
      const token = localStorage.getItem('oll_token');
      await axios.patch(`${API}/api/school-payment/status/${unifiedRefundModal.id}`,
        { status: 'REFUNDED', refund_platform: refundPlatform },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Marked as Refunded (via ${refundPlatform})`);
      setUnifiedRefundModal(null);
      setPayments(prev => prev.map(p => p.id === unifiedRefundModal.id ? { ...p, status: 'REFUNDED' } : p));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to update status');
    } finally {
      setMarkingRefunded(false);
    }
  };

  // Initiate Cashfree refund
  const handleInitiateRefund = async () => {
    if (!refundAmount || parseFloat(refundAmount) <= 0) {
      toast.error('Please enter a valid refund amount');
      return;
    }
    if (parseFloat(refundAmount) > unifiedRefundModal.amount) {
      toast.error('Refund amount cannot exceed original payment amount');
      return;
    }
    setRefunding(true);
    try {
      const token = localStorage.getItem('oll_token');
      const res = await axios.post(`${API}/api/school-payment/refund/${unifiedRefundModal.id}`, {
        refund_amount: parseFloat(refundAmount),
        refund_note: refundNote || 'Admin initiated refund'
      }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(`Refund of ₹${refundAmount} initiated! Refund ID: ${res.data.refund_id}`);
      setUnifiedRefundModal(null);
      setPayments(prev => prev.map(p => p.id === unifiedRefundModal.id ? { ...p, status: 'REFUNDED' } : p));
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Refund failed');
    } finally {
      setRefunding(false);
    }
  };

  const openRefundModal = (payment) => {
    setUnifiedRefundModal(payment);
    setRefundTab('cashfree');
    setRefundAmount(String(payment.amount));
    setRefundNote('');
    setRefundPlatform('Cashfree');
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium"><Check className="w-3 h-3" />Paid</span>;
      case 'REFUNDED':
        return <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium"><RotateCcw className="w-3 h-3" />Refunded</span>;
      case 'EXPIRED':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium"><X className="w-3 h-3" />Expired</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-medium"><X className="w-3 h-3" />Cancelled</span>;
      default:
        return <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium"><Clock className="w-3 h-3" />Pending</span>;
    }
  };

  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.student_name?.toLowerCase().includes(query) ||
      p.phone?.includes(query) ||
      p.transaction_id?.toLowerCase().includes(query)
    );
  });

  const grades = [...new Set(payments.map(p => p.grade))].filter(Boolean).sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#C53030]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(-1)} className="p-2">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{schoolName || 'School'} - Payment Tracker</h1>
                <p className="text-sm text-slate-500">Track all student fee payments • {payments.length} total records</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleSyncPending}
                disabled={syncingAll}
                className="text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
                data-testid="sync-pending-payments-btn"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${syncingAll ? 'animate-spin' : ''}`} />
                {syncingAll ? 'Syncing...' : 'Sync Pending'}
              </Button>
              <Button variant="outline" onClick={copyPaymentLink} className="text-sm">
                <Copy className="w-4 h-4 mr-2" />Copy Payment Link
              </Button>
              <Button variant="outline" onClick={exportToXLSX} className="text-sm">
                <FileSpreadsheet className="w-4 h-4 mr-2" />Export Excel
              </Button>
              <Button variant="outline" onClick={exportToCSV} className="text-sm">
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.total_collected)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Students Paid</p>
                <p className="text-2xl font-bold text-blue-600">{stats.paid_count || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Expected Total</p>
                <p className="text-2xl font-bold text-slate-700">{formatCurrency(stats.total_expected)}</p>
              </div>
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-slate-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Collection %</p>
                <p className="text-2xl font-bold text-purple-600">{stats.collection_percentage || 0}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <div className="text-lg font-bold text-purple-600">%</div>
              </div>
            </div>
            <div className="mt-2 w-full bg-slate-200 rounded-full h-2">
              <div className="bg-purple-600 h-2 rounded-full transition-all" style={{ width: `${Math.min(stats.collection_percentage || 0, 100)}%` }}></div>
            </div>
          </div>
        </div>

        {/* Grade-wise Breakdown */}
        {Object.keys(gradeStats).length > 0 && (
          <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
            <h3 className="font-semibold text-slate-800 mb-3">Grade-wise Collection</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(gradeStats).map(([grade, data]) => (
                <div key={grade} className="bg-slate-50 rounded-lg px-4 py-2 border">
                  <span className="font-medium text-slate-700">Grade {grade}:</span>
                  <span className="ml-2 text-green-600 font-semibold">{data.paid} paid</span>
                  {data.pending > 0 && <span className="ml-1 text-amber-600">({data.pending} pending)</span>}
                  <span className="ml-2 text-slate-500 text-sm">{formatCurrency(data.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search by name, phone, or transaction ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-48">
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger>
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  {grades.map(g => (
                    <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Student Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Grade</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Division</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">{formatDate(payment.paid_at || payment.created_at)}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{payment.student_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{payment.phone}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">{payment.grade}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{payment.division || '-'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatCurrency(payment.amount)}</td>
                      <td className="px-4 py-3">{getStatusBadge(payment.status)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-500 max-w-[140px] truncate">{payment.transaction_id || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {/* Download Receipt (for PAID / REFUNDED) */}
                          {(payment.status === 'PAID' || payment.status === 'REFUNDED') && (
                            <button
                              onClick={() => downloadReceiptPDF(payment, schoolName)}
                              className="p-1.5 rounded hover:bg-green-100 text-green-600 transition-colors"
                              title="Download Receipt PDF"
                              data-testid="download-receipt-btn"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Edit */}
                          <button
                            onClick={() => openEditModal(payment)}
                            className="p-1.5 rounded hover:bg-blue-100 text-blue-600 transition-colors"
                            title="Edit student details"
                            data-testid="edit-student-btn"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Single Refund button for PAID — opens unified modal */}
                          {payment.status === 'PAID' && (
                            <button
                              onClick={() => openRefundModal(payment)}
                              className="p-1.5 rounded hover:bg-red-100 text-red-600 transition-colors"
                              title="Refund options"
                              data-testid="refund-btn"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {/* Verify / Force-sync PENDING payments — ShieldCheck is distinct */}
                          {payment.status !== 'PAID' && payment.status !== 'REFUNDED' && payment.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleVerifyPayment(payment.id)}
                              disabled={syncingPayment === payment.id}
                              className="p-1.5 rounded hover:bg-amber-100 text-amber-600 transition-colors disabled:opacity-50"
                              title="Verify payment status with Cashfree"
                              data-testid={`verify-payment-${payment.id}`}
                            >
                              {syncingPayment === payment.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : <ShieldCheck className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredPayments.length > 0 && (
            <div className="px-4 py-3 bg-slate-50 border-t text-sm text-slate-500">
              Showing {filteredPayments.length} of {payments.length} total records
            </div>
          )}
        </div>
      </div>

      {/* Edit Student Modal */}
      <Dialog open={!!editModal} onOpenChange={() => setEditModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-blue-600" />
              Edit Student Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-1">Student Name</label>
              <Input
                value={editData.student_name}
                onChange={(e) => setEditData({ ...editData, student_name: e.target.value })}
                placeholder="Enter student name"
                data-testid="edit-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Grade / Standard</label>
                <Input
                  value={editData.grade}
                  onChange={(e) => setEditData({ ...editData, grade: e.target.value })}
                  placeholder="e.g., 8"
                  data-testid="edit-grade-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Division</label>
                <Input
                  value={editData.division}
                  onChange={(e) => setEditData({ ...editData, division: e.target.value })}
                  placeholder="e.g., A"
                  data-testid="edit-division-input"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={handleSaveEdit} disabled={saving} className="gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Refund Modal */}
      <Dialog open={!!unifiedRefundModal} onOpenChange={() => setUnifiedRefundModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Undo2 className="w-5 h-5 text-red-600" />
              Refund Payment
            </DialogTitle>
          </DialogHeader>

          {/* Student Info */}
          {unifiedRefundModal && (
            <div className="text-sm text-slate-600 bg-slate-50 rounded-lg px-4 py-3 space-y-1">
              <p><span className="font-medium">Student:</span> {unifiedRefundModal.student_name}</p>
              <p><span className="font-medium">Amount:</span> ₹{unifiedRefundModal.amount}</p>
              <p><span className="font-medium">Order ID:</span> <span className="font-mono text-xs">{unifiedRefundModal.id}</span></p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-slate-200 mt-1">
            <button
              onClick={() => setRefundTab('cashfree')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${refundTab === 'cashfree' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              data-testid="tab-cashfree-refund"
            >
              Refund via Cashfree
            </button>
            <button
              onClick={() => setRefundTab('manual')}
              className={`flex-1 py-2.5 text-sm font-medium border-b-2 transition-colors ${refundTab === 'manual' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              data-testid="tab-manual-refund"
            >
              Mark as Refunded
            </button>
          </div>

          {/* Tab: Cashfree Refund */}
          {refundTab === 'cashfree' && (
            <div className="space-y-4 pt-2">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800">This initiates a real refund via Cashfree. Amount credited back within 5-7 business days.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Refund Amount (₹)</label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="Enter refund amount"
                  max={unifiedRefundModal?.amount}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  data-testid="refund-amount-input"
                />
                <p className="text-xs text-slate-500 mt-1">Max: ₹{unifiedRefundModal?.amount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Refund Note (optional)</label>
                <input
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="Reason for refund"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  data-testid="refund-note-input"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUnifiedRefundModal(null)}>Cancel</Button>
                <Button onClick={handleInitiateRefund} disabled={refunding} className="gap-2 bg-red-600 hover:bg-red-700" data-testid="confirm-cashfree-refund-btn">
                  <Undo2 className="w-4 h-4" />
                  {refunding ? 'Processing...' : 'Initiate Refund'}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Tab: Mark as Refunded */}
          {refundTab === 'manual' && (
            <div className="space-y-4 pt-2">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">This <strong>only updates the status</strong> in your records. Use this when the refund was processed outside of Cashfree (e.g., cash, bank transfer).</p>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Platform / Method Used</label>
                <select
                  value={refundPlatform}
                  onChange={(e) => setRefundPlatform(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                  data-testid="refund-platform-select"
                >
                  <option value="Cashfree">Cashfree (processed externally)</option>
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer / NEFT / RTGS</option>
                  <option value="UPI">UPI</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setUnifiedRefundModal(null)}>Cancel</Button>
                <Button onClick={handleMarkRefunded} disabled={markingRefunded} className="gap-2 bg-purple-600 hover:bg-purple-700" data-testid="confirm-mark-refunded-btn">
                  <RotateCcw className="w-4 h-4" />
                  {markingRefunded ? 'Updating...' : 'Mark as Refunded'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SchoolPaymentTracker;
