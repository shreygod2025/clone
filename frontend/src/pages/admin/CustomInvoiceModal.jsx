import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Button } from '../../components/ui/button';
import { Plus, Trash2, Download, FileText, Loader2 } from 'lucide-react';
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

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function CustomInvoiceModal({ open, onClose }) {
  const [form, setForm] = useState({
    customer_name: '',
    address: '',
    gstin: '',
    state: 'Maharashtra',
    gst_type: 'exclusive_18',
    notes: '',
  });
  const [items, setItems] = useState([emptyRow()]);
  const [generating, setGenerating] = useState(false);
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
      const fakePayment = {
        school_id: fakeSchoolId,
        school_name: form.customer_name,
        amount: totalAmount,
        gst_type: form.gst_type,
        tranche_index: 0,
        tranche_info: '',
        due_date: '',
        status: 'pending',
        qty: valid.reduce((s, r) => s + Number(r.qty || 0), 0),
      };
      const fakeSchoolData = {
        school_name: form.customer_name,
        address: form.address,
        gstin: form.gstin,
        state: form.state || 'Maharashtra',
        onboarding_data: {
          payment_mode: 'from_school',
          gst_type: form.gst_type,
          // grade_pricing left empty — customLineItems takes over
        },
      };

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
        },
      );

      // Persist to backend so admin can re-download later
      try {
        await axios.post(`${API}/admin/custom-invoices`, {
          customer_name: form.customer_name,
          address: form.address,
          gstin: form.gstin,
          state: form.state,
          gst_type: form.gst_type,
          notes: form.notes,
          line_items: valid.map(r => ({ desc: r.desc, qty: Number(r.qty), rate: Number(r.rate) })),
          total_amount: totalAmount,
          generated_invoice_no: invoiceNo,
          pdf_base64: base64,
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
        gst_type: 'exclusive_18',
        notes: '',
      });
      setItems([emptyRow()]);
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
          {/* Customer block */}
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
              <label className="text-xs font-medium text-slate-700">Address</label>
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
              <label className="text-xs font-medium text-slate-700">State</label>
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
                      <tr>
                        <td colSpan={3} className="px-3 py-1 text-right text-xs text-slate-600">GST @ 18% (added on top)</td>
                        <td className="px-3 py-1 text-right text-slate-700">
                          ₹{(subtotal * 0.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td />
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-right text-sm font-semibold text-slate-800">Grand Total (incl. GST)</td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          ₹{(subtotal * 1.18).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
                      <th className="px-3 py-2">Created</th>
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
                          {row.created_at ? new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}
                        </td>
                        <td className="px-3 py-2 text-right">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
