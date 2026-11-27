import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import {
  Plus,
  Trash2,
  Download,
  FileText,
  Loader2,
  CheckCircle2,
  Clock,
  Search,
  Edit3,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  FilePlus,
  X,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { generateInvoicePDF } from '../../utils/invoicePdfGenerator';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INDIAN_STATES = [
  'Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Gujarat', 'Uttar Pradesh',
  'Rajasthan', 'West Bengal', 'Telangana', 'Andhra Pradesh', 'Kerala', 'Madhya Pradesh',
  'Punjab', 'Haryana', 'Bihar', 'Odisha', 'Assam', 'Chhattisgarh', 'Jharkhand',
  'Uttarakhand', 'Himachal Pradesh', 'Goa', 'Tripura', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Sikkim', 'Arunachal Pradesh', 'Jammu and Kashmir',
  'Ladakh', 'Chandigarh', 'Puducherry', 'Andaman and Nicobar', 'Lakshadweep',
  'Dadra and Nagar Haveli',
];

const emptyRow = () => ({ desc: '', qty: '', rate: '' });
const emptyTranche = (idx = 1) => ({
  id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : `t-${Date.now()}-${idx}`,
  name: `Tranche ${idx}`,
  amount: '',
  due_date: '',
  status: 'pending', // paid | pending
});

const incrementInvoiceNumber = (lastNo, year = new Date().getFullYear()) => {
  const raw = (lastNo || '').trim();
  if (!raw) return `OLL${year}/CUST-0001`;
  const match = raw.match(/^(.*?)(\d+)$/);
  if (match) {
    const [, prefix, digits] = match;
    const nextNum = parseInt(digits, 10) + 1;
    const formattedDigits = String(nextNum).padStart(digits.length, '0');
    return `${prefix}${formattedDigits}`;
  }
  return `${raw}-1`;
};

const getAuthHeaders = () => {
  const token = localStorage.getItem('oll_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomInvoiceModal({ open, onClose, currentUser, initialMode = 'create' }) {
  const today = new Date().toISOString().slice(0, 10);

  // Top-level Mode: 'create' | 'edit'
  const [mode, setMode] = useState(initialMode || 'create');

  // For Edit Mode: Step 1 (Enter Invoice Number only) | Step 2 (Edit Invoice Details)
  const [editStep, setEditStep] = useState(1);
  const [lookupError, setLookupError] = useState('');

  const [form, setForm] = useState({
    invoice_no: '',
    // Bill To
    customer_name: '',
    address: '',
    gstin: '',
    state: 'Maharashtra',           // Bill To state (printed in address block)
    // Ship To
    same_ship_to: true,              // when true, Ship To mirrors Bill To
    ship_to_name: '',
    ship_to_address: '',
    ship_to_state: 'Maharashtra',
    // Place of supply (drives IGST/CGST+SGST math)
    place_of_supply: 'Maharashtra',
    gst_type: 'exclusive_18',
    // Invoice metadata
    invoice_date: today,
    payment_status: 'pending',       // pending | paid | partial
    paid_amount: '',                 // used when payment_status === 'partial'
    notes: '',
  });

  const [items, setItems] = useState([emptyRow()]);
  const [tranches, setTranches] = useState([]); // optional payment tranches
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [statusEditing, setStatusEditing] = useState(null); // { id, payment_status, paid_amount }
  const [savingStatus, setSavingStatus] = useState(false);

  // Edit by Invoice Number states
  const [editingInvoice, setEditingInvoice] = useState(null); // { id, invoice_no, is_school_invoice }
  const [searchInvoiceNo, setSearchInvoiceNo] = useState('');
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [nextSuggestedNumber, setNextSuggestedNumber] = useState('');

  // MongoDB Audit Trail modal state
  const [auditModalData, setAuditModalData] = useState(null); // { invoice_no, logs: [], loading: boolean }

  const handleViewAuditHistory = async (row) => {
    if (!row?.id) return;
    setAuditModalData({ invoice_no: row.invoice_no, logs: [], loading: true });
    try {
      const res = await axios.get(`${API}/admin/custom-invoices/${row.id}/history`, {
        headers: getAuthHeaders(),
      });
      setAuditModalData({
        invoice_no: row.invoice_no,
        logs: res.data?.logs || [],
        loading: false,
      });
    } catch (err) {
      toast.error('Failed to load audit history for this invoice');
      setAuditModalData(null);
    }
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/admin/custom-invoices?limit=50`, { headers: getAuthHeaders() });
      setHistory(res.data?.rows || []);
    } catch (err) {
      if (err?.response?.status !== 403) {
        console.error('Failed to load custom invoices:', err);
      }
    } finally {
      setLoadingHistory(false);
    }
  };

  const fetchNextInvoiceNumber = async () => {
    try {
      const res = await axios.get(`${API}/admin/custom-invoices/next-number`, { headers: getAuthHeaders() });
      if (res.data?.next_invoice_no) {
        setNextSuggestedNumber(res.data.next_invoice_no);
        setForm(prev => {
          if (!prev.invoice_no || prev.invoice_no === nextSuggestedNumber) {
            return { ...prev, invoice_no: res.data.next_invoice_no };
          }
          return prev;
        });
      }
    } catch (err) {
      if (err?.response?.status !== 403) {
        console.warn('Failed to load next invoice number:', err);
      }
    }
  };

  // Sync mode with initialMode on open
  useEffect(() => {
    if (open) {
      const targetMode = initialMode === 'edit' ? 'edit' : 'create';
      setMode(targetMode);
      setLookupError('');
      loadHistory();
      if (targetMode === 'edit') {
        if (!editingInvoice) {
          setEditStep(1);
        } else {
          setEditStep(2);
        }
      } else {
        handleCancelEdit();
        fetchNextInvoiceNumber();
      }
    }
  }, [open, initialMode]);

  // Live totals
  const subtotal = items.reduce((s, r) => {
    const q = Number(r.qty || 0);
    const rate = Number(r.rate || 0);
    return s + q * rate;
  }, 0);

  // Inter-state vs intra-state
  const isInterstate = (form.place_of_supply || '').toLowerCase() !== 'maharashtra';
  const gstRate = (form.gst_type === 'book_gst_0') ? 0 : 18;
  const gstAmount = (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive')
    ? subtotal * (gstRate / 100)
    : 0;

  // Invoice grand total
  const invoiceTotal = subtotal + ((form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') ? gstAmount : 0);

  // Payment Tranches math
  const tranchesTotal = tranches.reduce((s, t) => s + Number(t.amount || 0), 0);
  const tranchesRemaining = Math.max(0, invoiceTotal - tranchesTotal);
  const tranchesExceed = tranchesTotal > invoiceTotal + 0.001;
  const tranchesPaidSum = tranches.reduce((s, t) => s + (t.status === 'paid' ? Number(t.amount || 0) : 0), 0);
  const derivedTrancheStatus = (() => {
    if (tranches.length === 0) return null;
    const allPaid = tranches.every(t => t.status === 'paid' && Number(t.amount || 0) > 0);
    if (allPaid) return 'paid';
    const anyPaid = tranches.some(t => t.status === 'paid' && Number(t.amount || 0) > 0);
    return anyPaid ? 'partial' : 'pending';
  })();

  const addTranche = () => {
    setTranches(prev => {
      const nextIdx = prev.length + 1;
      const nextDefault = Math.max(0, invoiceTotal - prev.reduce((s, t) => s + Number(t.amount || 0), 0));
      return [...prev, { ...emptyTranche(nextIdx), amount: nextDefault > 0 ? Number(nextDefault.toFixed(2)) : '' }];
    });
  };
  const removeTranche = (id) => setTranches(prev => prev.filter(t => t.id !== id));
  const updateTranche = (id, patch) => setTranches(prev => prev.map(t => (t.id === id ? { ...t, ...patch } : t)));

  // Lookup Invoice (Step 1 validation)
  const handleLookupInvoice = async (q) => {
    const cleanQuery = (q || '').trim();
    if (!cleanQuery) {
      setLookupError('Please enter an invoice number to search.');
      toast.error('Please enter an invoice number');
      return;
    }
    setLoadingInvoice(true);
    setLookupError('');
    try {
      const res = await axios.get(`${API}/admin/custom-invoices/lookup?q=${encodeURIComponent(cleanQuery)}`, {
        headers: getAuthHeaders(),
      });
      const data = res.data;
      if (!data || !data.invoice_no) {
        setLookupError(`Invoice "${cleanQuery}" was not found in the records.`);
        toast.error(`Invoice "${cleanQuery}" not found`);
        return;
      }
      setEditingInvoice({
        id: data.id,
        invoice_no: data.invoice_no,
        is_school_invoice: !!data.is_school_invoice,
      });
      setForm({
        invoice_no: data.invoice_no || cleanQuery,
        customer_name: data.customer_name || '',
        address: data.address || '',
        gstin: data.gstin || '',
        state: data.state || 'Maharashtra',
        same_ship_to: data.ship_to_name ? (data.ship_to_name === data.customer_name) : true,
        ship_to_name: data.ship_to_name || '',
        ship_to_address: data.ship_to_address || '',
        ship_to_state: data.ship_to_state || data.state || 'Maharashtra',
        place_of_supply: data.place_of_supply || data.state || 'Maharashtra',
        gst_type: data.gst_type || 'exclusive_18',
        invoice_date: data.invoice_date || (data.created_at ? data.created_at.slice(0, 10) : today),
        payment_status: data.payment_status || 'pending',
        paid_amount: data.paid_amount || '',
        notes: data.notes || '',
      });
      setItems(data.line_items && data.line_items.length > 0 ? data.line_items : [emptyRow()]);
      setTranches(data.tranches || []);
      setEditStep(2); // Valid and found -> Open Form 2!
      toast.success(`Verified: Loaded invoice ${data.invoice_no} for editing`);
    } catch (err) {
      const errorMsg = err?.response?.data?.detail || `Invoice "${cleanQuery}" not found in database. Please verify the number.`;
      setLookupError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingInvoice(null);
    setSearchInvoiceNo('');
    setLookupError('');
    setEditStep(1);
    setForm({
      invoice_no: nextSuggestedNumber || '',
      customer_name: '',
      address: '',
      gstin: '',
      state: 'Maharashtra',
      same_ship_to: true,
      ship_to_name: '',
      ship_to_address: '',
      ship_to_state: 'Maharashtra',
      place_of_supply: 'Maharashtra',
      gst_type: 'exclusive_18',
      invoice_date: today,
      payment_status: 'pending',
      paid_amount: '',
      notes: '',
    });
    setItems([emptyRow()]);
    setTranches([]);
    fetchNextInvoiceNumber();
  };

  const handleSwitchToCreate = () => {
    setMode('create');
    handleCancelEdit();
  };

  const handleSwitchToEdit = () => {
    setMode('edit');
    if (!editingInvoice) {
      setEditStep(1);
    }
  };

  const handleBackToStep1 = () => {
    setEditStep(1);
    setLookupError('');
  };

  const handleGenerate = async (genMode = 'create') => {
    // Validation
    if (!form.customer_name.trim()) {
      toast.error('Customer name is required');
      return;
    }
    const valid = items.filter(r => r.desc && r.qty && r.rate);
    if (valid.length === 0) {
      toast.error('Add at least one line item with description, qty and rate');
      return;
    }
    if (subtotal <= 0) {
      toast.error('Subtotal must be greater than 0');
      return;
    }
    if (tranches.length > 0) {
      const missing = tranches.findIndex(t => !Number(t.amount) || Number(t.amount) <= 0);
      if (missing !== -1) {
        toast.error(`Tranche #${missing + 1} is missing an amount`);
        return;
      }
      if (tranchesExceed) {
        toast.error(`Tranche total (₹${tranchesTotal.toLocaleString('en-IN')}) exceeds the invoice total (₹${invoiceTotal.toLocaleString('en-IN')})`);
        return;
      }
    }

    setGenerating(true);
    try {
      const totalAmount = (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive')
        ? subtotal * 1.18
        : subtotal;

      let targetInvoiceNo = (form.invoice_no || '').trim();
      if (genMode === 'create_new_from_edit') {
        targetInvoiceNo = incrementInvoiceNumber(form.invoice_no || editingInvoice?.invoice_no || nextSuggestedNumber);
      } else if (!targetInvoiceNo) {
        targetInvoiceNo = nextSuggestedNumber || incrementInvoiceNumber('');
      }

      const invoiceDateISO = form.invoice_date ? new Date(form.invoice_date).toISOString() : new Date().toISOString();
      const fakePayment = {
        invoice_no: targetInvoiceNo,
        school_id: `custom-${targetInvoiceNo.replace(/[^a-zA-Z0-9]/g, '')}`,
        school_name: form.customer_name,
        amount: totalAmount,
        gst_type: form.gst_type,
        tranche_index: 0,
        tranche_info: '',
        due_date: '',
        status: form.payment_status === 'paid' ? 'paid' : form.payment_status === 'partial' ? 'partial' : 'pending',
        paid_amount: form.payment_status === 'partial' ? Number(form.paid_amount || 0) : (form.payment_status === 'paid' ? totalAmount : 0),
        payment_date: invoiceDateISO,
        qty: valid.reduce((s, r) => s + Number(r.qty || 0), 0),
        tranches: tranches.map((t, i) => ({
          name: (t.name || `Tranche ${i + 1}`).trim(),
          amount: Number(t.amount) || 0,
          due_date: t.due_date || '',
          status: t.status || 'pending',
        })),
      };

      const fakeSchoolData = {
        school_name: form.customer_name,
        state: form.state || 'Maharashtra',
        onboarding_data: {
          payment_mode: 'from_school',
          gst_type: form.gst_type,
        },
      };

      const billAddrLines = [form.address, form.state].filter(Boolean).join(', ');
      const shipName = form.same_ship_to ? form.customer_name : (form.ship_to_name || form.customer_name);
      const shipAddrLines = form.same_ship_to
        ? billAddrLines
        : [form.ship_to_address, form.ship_to_state].filter(Boolean).join(', ');

      const { invoiceNo, base64 } = await generateInvoicePDF(
        fakePayment,
        fakeSchoolData,
        {
          skipDownload: false,
          invoiceNo: targetInvoiceNo,
          customLineItems: valid.map(r => ({
            desc: r.desc,
            qty: Number(r.qty),
            rate: Number(r.rate),
          })),
          billTo: {
            name: form.customer_name,
            address: billAddrLines,
            gstin: form.gstin,
          },
          shipTo: {
            name: shipName,
            address: shipAddrLines,
          },
          placeOfSupply: form.place_of_supply || form.state || 'Maharashtra',
        },
      );

      const effectiveStatus = tranches.length > 0 ? derivedTrancheStatus : form.payment_status;
      const effectivePaid = tranches.length > 0
        ? tranchesPaidSum
        : (form.payment_status === 'partial'
            ? Number(form.paid_amount || 0)
            : (form.payment_status === 'paid' ? totalAmount : 0));

      const payload = {
        invoice_no: invoiceNo,
        customer_name: form.customer_name,
        address: form.address,
        gstin: form.gstin,
        state: form.state,
        gst_type: form.gst_type,
        notes: form.notes,
        place_of_supply: form.place_of_supply,
        ship_to_name: form.same_ship_to ? form.customer_name : form.ship_to_name,
        ship_to_address: form.same_ship_to ? form.address : form.ship_to_address,
        ship_to_state: form.same_ship_to ? form.state : form.ship_to_state,
        line_items: valid.map(r => ({ desc: r.desc, qty: Number(r.qty), rate: Number(r.rate) })),
        total_amount: totalAmount,
        generated_invoice_no: invoiceNo,
        pdf_base64: base64,
        invoice_date: form.invoice_date || today,
        payment_status: effectiveStatus,
        paid_amount: effectivePaid,
        tranches: tranches.map((t, i) => ({
          name: (t.name || `Tranche ${i + 1}`).trim(),
          amount: Number(t.amount || 0),
          due_date: t.due_date || '',
          status: t.status === 'paid' ? 'paid' : 'pending',
        })),
      };

      if (genMode === 'update' && editingInvoice?.id && !editingInvoice.is_school_invoice) {
        await axios.put(`${API}/admin/custom-invoices/${editingInvoice.id}`, payload, { headers: getAuthHeaders() });
        toast.success(`Invoice ${invoiceNo} updated successfully in MongoDB`);
      } else {
        const res = await axios.post(`${API}/admin/custom-invoices`, payload, { headers: getAuthHeaders() });
        const savedNo = res.data?.invoice_no || invoiceNo;
        toast.success(`Custom invoice saved · ${savedNo}`);
        setNextSuggestedNumber(incrementInvoiceNumber(savedNo));
      }

      await loadHistory();
      handleCancelEdit();
    } catch (err) {
      console.error(err);
      toast.error(err?.response?.data?.detail || 'Failed to generate/save custom invoice');
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadHistory = async (id, invoiceNo) => {
    try {
      const res = await axios.get(`${API}/admin/custom-invoices/${id}/pdf`, {
        headers: getAuthHeaders(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(invoiceNo || 'custom_invoice').replace(/\//g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error('Failed to download invoice');
    }
  };

  const handleUpdateStatus = async () => {
    if (!statusEditing) return;
    setSavingStatus(true);
    try {
      const body = {
        payment_status: statusEditing.payment_status,
        paid_amount: statusEditing.payment_status === 'partial'
          ? Number(statusEditing.paid_amount || 0)
          : (statusEditing.payment_status === 'paid' ? Number(statusEditing.total_amount || 0) : 0),
      };
      await axios.patch(`${API}/admin/custom-invoices/${statusEditing.id}/status`, body, { headers: getAuthHeaders() });
      toast.success('Payment status updated');
      setStatusEditing(null);
      await loadHistory();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const statusPill = (row) => {
    const s = row.payment_status || 'pending';
    const map = {
      paid:    { label: 'Paid',    css: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
      partial: { label: 'Partial', css: 'bg-amber-100 text-amber-800 border-amber-300' },
      pending: { label: 'Pending', css: 'bg-slate-100 text-slate-700 border-slate-300' },
    };
    const cfg = map[s] || map.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.css}`}>
        {cfg.label}
        {s === 'partial' && row.paid_amount > 0 && (
          <span className="ml-1 opacity-80">· ₹{Number(row.paid_amount).toLocaleString('en-IN')}</span>
        )}
      </span>
    );
  };

  // Reusable sub-component: Full Details Form (used by both Create and Edit Step 2)
  const renderDetailsForm = () => (
    <div className="space-y-6">
      {/* ── Bill To ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            1. Bill To Information
          </h3>
          <span className="text-[11px] text-slate-400 font-medium">* Required fields</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-700">Customer / Entity Name *</label>
            <Input
              placeholder="e.g. Sunrise Educational Trust / Apex Robotics"
              value={form.customer_name}
              onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
              className="mt-1 text-xs sm:text-sm font-medium"
              data-testid="custom-invoice-customer-name"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">GSTIN (Optional)</label>
            <Input
              placeholder="27XXXXX1234X1ZX"
              value={form.gstin}
              onChange={(e) => setForm(prev => ({ ...prev, gstin: e.target.value }))}
              className="mt-1 text-xs sm:text-sm font-mono"
              data-testid="custom-invoice-gstin"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold text-slate-700">Billing Address</label>
            <Textarea
              placeholder="Full billing street address, area, pin code..."
              value={form.address}
              onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
              rows={2}
              className="mt-1 text-xs sm:text-sm"
              data-testid="custom-invoice-address"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Bill To State</label>
            <select
              value={form.state}
              onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm font-medium"
              data-testid="custom-invoice-state"
            >
              {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">GST Calculation Type</label>
            <select
              value={form.gst_type}
              onChange={(e) => setForm(prev => ({ ...prev, gst_type: e.target.value }))}
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm font-medium"
              data-testid="custom-invoice-gst-type"
            >
              <option value="exclusive_18">Exclusive 18% (add GST on top)</option>
              <option value="inclusive_18">Inclusive 18% (GST included)</option>
              <option value="book_gst_0">Book GST (0% Exempt)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Ship To ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            2. Ship To Information
          </h3>
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-200">
            <input
              type="checkbox"
              checked={form.same_ship_to}
              onChange={(e) => setForm(prev => ({ ...prev, same_ship_to: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
              data-testid="custom-invoice-same-ship-to"
            />
            Same as Bill To
          </label>
        </div>
        {!form.same_ship_to && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Ship To Name / Branch</label>
              <Input
                placeholder="e.g. Sunrise School — Andheri Campus"
                value={form.ship_to_name}
                onChange={(e) => setForm(prev => ({ ...prev, ship_to_name: e.target.value }))}
                className="mt-1 text-xs sm:text-sm"
                data-testid="custom-invoice-ship-to-name"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-700">Ship To Delivery Address</label>
              <Textarea
                placeholder="Full delivery street address"
                value={form.ship_to_address}
                onChange={(e) => setForm(prev => ({ ...prev, ship_to_address: e.target.value }))}
                rows={2}
                className="mt-1 text-xs sm:text-sm"
                data-testid="custom-invoice-ship-to-address"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700">Ship To State</label>
              <select
                value={form.ship_to_state}
                onChange={(e) => setForm(prev => ({ ...prev, ship_to_state: e.target.value }))}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm font-medium"
                data-testid="custom-invoice-ship-to-state"
              >
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* ── Invoice Metadata & Payment Status ─────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="border-b border-slate-100 pb-2.5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            3. Invoice Metadata & Payment Details
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700">Invoice Number *</label>
              {form.invoice_no && (
                <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded font-mono font-bold">
                  {form.invoice_no === nextSuggestedNumber ? 'Auto-sequential' : 'Custom'}
                </span>
              )}
            </div>
            <Input
              placeholder="e.g. OLL2026/CUST-0001"
              value={form.invoice_no || ''}
              onChange={(e) => setForm(prev => ({ ...prev, invoice_no: e.target.value }))}
              className="mt-1 font-mono text-xs font-bold bg-slate-50/50"
              data-testid="custom-invoice-number-input"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Invoice Date *</label>
            <Input
              type="date"
              value={form.invoice_date}
              onChange={(e) => setForm(prev => ({ ...prev, invoice_date: e.target.value }))}
              className="mt-1 text-xs sm:text-sm font-medium"
              data-testid="custom-invoice-date"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">Payment Status *</label>
            <select
              value={form.payment_status}
              onChange={(e) => setForm(prev => ({
                ...prev,
                payment_status: e.target.value,
                paid_amount: e.target.value === 'partial' ? prev.paid_amount : '',
              }))}
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm font-semibold"
              data-testid="custom-invoice-payment-status"
            >
              <option value="pending">Payment Pending</option>
              <option value="paid">Paid (Full)</option>
              <option value="partial">Partially Paid</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700">
              Amount Received{form.payment_status === 'partial' ? ' *' : ' (auto)'}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder={form.payment_status === 'partial' ? 'e.g. 5000' : ''}
              value={
                form.payment_status === 'paid'
                  ? ((subtotal + (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive' ? gstAmount : 0)) || 0).toFixed(2)
                  : form.payment_status === 'pending'
                  ? '0'
                  : form.paid_amount
              }
              disabled={form.payment_status !== 'partial'}
              onChange={(e) => setForm(prev => ({ ...prev, paid_amount: e.target.value }))}
              className="mt-1 font-semibold disabled:opacity-60 text-xs sm:text-sm"
              data-testid="custom-invoice-paid-amount"
            />
            {form.payment_status === 'partial' && Number(form.paid_amount || 0) > 0 && (
              <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                Balance: ₹{Math.max(0, (subtotal + (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive' ? gstAmount : 0)) - Number(form.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Place of Supply (drives GST math) ─────────────────── */}
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              4. Place of Supply & Tax Application *
            </label>
            <p className="text-[11px] text-blue-700 mt-0.5">
              Determines IGST (inter-state) vs CGST + SGST (intra-state inside Maharashtra).
            </p>
          </div>
          <select
            value={form.place_of_supply}
            onChange={(e) => setForm(prev => ({ ...prev, place_of_supply: e.target.value }))}
            className="h-10 px-3 border border-blue-300 rounded-lg bg-white text-xs sm:text-sm font-semibold min-w-[220px]"
            data-testid="custom-invoice-place-of-supply"
          >
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="pt-1 text-[11px] font-bold">
          {isInterstate ? (
            <span className="text-purple-700 bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 inline-block">
              → Inter-state: IGST {gstRate}% applied
            </span>
          ) : (
            <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200 inline-block">
              → Intra-state: CGST {gstRate / 2}% + SGST {gstRate / 2}% applied
            </span>
          )}
        </div>
      </div>

      {/* ── Line Items ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
            5. Line Items & Pricing
          </h3>
          <Button
            type="button"
            size="sm"
            onClick={() => setItems(prev => [...prev, emptyRow()])}
            className="h-8 text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100"
            data-testid="custom-invoice-add-row"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Line Item
          </Button>
        </div>

        <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr className="text-left text-xs font-bold text-slate-700">
                <th className="px-3 py-2.5">Item Description *</th>
                <th className="px-3 py-2.5 w-24 text-center">Qty *</th>
                <th className="px-3 py-2.5 w-36 text-right">Rate (₹) *</th>
                <th className="px-3 py-2.5 w-36 text-right">Line Total</th>
                <th className="px-2 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((row, idx) => {
                const amt = (Number(row.qty || 0) * Number(row.rate || 0)).toFixed(2);
                return (
                  <tr key={idx} className="hover:bg-slate-50/60 transition">
                    <td className="px-2.5 py-2">
                      <Input
                        placeholder="e.g. AI & Robotics Curriculum Kit / Workshop Fee"
                        value={row.desc}
                        onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, desc: e.target.value } : r))}
                        className="text-xs sm:text-sm"
                        data-testid={`custom-invoice-desc-${idx}`}
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="1"
                        value={row.qty}
                        onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                        className="text-center text-xs sm:text-sm font-semibold"
                        data-testid={`custom-invoice-qty-${idx}`}
                      />
                    </td>
                    <td className="px-2.5 py-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={row.rate}
                        onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, rate: e.target.value } : r))}
                        className="text-right text-xs sm:text-sm font-semibold font-mono"
                        data-testid={`custom-invoice-rate-${idx}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-bold font-mono text-slate-800">
                      ₹{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-2 py-2 text-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700 rounded-md transition"
                          title="Remove item"
                          data-testid={`custom-invoice-remove-row-${idx}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 border-t-2 border-slate-200">
              <tr>
                <td colSpan={3} className="px-4 py-2.5 text-right text-xs font-semibold text-slate-600">Subtotal:</td>
                <td className="px-3 py-2.5 text-right font-bold font-mono text-slate-900">
                  ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </td>
                <td />
              </tr>
              {(form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') && (
                <>
                  {isInterstate ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-slate-600 font-medium">IGST @ 18%:</td>
                      <td className="px-3 py-1.5 text-right font-semibold font-mono text-slate-700">
                        ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td />
                    </tr>
                  ) : (
                    <>
                      <tr>
                        <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-slate-600 font-medium">CGST @ 9%:</td>
                        <td className="px-3 py-1.5 text-right font-semibold font-mono text-slate-700">
                          ₹{(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-4 py-1.5 text-right text-xs text-slate-600 font-medium">SGST @ 9%:</td>
                        <td className="px-3 py-1.5 text-right font-semibold font-mono text-slate-700">
                          ₹{(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                    </>
                  )}
                  <tr className="border-t border-slate-200 bg-emerald-50/50">
                    <td colSpan={3} className="px-4 py-3 text-right text-sm font-bold text-slate-900">Grand Total (incl. GST):</td>
                    <td className="px-3 py-3 text-right font-extrabold text-base font-mono text-emerald-800">
                      ₹{(subtotal + gstAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                </>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Payment Tranches (optional) ─────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4" data-testid="custom-invoice-tranches">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 flex-wrap gap-2">
          <div>
            <h3 className="text-xs uppercase tracking-wider font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block"></span>
              6. Payment Tranches <span className="text-slate-400 normal-case font-medium">· Optional schedule</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Break payments into installments (e.g. 1st installment ₹20,000, 2nd installment ₹30,000).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTranche}
            disabled={invoiceTotal <= 0 || tranchesRemaining <= 0}
            className="h-8 text-xs font-semibold"
            data-testid="custom-invoice-add-tranche"
          >
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Installment
          </Button>
        </div>

        {tranches.length === 0 ? (
          <div className="text-xs text-slate-500 italic bg-slate-50 border border-dashed border-slate-200 rounded-lg p-3 text-center">
            No installments configured — the full invoice amount will be paid in a single payment.
          </div>
        ) : (
          <div className="space-y-3">
            {tranches.map((t, idx) => (
              <div
                key={t.id}
                className="grid grid-cols-12 gap-3 items-center bg-slate-50 border border-slate-200 rounded-lg p-3"
                data-testid={`custom-invoice-tranche-row-${idx}`}
              >
                <div className="col-span-12 md:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Name / Label</label>
                  <Input
                    value={t.name}
                    onChange={(e) => updateTranche(t.id, { name: e.target.value })}
                    placeholder={`Tranche ${idx + 1}`}
                    className="mt-0.5 h-9 text-xs"
                    data-testid={`custom-invoice-tranche-name-${idx}`}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Amount (₹) *</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={t.amount}
                    onChange={(e) => updateTranche(t.id, { amount: e.target.value })}
                    placeholder="0.00"
                    className="mt-0.5 h-9 text-xs font-mono font-semibold"
                    data-testid={`custom-invoice-tranche-amount-${idx}`}
                  />
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Due Date</label>
                  <Input
                    type="date"
                    value={t.due_date}
                    onChange={(e) => updateTranche(t.id, { due_date: e.target.value })}
                    className="mt-0.5 h-9 text-xs"
                    data-testid={`custom-invoice-tranche-due-${idx}`}
                  />
                </div>
                <div className="col-span-10 md:col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Status</label>
                  <select
                    value={t.status}
                    onChange={(e) => updateTranche(t.id, { status: e.target.value })}
                    className={`mt-0.5 h-9 w-full px-2 rounded-md border text-xs font-semibold ${
                      t.status === 'paid'
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-amber-300 bg-amber-50 text-amber-800'
                    }`}
                    data-testid={`custom-invoice-tranche-status-${idx}`}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeTranche(t.id)}
                    className="h-9 w-9 rounded-md border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center justify-center transition"
                    data-testid={`custom-invoice-tranche-remove-${idx}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}

            {/* Tranches Summary */}
            <div className={`rounded-xl border p-3.5 text-xs ${tranchesExceed ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Total Invoice Amount</span>
                  <p className="font-bold text-slate-900 mt-0.5" data-testid="custom-invoice-tranche-invoice-total">
                    ₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Tranches Total</span>
                  <p className={`font-bold mt-0.5 ${tranchesExceed ? 'text-red-700' : 'text-slate-900'}`} data-testid="custom-invoice-tranche-sum">
                    ₹{tranchesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Remaining</span>
                  <p className={`font-bold mt-0.5 ${tranchesRemaining === 0 && !tranchesExceed ? 'text-emerald-700' : 'text-slate-900'}`} data-testid="custom-invoice-tranche-remaining">
                    ₹{tranchesRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Paid Installments</span>
                  <p className="font-bold text-emerald-700 mt-0.5" data-testid="custom-invoice-tranche-paid">
                    ₹{tranchesPaidSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Internal Notes ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-2">
        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          7. Internal Reference Notes <span className="text-slate-400 font-normal lowercase">(not shown on printed PDF)</span>
        </label>
        <Textarea
          placeholder="Add any internal notes, payment transaction reference, or customer agreement terms..."
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          rows={2}
          className="text-xs sm:text-sm"
        />
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent
        className="max-w-5xl w-full max-h-[94vh] flex flex-col p-0 overflow-hidden bg-slate-50 border border-slate-200 shadow-2xl rounded-2xl"
        data-testid="custom-invoice-modal"
      >
        {/* ── Sticky Top Header with 2 Prominent Mode Buttons ──────── */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${mode === 'edit' ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
              {mode === 'edit' ? <Edit3 className="w-5 h-5" /> : <FilePlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                {mode === 'edit'
                  ? (editStep === 1 ? 'Edit Invoice' : `Editing Invoice: ${editingInvoice?.invoice_no || form.invoice_no}`)
                  : 'Create Custom Invoice'}
              </h2>
              <p className="text-xs text-slate-500">
                {mode === 'edit'
                  ? (editStep === 1 ? 'Step 1 of 2: Enter invoice number to verify' : 'Step 2 of 2: Edit invoice details and save changes')
                  : 'Generate custom invoices with automated GST calculation and stored PDF'}
              </p>
            </div>
          </div>

          {/* 2 Main Buttons Toggle in Header */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={handleSwitchToCreate}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                mode === 'create'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FilePlus className="w-3.5 h-3.5" />
              <span>Create Custom Invoice</span>
            </button>
            <button
              type="button"
              onClick={handleSwitchToEdit}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                mode === 'edit'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Edit Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-1 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ──────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ═══════════ EDIT MODE: STEP 1 (Enter Invoice Number Only) ═══════════ */}
          {mode === 'edit' && editStep === 1 && (
            <div className="max-w-xl mx-auto space-y-6 py-6 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-7 space-y-5 text-center">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
                  <Receipt className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Step 1: Enter Invoice Number</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Enter the invoice number below. If it is valid and present in our records, the second form will open with all details ready for editing.
                  </p>
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLookupInvoice(searchInvoiceNo);
                  }}
                  className="space-y-4 text-left pt-2"
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Invoice Number *
                    </label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <Input
                        autoFocus
                        placeholder="e.g. OLL2026/CUST-0001, 1100..."
                        value={searchInvoiceNo}
                        onChange={(e) => {
                          setSearchInvoiceNo(e.target.value);
                          if (lookupError) setLookupError('');
                        }}
                        className={`pl-10 h-11 text-sm font-mono font-bold ${
                          lookupError ? 'border-red-400 ring-2 ring-red-100 bg-red-50/30' : 'border-slate-300'
                        }`}
                        data-testid="custom-invoice-lookup-input"
                      />
                    </div>
                  </div>

                  {/* Validation / Not Found Message */}
                  {lookupError && (
                    <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-bold">{lookupError}</p>
                        <p className="text-[11px] text-red-600 mt-0.5">
                          Please verify the number or select an existing invoice from the list below.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSwitchToCreate}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      ← Switch to Create
                    </Button>
                    <Button
                      type="submit"
                      disabled={loadingInvoice || !searchInvoiceNo.trim()}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs px-5 h-10 shadow-sm"
                      data-testid="custom-invoice-lookup-btn"
                    >
                      {loadingInvoice ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Checking Database…
                        </>
                      ) : (
                        <>
                          Verify & Proceed to Edit
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </div>

              {/* Quick Pick from Existing Invoices */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Or Pick Directly From Existing Invoices
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">{history.length} records</span>
                </div>

                {loadingHistory ? (
                  <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" /> Loading records…
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No invoices recorded yet.</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {history.map(row => (
                      <div
                        key={row.id}
                        onClick={() => {
                          setSearchInvoiceNo(row.invoice_no);
                          handleLookupInvoice(row.invoice_no);
                        }}
                        className="p-3 hover:bg-amber-50/60 cursor-pointer transition flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 shrink-0">
                            {row.invoice_no}
                          </span>
                          <span className="font-semibold text-slate-800 truncate">{row.customer_name}</span>
                          {statusPill(row)}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-slate-900 font-mono">
                            ₹{Number(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] font-semibold text-amber-700 border-amber-300 hover:bg-amber-100"
                          >
                            Edit →
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════ EDIT MODE: STEP 2 (Edit Invoice Details) ═══════════ */}
          {mode === 'edit' && editStep === 2 && editingInvoice && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Top Banner for Step 2 */}
              <div
                className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                data-testid="custom-invoice-edit-banner"
              >
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-200 text-amber-900 uppercase tracking-wide">
                    Step 2: Editing Details
                  </span>
                  <span className="font-mono font-bold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-amber-300 text-sm">
                    {editingInvoice.invoice_no}
                  </span>
                  <span className="text-slate-600 text-xs font-medium">
                    Customer: <strong className="text-slate-900">{form.customer_name || 'N/A'}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBackToStep1}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 flex items-center gap-1 transition"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-amber-600" />
                    Enter Different Invoice Number
                  </button>
                  <button
                    type="button"
                    onClick={() => handleViewAuditHistory(editingInvoice)}
                    className="text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-800 flex items-center gap-1 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    View Change History
                  </button>
                </div>
              </div>

              {/* The Edit Form */}
              {renderDetailsForm()}
            </div>
          )}

          {/* ═══════════ CREATE MODE ═══════════ */}
          {mode === 'create' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Create Header Banner */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-indigo-200 text-indigo-900 uppercase tracking-wide">
                    New Invoice
                  </span>
                  <span className="text-xs text-indigo-950 font-medium">
                    Target Invoice Number: <strong className="font-mono font-bold">{form.invoice_no || nextSuggestedNumber || 'OLL2026/CUST-0001'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchToEdit}
                  className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 underline flex items-center gap-1 self-start sm:self-auto"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Have an existing invoice to edit? Click here
                </button>
              </div>

              {/* The Create Form */}
              {renderDetailsForm()}

              {/* History Table below Create Form */}
              <div className="pt-6 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    Recent Custom Invoices
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">{history.length} invoices generated</span>
                </div>

                {loadingHistory ? (
                  <div className="flex items-center gap-2 py-4 text-xs text-slate-500 justify-center">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                    <span>Loading recent invoices…</span>
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No custom invoices created yet.</p>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto shadow-sm">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 sticky top-0 border-b border-slate-200">
                        <tr className="text-left text-slate-700 font-semibold">
                          <th className="px-3 py-2.5">Invoice #</th>
                          <th className="px-3 py-2.5">Customer</th>
                          <th className="px-3 py-2.5 text-right">Total</th>
                          <th className="px-3 py-2.5">Date</th>
                          <th className="px-3 py-2.5">Status</th>
                          <th className="px-3 py-2.5">Updated By</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {history.map(row => (
                          <tr key={row.id} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-2 font-mono font-bold text-slate-900">{row.invoice_no}</td>
                            <td className="px-3 py-2 font-medium text-slate-800">{row.customer_name}</td>
                            <td className="px-3 py-2 text-right font-bold font-mono">
                              ₹{Number(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="px-3 py-2 text-slate-500">
                              {(row.invoice_date || row.created_at) ? new Date(row.invoice_date || row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                            </td>
                            <td className="px-3 py-2">{statusPill(row)}</td>
                            <td className="px-3 py-2 text-slate-600">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-slate-700">
                                  {row.updated_by_name || row.created_by_name || row.updated_by || row.created_by || 'Admin'}
                                </span>
                                {(row.updated_by_user_type === 'accountant' || row.created_by_user_type === 'accountant') && (
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    Accountant
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setMode('edit');
                                  handleLookupInvoice(row.invoice_no);
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 mr-1.5 font-semibold text-[11px] transition"
                                data-testid={`custom-invoice-edit-${row.id}`}
                                title="Edit this invoice"
                              >
                                <Edit3 className="w-3 h-3 text-amber-600" /> Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleViewAuditHistory(row)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 mr-1.5 font-medium text-[11px] transition"
                                data-testid={`custom-invoice-audit-${row.id}`}
                                title="View audit logs in MongoDB"
                              >
                                <Clock className="w-3 h-3 text-slate-500" /> History
                              </button>
                              <button
                                type="button"
                                onClick={() => setStatusEditing({
                                  id: row.id,
                                  total_amount: row.total_amount,
                                  payment_status: row.payment_status || 'pending',
                                  paid_amount: row.paid_amount || '',
                                })}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 mr-1.5 font-medium text-[11px] transition"
                                data-testid={`custom-invoice-edit-status-${row.id}`}
                              >
                                Status
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadHistory(row.id, row.invoice_no)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium text-[11px] transition"
                                data-testid={`custom-invoice-download-${row.id}`}
                              >
                                <Download className="w-3 h-3 text-indigo-600" /> PDF
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Sticky Modal Footer with Actions ─────────────────────── */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 sticky bottom-0 z-20 shadow-sm">
          {/* Live totals */}
          <div className="text-xs flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-slate-500">Subtotal: </span>
              <span className="font-bold text-slate-800 font-mono">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {(form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') && (
              <div>
                <span className="text-slate-500">GST (18%): </span>
                <span className="font-bold text-slate-800 font-mono">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="pl-3 border-l border-slate-200">
              <span className="text-slate-500">Grand Total: </span>
              <span className="font-extrabold text-emerald-700 text-sm font-mono">
                ₹{(subtotal + ((form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') ? gstAmount : 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {mode === 'edit' && editStep === 2 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBackToStep1}
                className="text-xs font-semibold text-slate-700 border-slate-300"
              >
                ← Back to Step 1
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClose} className="text-xs font-medium" data-testid="custom-invoice-cancel">
              Close
            </Button>

            {mode === 'edit' && editStep === 2 ? (
              <>
                <Button
                  size="sm"
                  onClick={() => handleGenerate('create_new_from_edit')}
                  disabled={generating}
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
                  data-testid="custom-invoice-generate-new-btn"
                  title="Generate as a new invoice with next sequential number"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 mr-1.5" />}
                  Clone as New
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleGenerate('update')}
                  disabled={generating}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-sm"
                  data-testid="custom-invoice-update-btn"
                  title="Save edits to this existing invoice"
                >
                  {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                  {generating ? 'Saving…' : `Save & Update Invoice (${form.invoice_no || editingInvoice.invoice_no})`}
                </Button>
              </>
            ) : mode === 'create' ? (
              <Button
                size="sm"
                onClick={() => handleGenerate('create')}
                disabled={generating}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-sm"
                data-testid="custom-invoice-generate-btn"
              >
                {generating ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                {generating ? 'Generating…' : 'Generate & Download PDF'}
              </Button>
            ) : null}
          </div>
        </div>

        {/* ── Status Editing Modal Sheet ───────────────────────────── */}
        {statusEditing && (
          <div
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
            onClick={() => !savingStatus && setStatusEditing(null)}
            data-testid="custom-invoice-status-editor-backdrop"
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
              data-testid="custom-invoice-status-editor"
            >
              <div>
                <h3 className="text-base font-bold text-slate-900">Update Payment Status</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Invoice Total: <strong className="font-mono text-slate-800">₹{Number(statusEditing.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Payment Status *</label>
                  <select
                    value={statusEditing.payment_status}
                    onChange={(e) => setStatusEditing(prev => ({
                      ...prev,
                      payment_status: e.target.value,
                      paid_amount: e.target.value === 'partial' ? prev.paid_amount : '',
                    }))}
                    className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs sm:text-sm font-semibold"
                    data-testid="custom-invoice-edit-status-select"
                  >
                    <option value="pending">Payment Pending</option>
                    <option value="paid">Paid (Full)</option>
                    <option value="partial">Partially Paid</option>
                  </select>
                </div>
                {statusEditing.payment_status === 'partial' && (
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Amount Received *</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={statusEditing.paid_amount}
                      onChange={(e) => setStatusEditing(prev => ({ ...prev, paid_amount: e.target.value }))}
                      className="mt-1 font-mono font-semibold"
                      data-testid="custom-invoice-edit-status-amount"
                    />
                    {Number(statusEditing.paid_amount || 0) > 0 && (
                      <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                        Balance: ₹{Math.max(0, Number(statusEditing.total_amount || 0) - Number(statusEditing.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStatusEditing(null)}
                  disabled={savingStatus}
                  data-testid="custom-invoice-edit-status-cancel"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleUpdateStatus}
                  disabled={savingStatus || (statusEditing.payment_status === 'partial' && !(Number(statusEditing.paid_amount) > 0))}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                  data-testid="custom-invoice-edit-status-save"
                >
                  {savingStatus ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : null}
                  Save Status
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit Trail Modal ────────────────────────────────────── */}
        <Dialog open={!!auditModalData} onOpenChange={() => setAuditModalData(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Audit Trail & Changes · {auditModalData?.invoice_no}
                </h3>
              </div>
            </div>

            {auditModalData?.loading ? (
              <div className="py-8 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading change history from MongoDB…</span>
              </div>
            ) : (!auditModalData?.logs || auditModalData.logs.length === 0) ? (
              <p className="py-6 text-center text-xs text-slate-500 italic">No change history recorded yet for this invoice.</p>
            ) : (
              <div className="space-y-3 py-2">
                {auditModalData.logs.map((log, idx) => (
                  <div key={log.id || idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-500 text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800">
                          {log.updated_by?.name || log.updated_by?.email || 'System'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          log.updated_by?.user_type === 'accountant'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        }`}>
                          {log.updated_by?.user_type === 'accountant' ? 'Accountant' : (log.updated_by?.role || 'Admin')}
                        </span>
                      </div>
                      <span>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN', {
                          day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                        }) : ''}
                      </span>
                    </div>
                    <p className="text-slate-800 font-semibold">{log.summary}</p>
                    {log.changes && Object.keys(log.changes).length > 0 && log.action !== 'create' && (
                      <div className="mt-2 pt-2 border-t border-slate-200 grid grid-cols-1 gap-1.5 text-[11px]">
                        {Object.entries(log.changes).map(([k, v]) => (
                          <div key={k} className="flex items-start gap-2 bg-white p-1.5 rounded border border-slate-100">
                            <span className="font-mono text-slate-500 min-w-28 capitalize">{k.replace(/_/g, ' ')}:</span>
                            <span className="text-rose-600 line-through max-w-xs truncate">
                              {typeof v?.old === 'object' ? JSON.stringify(v?.old) : String(v?.old ?? 'None')}
                            </span>
                            <span className="text-slate-400">→</span>
                            <span className="text-emerald-700 font-medium max-w-xs truncate">
                              {typeof v?.new === 'object' ? JSON.stringify(v?.new) : String(v?.new ?? 'None')}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
