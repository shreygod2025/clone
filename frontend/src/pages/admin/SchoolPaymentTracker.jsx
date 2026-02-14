import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Filter, Search, Users, CreditCard, TrendingUp, Check, Clock, Copy, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const SchoolPaymentTracker = () => {
  const { schoolId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState({});
  const [gradeStats, setGradeStats] = useState({});
  const [schoolName, setSchoolName] = useState('');
  
  // Filters
  const [gradeFilter, setGradeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Get unique grades from payments
  const grades = [...new Set(payments.map(p => p.grade))].sort();

  useEffect(() => {
    fetchPayments();
  }, [schoolId, gradeFilter]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const params = {};
      if (gradeFilter && gradeFilter !== 'all') {
        params.grade = gradeFilter;
      }
      
      const response = await axios.get(`${API}/school-payment/tracker/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setPayments(response.data.payments || []);
      setStats(response.data.stats || {});
      setGradeStats(response.data.grade_stats || {});
      
      // Get school name from first payment or fetch separately
      if (response.data.payments?.length > 0) {
        setSchoolName(response.data.payments[0].school_name);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyPaymentLink = () => {
    const link = `${window.location.origin}/school-pay/${schoolId}`;
    navigator.clipboard.writeText(link);
    toast.success('Payment link copied!');
  };

  const exportToCSV = () => {
    const filteredPayments = payments.filter(p => 
      searchQuery ? 
        p.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.phone?.includes(searchQuery)
      : true
    );

    const headers = ['Date', 'Student Name', 'Phone', 'Grade', 'Division', 'Amount', 'Status', 'Transaction ID'];
    const rows = filteredPayments.map(p => [
      formatDate(p.paid_at || p.created_at),
      p.student_name,
      p.phone,
      p.grade,
      p.division || '-',
      p.amount,
      p.status,
      p.transaction_id || '-'
    ]);

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

  // Filter payments by search
  const filteredPayments = payments.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.student_name?.toLowerCase().includes(query) ||
      p.phone?.includes(query) ||
      p.transaction_id?.toLowerCase().includes(query)
    );
  });

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
                <p className="text-sm text-slate-500">Track all student fee payments</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                onClick={copyPaymentLink}
                className="text-sm"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Payment Link
              </Button>
              <Button 
                variant="outline" 
                onClick={exportToCSV}
                className="text-sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
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
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(stats.collection_percentage || 0, 100)}%` }}
              ></div>
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
                  {data.pending > 0 && (
                    <span className="ml-1 text-amber-600">({data.pending} pending)</span>
                  )}
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
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                      <CreditCard className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p>No payments found</p>
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(payment.paid_at || payment.created_at)}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {payment.student_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {payment.phone}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                          {payment.grade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {payment.division || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        {payment.status === 'PAID' ? (
                          <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Check className="w-3 h-3" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-1 rounded-full text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-500">
                        {payment.transaction_id || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolPaymentTracker;
