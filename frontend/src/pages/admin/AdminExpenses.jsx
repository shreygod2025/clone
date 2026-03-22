import { useState, useEffect, useRef } from 'react';
import { AdminLayout } from './AdminDashboard';
import { 
  Wallet, Plus, Search, Building2, Calendar, Edit, Trash2, 
  ChevronDown, ChevronUp, FileText, Download, Filter, X,
  DollarSign, TrendingUp, BarChart3, RefreshCw, CheckSquare,
  Upload, Paperclip, ChevronRight
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const schoolDropdownRef = useRef(null);

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
    notes: '',
    expense_breakup_type: '',
    expense_breakup_value: '',
    expected_payment_date: '',
    partial_amount_paid: '',
    partial_payment_date: '',
    invoice_file_url: ''
  });

  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (schoolDropdownRef.current && !schoolDropdownRef.current.contains(e.target)) {
        setShowSchoolDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setSelectedIds([]);
      
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
    if (!confirm('Are you sure you want to delete this expense? This cannot be undone.')) return;
    try {
      await axios.delete(`${API}/school-expenses/${expenseId}`, { headers: getAuthHeaders() });
      toast.success('Expense deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete expense');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} selected expense(s)? This cannot be undone.`)) return;
    try {
      await axios.post(`${API}/school-expenses/bulk-delete`, { ids: selectedIds }, { headers: getAuthHeaders() });
      toast.success(`Deleted ${selectedIds.length} expense(s)`);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      toast.error('Failed to delete selected expenses');
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(prev => prev.length === filteredExpenses.length ? [] : filteredExpenses.map(e => e.id));

  const handleCleanDuplicates = async () => {
    if (!confirm('This will remove duplicate auto-synced expenses (keeping one per school/PO/category). Manually added expenses will not be affected. Continue?')) return;
    try {
      const res = await axios.post(`${API}/expenses/cleanup-duplicates`, {}, { headers: getAuthHeaders() });
      toast.success(res.data.message);
      fetchData();
    } catch (error) {
      toast.error('Failed to clean duplicates');
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
      notes: '',
      expense_breakup_type: '',
      expense_breakup_value: '',
      expected_payment_date: '',
      partial_amount_paid: '',
      partial_payment_date: '',
      invoice_file_url: ''
    });
    setSchoolSearch('');
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
      notes: expense.notes || '',
      expense_breakup_type: expense.expense_breakup_type || '',
      expense_breakup_value: expense.expense_breakup_value || '',
      expected_payment_date: expense.expected_payment_date || '',
      partial_amount_paid: expense.partial_amount_paid || '',
      partial_payment_date: expense.partial_payment_date || '',
      invoice_file_url: expense.invoice_file_url || ''
    });
    setSchoolSearch(expense.school_name || '');
    setShowAddModal(true);
  };

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setInvoiceUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await axios.post(`${API}/upload?type=invoice`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' }
      });
      setExpenseForm(prev => ({ ...prev, invoice_file_url: res.data.url }));
      toast.success('Invoice uploaded successfully');
    } catch (err) {
      toast.error('Failed to upload invoice');
    } finally {
      setInvoiceUploading(false);
    }
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
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCleanDuplicates}
              className="text-amber-600 border-amber-300 hover:bg-amber-50"
              title="Remove duplicate auto-synced entries"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Clean Duplicates
            </Button>
            <Button 
              onClick={() => { resetForm(); setEditingExpense(null); setShowAddModal(true); }}
              className="bg-[#1E3A5F] hover:bg-[#2a4a6f]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </div>
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
          <div className="flex items-center gap-3">
            {selectedIds.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors font-medium"
                data-testid="bulk-delete-btn"
              >
                <Trash2 className="w-4 h-4" />
                Delete {selectedIds.length} selected
              </button>
            )}
            <span className="text-sm text-slate-500">{filteredExpenses.length} entries</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredExpenses.length > 0 && selectedIds.length === filteredExpenses.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 accent-[#1E3A5F] cursor-pointer"
                    data-testid="select-all-expenses"
                  />
                </th>
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
                <tr key={expense.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(expense.id) ? 'bg-red-50/40' : ''}`}>
                  <td className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(expense.id)}
                      onChange={() => toggleSelect(expense.id)}
                      className="w-4 h-4 rounded border-slate-300 accent-[#1E3A5F] cursor-pointer"
                      data-testid={`select-expense-${expense.id}`}
                    />
                  </td>
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
                  <td className="px-4 py-3 text-sm text-slate-600 max-w-[220px]">
                    <span className="whitespace-normal break-words leading-snug">{expense.description || '-'}</span>
                    {expense.expense_breakup_type && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        Breakup: {expense.expense_breakup_type === 'per_student' ? `₹${expense.expense_breakup_value}/student` :
                          expense.expense_breakup_type === 'lumpsum' ? `Lumpsum ₹${expense.expense_breakup_value}` :
                          `${expense.expense_breakup_value}%`}
                      </p>
                    )}
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
                    {expense.payment_status === 'partial' && expense.partial_amount_paid && (
                      <p className="text-xs text-amber-600 mt-0.5">Paid: {formatCurrency(expense.partial_amount_paid)}</p>
                    )}
                    {expense.expected_payment_date && expense.payment_status !== 'paid' && (
                      <p className="text-xs text-slate-400 mt-0.5">Due: {format(new Date(expense.expected_payment_date), 'dd MMM yy')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button 
                        onClick={() => openEditModal(expense)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600"
                        title="Edit expense"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(expense.id)}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 hover:text-red-700"
                        title="Delete expense"
                        data-testid={`delete-expense-${expense.id}`}
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
            {/* School Selection - Searchable */}
            <div ref={schoolDropdownRef} className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">School *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={schoolSearch}
                  onChange={(e) => {
                    setSchoolSearch(e.target.value);
                    setShowSchoolDropdown(true);
                    if (!e.target.value) setExpenseForm(prev => ({ ...prev, school_id: '' }));
                  }}
                  onFocus={() => setShowSchoolDropdown(true)}
                  placeholder="Search and select school..."
                  className="w-full h-10 pl-9 pr-8 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30"
                  data-testid="school-search-input"
                />
                {schoolSearch && (
                  <button
                    type="button"
                    onClick={() => { setSchoolSearch(''); setExpenseForm(prev => ({ ...prev, school_id: '' })); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              {showSchoolDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {schools
                    .filter(s => s.school_name?.toLowerCase().includes(schoolSearch.toLowerCase()))
                    .slice(0, 20)
                    .map(school => (
                      <button
                        key={school.id}
                        type="button"
                        onClick={() => {
                          setExpenseForm(prev => ({ ...prev, school_id: school.id }));
                          setSchoolSearch(school.school_name);
                          setShowSchoolDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${expenseForm.school_id === school.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'}`}
                      >
                        {school.school_name}
                      </button>
                    ))
                  }
                  {schools.filter(s => s.school_name?.toLowerCase().includes(schoolSearch.toLowerCase())).length === 0 && (
                    <p className="px-3 py-2 text-sm text-slate-400">No schools found</p>
                  )}
                </div>
              )}
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
                  data-testid="expense-amount-input"
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

            {/* Expected Payment Date */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expected Payment Date</label>
              <Input
                type="date"
                value={expenseForm.expected_payment_date}
                onChange={(e) => setExpenseForm({...expenseForm, expected_payment_date: e.target.value})}
                data-testid="expected-payment-date-input"
              />
            </div>
            
            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <Textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="Full description of the expense"
                rows={2}
              />
            </div>

            {/* Expense Breakup */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Expense Breakup</label>
              <div className="flex gap-2">
                <select
                  value={expenseForm.expense_breakup_type}
                  onChange={(e) => setExpenseForm({...expenseForm, expense_breakup_type: e.target.value})}
                  className="h-10 px-3 border border-slate-200 rounded-lg text-sm flex-1"
                  data-testid="breakup-type-select"
                >
                  <option value="">Select Type</option>
                  <option value="per_student">Amount per Student</option>
                  <option value="lumpsum">Lumpsum</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
                {expenseForm.expense_breakup_type && (
                  <Input
                    type="number"
                    value={expenseForm.expense_breakup_value}
                    onChange={(e) => setExpenseForm({...expenseForm, expense_breakup_value: e.target.value})}
                    placeholder={expenseForm.expense_breakup_type === 'percentage' ? '0%' : '₹0'}
                    className="w-28"
                    data-testid="breakup-value-input"
                  />
                )}
              </div>
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
                  data-testid="payment-status-select"
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

            {/* Partial Payment Details - shown only when status is 'partial' */}
            {expenseForm.payment_status === 'partial' && (
              <div className="grid grid-cols-2 gap-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-1">Partial Amount Paid (₹)</label>
                  <Input
                    type="number"
                    value={expenseForm.partial_amount_paid}
                    onChange={(e) => setExpenseForm({...expenseForm, partial_amount_paid: e.target.value})}
                    placeholder="0"
                    data-testid="partial-amount-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-amber-700 mb-1">Date Paid</label>
                  <Input
                    type="date"
                    value={expenseForm.partial_payment_date}
                    onChange={(e) => setExpenseForm({...expenseForm, partial_payment_date: e.target.value})}
                    data-testid="partial-payment-date-input"
                  />
                </div>
              </div>
            )}

            {/* Invoice Upload - only in edit mode */}
            {editingExpense && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload Invoice Document</label>
                <div className="space-y-2">
                  {expenseForm.invoice_file_url ? (
                    <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                      <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <a href={expenseForm.invoice_file_url} target="_blank" rel="noopener noreferrer"
                         className="text-sm text-green-700 hover:underline truncate flex-1">
                        View Invoice
                      </a>
                      <button
                        type="button"
                        onClick={() => setExpenseForm(prev => ({ ...prev, invoice_file_url: '' }))}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                      <Upload className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-500">
                        {invoiceUploading ? 'Uploading...' : 'Click to upload (PDF, image, max 10MB)'}
                      </span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={handleInvoiceUpload}
                        disabled={invoiceUploading}
                        data-testid="invoice-file-input"
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
            
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
