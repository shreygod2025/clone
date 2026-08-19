import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, Download, FileText, Loader2, CheckCircle2, Clock } from 'lucide-react';
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('oll_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomInvoiceModal({ open, onClose }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
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

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await axios.get(`${API}/admin/custom-invoices?limit=50`, { headers: getAuthHeaders() });
      setHistory(res.data?.rows || []);
    } catch (err) {
      console.error('Failed to load custom invoices:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  // Live totals
  const subtotal = items.reduce((s, r) => {
    const q = Number(r.qty || 0);
    const rate = Number(r.rate || 0);
    return s + q * rate;
  }, 0);

  // Inter-state vs intra-state. If place_of_supply is outside Maharashtra → IGST,
  // else CGST + SGST split. (Our company is registered in Maharashtra.)
  const isInterstate = (form.place_of_supply || '').toLowerCase() !== 'maharashtra';
  const gstRate = (form.gst_type === 'book_gst_0') ? 0 : 18;
  const gstAmount = (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive')
    ? subtotal * (gstRate / 100)
    : 0;

  // Invoice grand total — used by the Payment Tranches feature to cap sum
  const invoiceTotal = subtotal + ((form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') ? gstAmount : 0);

  // ── Payment Tranches math ─────────────────────────────────────────────
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

  const handleGenerate = async () => {
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
    // Payment Tranches — optional block: validate only if user added any
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
      // For exclusive_18 the payment.amount must equal the INCLUSIVE total
      // (base + 18%). For inclusive_18 the rates already include GST. For
      // book_gst_0 there's no GST.
      const totalAmount = (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive')
        ? subtotal * 1.18
        : subtotal;

      // Fabricate payment + schoolData structures the existing PDF generator understands.
      const fakeSchoolId = `custom-${Date.now()}`;
      // The PDF generator uses `payment.payment_date` as the invoice date.
      // Convert YYYY-MM-DD → ISO so the toLocaleDateString call renders correctly.
      const invoiceDateISO = form.invoice_date ? new Date(form.invoice_date).toISOString() : new Date().toISOString();
      const fakePayment = {
        school_id: fakeSchoolId,
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
      };
      // The schoolData is now mostly a carrier — billTo / shipTo overrides drive
      // the actual rendering. We still pass state so it's available as fallback.
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

      // Persist to backend so admin can re-download later
      try {
        // When tranches are used, they take precedence for paid amount + status
        const effectiveStatus = tranches.length > 0 ? derivedTrancheStatus : form.payment_status;
        const effectivePaid = tranches.length > 0
          ? tranchesPaidSum
          : (form.payment_status === 'partial'
              ? Number(form.paid_amount || 0)
              : (form.payment_status === 'paid' ? totalAmount : 0));

        await axios.post(`${API}/admin/custom-invoices`, {
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
          // Invoice metadata
          invoice_date: form.invoice_date || today,
          payment_status: effectiveStatus,
          paid_amount: effectivePaid,
          // Payment tranches (optional)
          tranches: tranches.map((t, i) => ({
            name: (t.name || `Tranche ${i + 1}`).trim(),
            amount: Number(t.amount || 0),
            due_date: t.due_date || '',
            status: t.status === 'paid' ? 'paid' : 'pending',
          })),
        }, { headers: getAuthHeaders() });
        toast.success(`Custom invoice saved · ${invoiceNo}`);
      } catch (saveErr) {
        console.warn('Save failed (download succeeded):', saveErr);
        toast.warning('PDF downloaded but failed to save to history');
      }

      // Refresh history
      await loadHistory();

      // Reset form so admin can punch in the next one quickly
      setForm({
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
    } catch (err) {
      console.error(err);
      toast.error('Failed to generate custom invoice');
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
      paid:    { label: 'Paid',    css: 'bg-emerald-100 text-emerald-800' },
      partial: { label: 'Partial', css: 'bg-amber-100 text-amber-800' },
      pending: { label: 'Pending', css: 'bg-slate-100 text-slate-700' },
    };
    const cfg = map[s] || map.pending;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.css}`}>
        {cfg.label}
        {s === 'partial' && row.paid_amount > 0 && (
          <span className="ml-1 opacity-80">· ₹{Number(row.paid_amount).toLocaleString('en-IN')}</span>
        )}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose?.()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto" data-testid="custom-invoice-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            Create Custom Invoice
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* ── Bill To ────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Bill To</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Customer Name *</label>
                <Input
                  placeholder="e.g. Sunrise Educational Trust"
                  value={form.customer_name}
                  onChange={(e) => setForm(prev => ({ ...prev, customer_name: e.target.value }))}
                  className="mt-1"
                  data-testid="custom-invoice-customer-name"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">GSTIN (optional)</label>
                <Input
                  placeholder="27XXXXX1234X1ZX"
                  value={form.gstin}
                  onChange={(e) => setForm(prev => ({ ...prev, gstin: e.target.value }))}
                  className="mt-1"
                  data-testid="custom-invoice-gstin"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-slate-700">Bill To Address</label>
                <Textarea
                  placeholder="Full billing address"
                  value={form.address}
                  onChange={(e) => setForm(prev => ({ ...prev, address: e.target.value }))}
                  rows={2}
                  className="mt-1"
                  data-testid="custom-invoice-address"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Bill To State</label>
                <select
                  value={form.state}
                  onChange={(e) => setForm(prev => ({ ...prev, state: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                  data-testid="custom-invoice-state"
                >
                  {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">GST Type</label>
                <select
                  value={form.gst_type}
                  onChange={(e) => setForm(prev => ({ ...prev, gst_type: e.target.value }))}
                  className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                  data-testid="custom-invoice-gst-type"
                >
                  <option value="exclusive_18">Exclusive 18% (add GST on top)</option>
                  <option value="inclusive_18">Inclusive 18%</option>
                  <option value="book_gst_0">Book GST (0%)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Ship To ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">Ship To</h3>
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={form.same_ship_to}
                  onChange={(e) => setForm(prev => ({ ...prev, same_ship_to: e.target.checked }))}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  data-testid="custom-invoice-same-ship-to"
                />
                Same as Bill To
              </label>
            </div>
            {!form.same_ship_to && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Ship To Name</label>
                  <Input
                    placeholder="e.g. Sunrise School — Andheri Branch"
                    value={form.ship_to_name}
                    onChange={(e) => setForm(prev => ({ ...prev, ship_to_name: e.target.value }))}
                    className="mt-1"
                    data-testid="custom-invoice-ship-to-name"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-slate-700">Ship To Address</label>
                  <Textarea
                    placeholder="Full delivery address"
                    value={form.ship_to_address}
                    onChange={(e) => setForm(prev => ({ ...prev, ship_to_address: e.target.value }))}
                    rows={2}
                    className="mt-1"
                    data-testid="custom-invoice-ship-to-address"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700">Ship To State</label>
                  <select
                    value={form.ship_to_state}
                    onChange={(e) => setForm(prev => ({ ...prev, ship_to_state: e.target.value }))}
                    className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                    data-testid="custom-invoice-ship-to-state"
                  >
                    {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* ── Invoice Date & Payment Status ─────────────────────── */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-2">Invoice Metadata</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-700">Invoice Date *</label>
                <Input
                  type="date"
                  value={form.invoice_date}
                  onChange={(e) => setForm(prev => ({ ...prev, invoice_date: e.target.value }))}
                  className="mt-1"
                  data-testid="custom-invoice-date"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">Payment Status *</label>
                <select
                  value={form.payment_status}
                  onChange={(e) => setForm(prev => ({
                    ...prev,
                    payment_status: e.target.value,
                    paid_amount: e.target.value === 'partial' ? prev.paid_amount : '',
                  }))}
                  className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                  data-testid="custom-invoice-payment-status"
                >
                  <option value="pending">Payment Pending</option>
                  <option value="paid">Paid</option>
                  <option value="partial">Partially Paid</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-slate-700">
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
                  className="mt-1 disabled:opacity-60"
                  data-testid="custom-invoice-paid-amount"
                />
                {form.payment_status === 'partial' && Number(form.paid_amount || 0) > 0 && (
                  <p className="text-[11px] text-emerald-700 mt-1">
                    Balance: ₹{Math.max(0, (subtotal + (form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive' ? gstAmount : 0)) - Number(form.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Payment Tranches (optional) ─────────────────────────── */}
          <div className="rounded-lg border border-slate-200 bg-white p-3" data-testid="custom-invoice-tranches">
            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
              <div>
                <h3 className="text-xs uppercase tracking-wider font-semibold text-slate-500">
                  Payment Tranches <span className="text-slate-400 normal-case tracking-normal font-normal">· optional</span>
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Break the total into scheduled tranches (e.g. 1st ₹20,000, 2nd ₹30,000, 3rd ₹50,000). Skip this for a single-payment invoice.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTranche}
                disabled={invoiceTotal <= 0 || tranchesRemaining <= 0}
                data-testid="custom-invoice-add-tranche"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Tranche
              </Button>
            </div>

            {tranches.length === 0 ? (
              <div className="text-[11px] text-slate-500 italic bg-slate-50 border border-dashed border-slate-200 rounded-md px-3 py-2">
                No tranches yet — the full invoice amount will be treated as one payment.
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {tranches.map((t, idx) => {
                    const amt = Number(t.amount || 0);
                    return (
                      <div
                        key={t.id}
                        className="grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-md px-2 py-2"
                        data-testid={`custom-invoice-tranche-row-${idx}`}
                      >
                        <div className="col-span-12 md:col-span-3">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Name/Number</label>
                          <Input
                            value={t.name}
                            onChange={(e) => updateTranche(t.id, { name: e.target.value })}
                            placeholder={`Tranche ${idx + 1}`}
                            className="mt-0.5 h-9"
                            data-testid={`custom-invoice-tranche-name-${idx}`}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Amount (₹) *</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={t.amount}
                            onChange={(e) => updateTranche(t.id, { amount: e.target.value })}
                            placeholder="0.00"
                            className="mt-0.5 h-9"
                            data-testid={`custom-invoice-tranche-amount-${idx}`}
                          />
                        </div>
                        <div className="col-span-6 md:col-span-3">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Due Date</label>
                          <Input
                            type="date"
                            value={t.due_date}
                            onChange={(e) => updateTranche(t.id, { due_date: e.target.value })}
                            className="mt-0.5 h-9"
                            data-testid={`custom-invoice-tranche-due-${idx}`}
                          />
                        </div>
                        <div className="col-span-10 md:col-span-2">
                          <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</label>
                          <select
                            value={t.status}
                            onChange={(e) => updateTranche(t.id, { status: e.target.value })}
                            className={`mt-0.5 h-9 w-full px-2 rounded-md border text-xs font-medium ${
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
                            className="h-9 w-9 rounded-md border border-slate-200 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200 inline-flex items-center justify-center"
                            aria-label={`Remove tranche ${idx + 1}`}
                            data-testid={`custom-invoice-tranche-remove-${idx}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {amt > 0 && (
                          <div className="col-span-12 flex flex-wrap items-center justify-between gap-2 pl-1">
                            <div className="text-[11px] text-slate-500">
                              {t.status === 'paid' ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Marked as paid</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700"><Clock className="w-3 h-3" /> Awaiting payment</span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {invoiceTotal > 0 && (
                                <span>{((amt / invoiceTotal) * 100).toFixed(1)}% of invoice</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live summary */}
                <div className={`mt-3 rounded-md border px-3 py-2 text-xs ${tranchesExceed ? 'bg-red-50 border-red-200 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Total Amount</div>
                      <div className="font-semibold text-slate-900" data-testid="custom-invoice-tranche-invoice-total">
                        ₹{invoiceTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Tranche Total</div>
                      <div className={`font-semibold ${tranchesExceed ? 'text-red-700' : 'text-slate-900'}`} data-testid="custom-invoice-tranche-sum">
                        ₹{tranchesTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Remaining</div>
                      <div className={`font-semibold ${tranchesRemaining === 0 && !tranchesExceed ? 'text-emerald-700' : 'text-slate-900'}`} data-testid="custom-invoice-tranche-remaining">
                        ₹{tranchesRemaining.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Paid via Tranches</div>
                      <div className="font-semibold text-emerald-700" data-testid="custom-invoice-tranche-paid">
                        ₹{tranchesPaidSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>
                  {tranchesExceed && (
                    <div className="mt-2 text-[11px] font-medium">
                      Tranche total exceeds the invoice total by ₹{(tranchesTotal - invoiceTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}. Adjust amounts before generating.
                    </div>
                  )}
                  {!tranchesExceed && derivedTrancheStatus && (
                    <div className="mt-2 text-[11px] text-slate-600">
                      Auto-derived payment status: <strong className="uppercase tracking-wide">{derivedTrancheStatus}</strong>
                      {derivedTrancheStatus !== 'pending' && (
                        <span> · Amount received (from paid tranches): <strong>₹{tranchesPaidSum.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* ── Place of Supply (drives GST math) ─────────────────── */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="text-xs font-medium text-blue-900">Place of Supply *</label>
                <p className="text-[11px] text-blue-700 mt-0.5">
                  Selecting a state other than Maharashtra applies <strong>IGST 18%</strong> (inter-state).
                  Maharashtra applies <strong>CGST 9% + SGST 9%</strong> (intra-state).
                </p>
              </div>
              <select
                value={form.place_of_supply}
                onChange={(e) => setForm(prev => ({ ...prev, place_of_supply: e.target.value }))}
                className="h-10 px-3 border border-blue-300 rounded-lg bg-white text-sm font-medium min-w-[200px]"
                data-testid="custom-invoice-place-of-supply"
              >
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="mt-2 text-[11px] font-medium">
              {isInterstate ? (
                <span className="text-purple-700">→ Inter-state · IGST {gstRate}% will apply</span>
              ) : (
                <span className="text-emerald-700">→ Intra-state · CGST {gstRate / 2}% + SGST {gstRate / 2}% will apply</span>
              )}
            </p>
          </div>


          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Line Items</label>
              <button
                type="button"
                onClick={() => setItems(prev => [...prev, emptyRow()])}
                className="inline-flex items-center gap-1.5 px-3 h-8 text-xs font-medium rounded-md border border-slate-200 bg-white hover:bg-slate-50"
                data-testid="custom-invoice-add-row"
              >
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            </div>
            <div className="rounded-lg border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-xs font-medium text-slate-600">
                    <th className="px-3 py-2">Description *</th>
                    <th className="px-3 py-2 w-24 text-center">Qty *</th>
                    <th className="px-3 py-2 w-32 text-right">Rate (₹) *</th>
                    <th className="px-3 py-2 w-32 text-right">Amount</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row, idx) => {
                    const amt = (Number(row.qty || 0) * Number(row.rate || 0)).toFixed(2);
                    return (
                      <tr key={idx} className="border-t border-slate-100">
                        <td className="px-2 py-1.5">
                          <Input
                            placeholder="Robotics Lab Setup"
                            value={row.desc}
                            onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, desc: e.target.value } : r))}
                            data-testid={`custom-invoice-desc-${idx}`}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            placeholder="1"
                            value={row.qty}
                            onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                            className="text-center"
                            data-testid={`custom-invoice-qty-${idx}`}
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0.00"
                            value={row.rate}
                            onChange={(e) => setItems(prev => prev.map((r, i) => i === idx ? { ...r, rate: e.target.value } : r))}
                            className="text-right"
                            data-testid={`custom-invoice-rate-${idx}`}
                          />
                        </td>
                        <td className="px-3 py-1.5 text-right font-medium text-slate-800">
                          ₹{Number(amt).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-2 py-1.5">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
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
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-xs font-medium text-slate-600">Subtotal</td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-800">
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td />
                  </tr>
                  {(form.gst_type === 'exclusive_18' || form.gst_type === 'exclusive') && (
                    <>
                      {isInterstate ? (
                        <tr>
                          <td colSpan={3} className="px-3 py-1 text-right text-xs text-slate-600">IGST @ 18%</td>
                          <td className="px-3 py-1 text-right text-slate-700">
                            ₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td />
                        </tr>
                      ) : (
                        <>
                          <tr>
                            <td colSpan={3} className="px-3 py-1 text-right text-xs text-slate-600">CGST @ 9%</td>
                            <td className="px-3 py-1 text-right text-slate-700">
                              ₹{(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td />
                          </tr>
                          <tr>
                            <td colSpan={3} className="px-3 py-1 text-right text-xs text-slate-600">SGST @ 9%</td>
                            <td className="px-3 py-1 text-right text-slate-700">
                              ₹{(gstAmount / 2).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td />
                          </tr>
                        </>
                      )}
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-slate-800">Grand Total (incl. GST)</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
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

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-slate-700">Notes (optional, not shown on PDF)</label>
            <Textarea
              placeholder="Internal notes for this invoice"
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="mt-1"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} data-testid="custom-invoice-cancel">
              Close
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              data-testid="custom-invoice-generate-btn"
            >
              {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
              {generating ? 'Generating…' : 'Generate & Download PDF'}
            </Button>
          </div>

          {/* History */}
          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800 mb-2">Recent Custom Invoices</h3>
            {loadingHistory ? (
              <p className="text-xs text-slate-500">Loading…</p>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No custom invoices yet.</p>
            ) : (
              <div className="rounded-lg border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr className="text-left text-slate-600">
                      <th className="px-3 py-2">Invoice #</th>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2 text-right">Total</th>
                      <th className="px-3 py-2">Invoice Date</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(row => (
                      <tr key={row.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 font-mono">{row.invoice_no}</td>
                        <td className="px-3 py-2 text-slate-800">{row.customer_name}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          ₹{Number(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-2 text-slate-500">
                          {(row.invoice_date || row.created_at) ? new Date(row.invoice_date || row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                        </td>
                        <td className="px-3 py-2">{statusPill(row)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setStatusEditing({
                              id: row.id,
                              total_amount: row.total_amount,
                              payment_status: row.payment_status || 'pending',
                              paid_amount: row.paid_amount || '',
                            })}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700 mr-1"
                            data-testid={`custom-invoice-edit-status-${row.id}`}
                          >
                            Status
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadHistory(row.id, row.invoice_no)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-700"
                            data-testid={`custom-invoice-download-${row.id}`}
                          >
                            <Download className="w-3 h-3" /> PDF
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Payment status edit sheet */}
          {statusEditing && (
            <div
              className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
              onClick={() => !savingStatus && setStatusEditing(null)}
              data-testid="custom-invoice-status-editor-backdrop"
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
                onClick={(e) => e.stopPropagation()}
                data-testid="custom-invoice-status-editor"
              >
                <h3 className="text-base font-bold text-slate-900 mb-1">Update Payment Status</h3>
                <p className="text-xs text-slate-500 mb-4">
                  Total: <span className="font-semibold text-slate-800">
                    ₹{Number(statusEditing.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700">Payment Status</label>
                    <select
                      value={statusEditing.payment_status}
                      onChange={(e) => setStatusEditing(prev => ({
                        ...prev,
                        payment_status: e.target.value,
                        paid_amount: e.target.value === 'partial' ? prev.paid_amount : '',
                      }))}
                      className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm"
                      data-testid="custom-invoice-edit-status-select"
                    >
                      <option value="pending">Payment Pending</option>
                      <option value="paid">Paid</option>
                      <option value="partial">Partially Paid</option>
                    </select>
                  </div>
                  {statusEditing.payment_status === 'partial' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700">Amount Received *</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={statusEditing.paid_amount}
                        onChange={(e) => setStatusEditing(prev => ({ ...prev, paid_amount: e.target.value }))}
                        className="mt-1"
                        data-testid="custom-invoice-edit-status-amount"
                      />
                      {Number(statusEditing.paid_amount || 0) > 0 && (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Balance: ₹{Math.max(0, Number(statusEditing.total_amount || 0) - Number(statusEditing.paid_amount || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-5">
                  <Button
                    variant="outline"
                    onClick={() => setStatusEditing(null)}
                    disabled={savingStatus}
                    data-testid="custom-invoice-edit-status-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpdateStatus}
                    disabled={savingStatus || (statusEditing.payment_status === 'partial' && !(Number(statusEditing.paid_amount) > 0))}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    data-testid="custom-invoice-edit-status-save"
                  >
                    {savingStatus ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Save
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
