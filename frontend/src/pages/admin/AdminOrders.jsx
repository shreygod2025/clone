import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { 
  DollarSign, Building2, GraduationCap, Upload, Download, Eye, 
  CheckCircle2, Clock, AlertCircle, Calendar, Search, Filter,
  FileText, Receipt, CreditCard, X, ExternalLink
} from 'lucide-react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

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
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [paymentUpdate, setPaymentUpdate] = useState({
    status: '',
    payment_date: '',
    transaction_id: '',
    notes: '',
    invoice_url: '',
    receipt_url: ''
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
      setPaymentUpdate({ status: '', payment_date: '', transaction_id: '', notes: '', invoice_url: '', receipt_url: '' });
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
      receipt_url: payment.receipt_url || ''
    });
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
    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.school_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Orders & Payments</h1>
            <p className="text-slate-500">Manage school and student payment collections</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('school')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'school'
                ? 'border-[#1E3A5F] text-[#1E3A5F]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid="school-payments-tab"
          >
            <Building2 className="w-4 h-4" />
            School Payments
          </button>
          <button
            onClick={() => setActiveTab('student')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'student'
                ? 'border-[#1E3A5F] text-[#1E3A5F]'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
            data-testid="student-payments-tab"
          >
            <GraduationCap className="w-4 h-4" />
            Student Payments
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                <Receipt className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Total Orders</p>
                <p className="text-xl font-bold text-slate-800">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-red-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Overdue</p>
                <p className="text-xl font-bold text-red-600">{stats.overdue}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Paid</p>
                <p className="text-xl font-bold text-green-600">{stats.paid}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="text-lg font-bold text-blue-600">₹{stats.collectedAmount.toLocaleString()}</p>
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
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1E3A5F] mx-auto"></div>
              <p className="text-slate-500 mt-4">Loading payments...</p>
            </div>
          ) : sortedPayments.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No payments found</p>
              <p className="text-sm text-slate-400 mt-1">
                {activeTab === 'school' 
                  ? 'School payments will appear here when schools are converted with payment tranches'
                  : 'Student payments will appear here when students book sessions'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">
                      {activeTab === 'school' ? 'School' : 'Student'}
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Due Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Invoice</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Receipt</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-800">
                            {activeTab === 'school' ? payment.school_name : payment.student_name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {payment.contact_name || payment.description}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">₹{(payment.amount || 0).toLocaleString()}</p>
                        {payment.tranche_info && (
                          <p className="text-xs text-slate-500">{payment.tranche_info}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {payment.due_date ? (
                          <p className={`text-sm ${
                            isPast(parseISO(payment.due_date)) && payment.status !== 'paid'
                              ? 'text-red-600 font-medium'
                              : 'text-slate-600'
                          }`}>
                            {format(parseISO(payment.due_date), 'MMM d, yyyy')}
                          </p>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(payment)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.invoice_url ? (
                          <a 
                            href={payment.invoice_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                          >
                            <FileText className="w-4 h-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">Not uploaded</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {payment.receipt_url ? (
                          <a 
                            href={payment.receipt_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-green-600 hover:text-green-800 text-sm flex items-center gap-1"
                          >
                            <Receipt className="w-4 h-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-slate-400 text-sm">Not uploaded</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openPaymentModal(payment)}
                          data-testid={`update-payment-${payment.id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Update
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Update Modal */}
      <Dialog open={!!showPaymentModal} onOpenChange={() => setShowPaymentModal(null)}>
        <DialogContent className="max-w-lg">
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
                      href={paymentUpdate.invoice_url} 
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
                      href={paymentUpdate.receipt_url} 
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
    </AdminLayout>
  );
};

export default AdminOrders;
