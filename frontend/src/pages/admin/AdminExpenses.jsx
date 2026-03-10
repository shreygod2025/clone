import { useState, useEffect } from 'react';
import { AdminLayout } from './AdminDashboard';
import { 
  Wallet, Plus, Search, Building2, Calendar, Edit, Trash2, 
  ChevronDown, ChevronUp, FileText, Download, Filter, X,
  DollarSign, TrendingUp, BarChart3, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';
import { format } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminExpenses = () => {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({ grand_total: 0, schools: [] });
  const [categories, setCategories] = useState([]);
  const [schools, setSchools] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    school_id: '',
    category: '',
    start_date: '',
    end_date: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [expenseForm, setExpenseForm] = useState({
    school_id: '',
    category: '',
    amount: '',
    description: '',
    expense_date: format(new Date(), 'yyyy-MM-dd'),
    invoice_number: '',
    vendor_name: '',
    payment_status: 'pending',
    payment_mode: '',
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      // Fetch categories
      const catRes = await axios.get(`${API}/school-expenses/categories`, { headers });
      setCategories(Array.isArray(catRes.data) ? catRes.data : []);
      
      // Fetch schools for dropdown (all schools, not just converted)
      try {
        const schoolsRes = await axios.get(`${API}/school-inquiries`, { headers });
        const schoolsList = schoolsRes.data?.inquiries || schoolsRes.data || [];
        setSchools(Array.isArray(schoolsList) ? schoolsList : []);
      } catch (err) {
        console.error('Failed to fetch schools:', err);
        setSchools([]);
      }
      
      // Build query params
      const params = new URLSearchParams();
      if (filters.school_id) params.append('school_id', filters.school_id);
      if (filters.category) params.append('category', filters.category);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);
      
      // Fetch expenses
      const expRes = await axios.get(`${API}/school-expenses?${params.toString()}`, { headers });
      // Handle both response formats: direct array or object with expenses property
      const expenseData = Array.isArray(expRes.data) ? expRes.data : (expRes.data?.expenses || []);
      setExpenses(expenseData);
      
      // Fetch summary
      const summaryParams = filters.school_id ? `?school_id=${filters.school_id}` : '';
      const summaryRes = await axios.get(`${API}/school-expenses/summary${summaryParams}`, { headers });
      setSummary(summaryRes.data);
      
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!expenseForm.school_id || !expenseForm.category || !expenseForm.amount) {
      toast.error('Please fill in required fields');
      return;
    }
    
    try {
      const headers = getAuthHeaders();
      
      if (editingExpense) {
        await axios.patch(`${API}/school-expenses/${editingExpense.id}`, expenseForm, { headers });
        toast.success('Expense updated successfully');
      } else {
        await axios.post(`${API}/school-expenses`, expenseForm, { headers });
        toast.success('Expense added successfully');
      }
      
      setShowAddModal(false);
      setEditingExpense(null);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error('Failed to save expense');
    }
  };

  const handleDelete = async (expenseId) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    
    try {
      await axios.delete(`${API}/school-expenses/${expenseId}`, { headers: getAuthHeaders() });
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const resetForm = () => {
    setExpenseForm({
      school_id: '',
      category: '',
      amount: '',
      description: '',
      expense_date: format(new Date(), 'yyyy-MM-dd'),
      invoice_number: '',
      vendor_name: '',
      payment_status: 'pending',
      payment_mode: '',
      notes: ''
    });
  };

  const openEditModal = (expense) => {
    setEditingExpense(expense);
    setExpenseForm({
      school_id: expense.school_id,
      category: expense.category,
      amount: expense.amount,
      description: expense.description || '',
      expense_date: expense.expense_date || '',
      invoice_number: expense.invoice_number || '',
      vendor_name: expense.vendor_name || '',
      payment_status: expense.payment_status || 'pending',
      payment_mode: expense.payment_mode || '',
      notes: expense.notes || ''
    });
    setShowAddModal(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const getCategoryColor = (categoryId) => {
    const colors = {
      kit_cost: 'bg-blue-100 text-blue-700',
      teacher_cost: 'bg-purple-100 text-purple-700',
      logistics_cost: 'bg-orange-100 text-orange-700',
      books_cost: 'bg-green-100 text-green-700',
      gp_share: 'bg-teal-100 text-teal-700',
      school_share: 'bg-indigo-100 text-indigo-700',
      printing_certification: 'bg-pink-100 text-pink-700',
      renewal_commission_team: 'bg-amber-100 text-amber-700',
      renewal_commission_teachers: 'bg-cyan-100 text-cyan-700',
      marketing_cost: 'bg-red-100 text-red-700',
      technology_cost: 'bg-violet-100 text-violet-700',
      other: 'bg-slate-100 text-slate-700'
    };
    return colors[categoryId] || colors.other;
  };

  const filteredExpenses = expenses.filter(exp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      exp.school_name?.toLowerCase().includes(query) ||
      exp.category_name?.toLowerCase().includes(query) ||
      exp.description?.toLowerCase().includes(query) ||
      exp.vendor_name?.toLowerCase().includes(query)
    );
  });

  return (
    <AdminLayout title="Expenses">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] flex items-center gap-2">
              <Wallet className="w-7 h-7" />
              School Expenses
            </h1>
            <p className="text-slate-600 text-sm mt-1">Track and manage expenses for each school</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setEditingExpense(null); setShowAddModal(true); }}
            className="bg-[#1E3A5F] hover:bg-[#2a4a6f]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Expense
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2a5a8f] rounded-xl p-5 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <p className="text-white/80 text-sm">Total Expenses</p>
              <p className="text-2xl font-bold">{formatCurrency(summary.grand_total)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Schools with Expenses</p>
              <p className="text-2xl font-bold text-slate-800">{summary.schools?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Total Entries</p>
              <p className="text-2xl font-bold text-slate-800">{expenses.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl p-5 shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Avg per School</p>
              <p className="text-2xl font-bold text-slate-800">
                {formatCurrency(summary.schools?.length ? summary.grand_total / summary.schools.length : 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search expenses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <select
            value={filters.school_id}
            onChange={(e) => setFilters({...filters, school_id: e.target.value})}
            className="h-10 px-3 border border-slate-200 rounded-lg min-w-[180px]"
          >
            <option value="">All Schools</option>
            {schools.map(school => (
              <option key={school.id} value={school.id}>{school.school_name}</option>
            ))}
          </select>
          
          <select
            value={filters.category}
            onChange={(e) => setFilters({...filters, category: e.target.value})}
            className="h-10 px-3 border border-slate-200 rounded-lg min-w-[160px]"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          
          <Input
            type="date"
            value={filters.start_date}
            onChange={(e) => setFilters({...filters, start_date: e.target.value})}
            className="w-[150px]"
            placeholder="Start Date"
          />
          
          <Input
            type="date"
            value={filters.end_date}
            onChange={(e) => setFilters({...filters, end_date: e.target.value})}
            className="w-[150px]"
            placeholder="End Date"
          />
          
          <Button variant="outline" onClick={() => setFilters({ school_id: '', category: '', start_date: '', end_date: '' })}>
            <X className="w-4 h-4 mr-1" />
            Clear
          </Button>
          
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Recent Expenses Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            All Expense Entries
          </h2>
          <span className="text-sm text-slate-500">{filteredExpenses.length} entries</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">School</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">Vendor</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Subtotal</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">GST</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Total</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">Files</th>
                <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredExpenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {expense.expense_date ? format(new Date(expense.expense_date), 'dd MMM yyyy') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 text-sm">{expense.school_name}</p>
                    {expense.po_number && (
                      <p className="text-xs text-slate-500">PO: {expense.po_number}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${getCategoryColor(expense.category)}`}>
                      {expense.category_name}
                    </span>
                    {expense.auto_synced && (
                      <span className="ml-1 text-xs text-green-600">⚡</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[200px] truncate">
                    {expense.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {expense.vendor_name || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-sm text-slate-700">
                    {expense.subtotal ? formatCurrency(expense.subtotal) : formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {expense.gst_amount > 0 ? (
                      <div>
                        <p className="text-sm font-medium text-slate-700">{formatCurrency(expense.gst_amount)}</p>
                        <p className="text-xs text-slate-500">{expense.gst_type} @ {expense.gst_rate}%</p>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">
                    {expense.grand_total ? formatCurrency(expense.grand_total) : formatCurrency(expense.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-1 flex-wrap">
                      {expense.po_pdf_url && expense.po_pdf_url !== 'null' && expense.po_pdf_url.startsWith('http') && (
                        <a
                          href={expense.po_pdf_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                          title="View PO"
                        >
                          PO
                        </a>
                      )}
                      {expense.invoice_file_url && expense.invoice_file_url !== 'null' && expense.invoice_file_url.startsWith('http') && (
                        <a
                          href={expense.invoice_file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100"
                          title="View Invoice"
                        >
                          INV
                        </a>
                      )}
                      {expense.logistics_bill_url && expense.logistics_bill_url !== 'null' && expense.logistics_bill_url.startsWith('http') && (
                        <a
                          href={expense.logistics_bill_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100"
                          title="View Logistics Bill"
                        >
                          LB
                        </a>
                      )}
                      {expense.delivery_proof_url && expense.delivery_proof_url !== 'null' && expense.delivery_proof_url.startsWith('http') && (
                        <a
                          href={expense.delivery_proof_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs px-2 py-1 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                          title="View Delivery Proof"
                        >
                          DP
                        </a>
                      )}
                      {(!expense.po_pdf_url || !expense.po_pdf_url.startsWith('http')) && 
                       (!expense.invoice_file_url || !expense.invoice_file_url.startsWith('http')) && 
                       (!expense.logistics_bill_url || !expense.logistics_bill_url.startsWith('http')) && 
                       (!expense.delivery_proof_url || !expense.delivery_proof_url.startsWith('http')) && (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      expense.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                      expense.payment_status === 'partial' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {expense.payment_status || 'pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan="8" className="px-4 py-8 text-center text-slate-500">
                    No expenses found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Expense Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-[#1E3A5F]" />
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            {/* School Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">School *</label>
              <select
                value={expenseForm.school_id}
                onChange={(e) => setExpenseForm({...expenseForm, school_id: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select School</option>
                {schools.map(school => (
                  <option key={school.id} value={school.id}>{school.school_name}</option>
                ))}
              </select>
            </div>
            
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expense Category *</label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({...expenseForm, category: e.target.value})}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg"
              >
                <option value="">Select Category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            {/* Amount and Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                <Input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date *</label>
                <Input
                  type="date"
                  value={expenseForm.expense_date}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_date: e.target.value})}
                />
              </div>
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Input
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="Brief description of the expense"
              />
            </div>
            
            {/* Vendor and Invoice */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vendor Name</label>
                <Input
                  value={expenseForm.vendor_name}
                  onChange={(e) => setExpenseForm({...expenseForm, vendor_name: e.target.value})}
                  placeholder="Vendor/Supplier name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                <Input
                  value={expenseForm.invoice_number}
                  onChange={(e) => setExpenseForm({...expenseForm, invoice_number: e.target.value})}
                  placeholder="INV-001"
                />
              </div>
            </div>
            
            {/* Payment Status and Mode */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
                <select
                  value={expenseForm.payment_status}
                  onChange={(e) => setExpenseForm({...expenseForm, payment_status: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <select
                  value={expenseForm.payment_mode}
                  onChange={(e) => setExpenseForm({...expenseForm, payment_mode: e.target.value})}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg"
                >
                  <option value="">Select Mode</option>
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="upi">UPI</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                </select>
              </div>
            </div>
            
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
              <Textarea
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                placeholder="Any additional notes..."
                rows={2}
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-[#1E3A5F]">
              {editingExpense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
};

export default AdminExpenses;
