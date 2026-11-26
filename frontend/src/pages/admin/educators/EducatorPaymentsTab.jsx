/**
 * Educators → Payments tab
 * ─────────────────────────────────────────────────────────────
 * Roll-up of every teacher_cost expense record, grouped by educator with a
 * per-school breakdown. The values shown here are the same records that
 * flow into the School P&L sheet's "Educator Cost" column — so an admin
 * can add a payment here and it will appear in the P&L automatically.
 */
import { useEffect, useMemo, useState, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Plus, RefreshCw, IndianRupee, GraduationCap, Building2, Calendar,
  ChevronDown, ChevronRight, Search, ExternalLink, X, Edit2, Trash2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Button } from '../../../components/ui/button';
import { Textarea } from '../../../components/ui/textarea';
import { useAuth } from '../../../context/AuthContext';
import LoadingSpinner from '../../../components/common/LoadingSpinner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return s; }
};

const STATUS_TINT = {
  paid:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  partial: 'bg-blue-100 text-blue-700 border-blue-200',
};

// ────────────────────────────────────────────────────────────────────
// Add / Edit Payment modal
// ────────────────────────────────────────────────────────────────────
const PaymentModal = ({ open, onClose, educators, schools, editing, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    educator_id: '', school_id: '',
    amount: '', expense_date: todayISO(),
    payment_status: 'paid', payment_mode: 'bank_transfer',
    description: '',
  });

  useEffect(() => {
    if (editing) {
      setForm({
        educator_id: editing.educator_id || '',
        school_id: editing.school_id || '',
        amount: editing.amount || '',
        expense_date: editing.expense_date || todayISO(),
        payment_status: editing.payment_status || 'paid',
        payment_mode: editing.payment_mode || 'bank_transfer',
        description: editing.description || '',
      });
    } else if (open) {
      setForm({
        educator_id: '', school_id: '',
        amount: '', expense_date: todayISO(),
        payment_status: 'paid', payment_mode: 'bank_transfer',
        description: '',
      });
    }
  }, [editing, open]);

  const submit = async () => {
    if (!form.educator_id) return toast.error('Pick an educator');
    if (!form.amount || Number(form.amount) <= 0) return toast.error('Enter a valid amount');

    const educator = educators.find((e) => e.id === form.educator_id);
    const school = schools.find((s) => s.id === form.school_id);
    const payload = {
      category: 'teacher_cost',
      school_id: form.school_id || '',
      educator_id: form.educator_id,
      educator_name: educator?.name || '',
      amount: Number(form.amount),
      expense_date: form.expense_date,
      payment_status: form.payment_status,
      payment_mode: form.payment_mode,
      description: form.description || `Payment to ${educator?.name || 'educator'}${school ? ` for ${school.school_name}` : ''}`,
    };

    setSaving(true);
    try {
      if (editing) {
        await axios.patch(`${API}/school-expenses/${editing.id}`, payload, { headers: getAuthHeaders() });
        toast.success('Payment updated');
      } else {
        await axios.post(`${API}/school-expenses`, payload, { headers: getAuthHeaders() });
        toast.success('Payment recorded — will reflect in the School P&L Educator Cost column');
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit Educator Payment' : 'Record Educator Payment'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Educator *</label>
            <select
              value={form.educator_id}
              onChange={(e) => setForm({ ...form, educator_id: e.target.value })}
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
              data-testid="pay-educator"
            >
              <option value="">Select educator...</option>
              {educators.map((e) => (
                <option key={e.id} value={e.id}>{e.name} · {e.email || e.phone || ''}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">School (optional)</label>
            <select
              value={form.school_id}
              onChange={(e) => setForm({ ...form, school_id: e.target.value })}
              className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
              data-testid="pay-school"
            >
              <option value="">Not tied to a school</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>{s.school_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Amount (₹) *</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="mt-1"
                placeholder="0"
                data-testid="pay-amount"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Date</label>
              <Input
                type="date"
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="mt-1"
                data-testid="pay-date"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Status</label>
              <select
                value={form.payment_status}
                onChange={(e) => setForm({ ...form, payment_status: e.target.value })}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
                data-testid="pay-status"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Mode</label>
              <select
                value={form.payment_mode}
                onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}
                className="mt-1 w-full h-10 px-3 border border-slate-200 rounded-lg text-sm"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="upi">UPI</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Notes</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="mt-1"
              placeholder="Optional notes"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              onClick={submit}
              disabled={saving}
              className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white"
              data-testid="pay-save-btn"
            >
              {saving ? 'Saving…' : editing ? 'Update' : 'Record payment'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ────────────────────────────────────────────────────────────────────
// Main tab
// ────────────────────────────────────────────────────────────────────
export default function EducatorPaymentsTab() {
  const { getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({ educators: [], totals: {} });
  const [records, setRecords] = useState([]);
  const [educators, setEducators] = useState([]);
  const [schools, setSchools] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sumRes, listRes, eduRes, schRes] = await Promise.all([
        axios.get(`${API}/educator-payments/summary`, { headers: getAuthHeaders() }),
        axios.get(`${API}/educator-payments`, { headers: getAuthHeaders() }),
        axios.get(`${API}/educators?limit=500`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
        axios.get(`${API}/school-inquiries?limit=500`, { headers: getAuthHeaders() }).catch(() => ({ data: [] })),
      ]);
      setSummary(sumRes.data || { educators: [], totals: {} });
      setRecords(Array.isArray(listRes.data) ? listRes.data : []);
      const eduData = Array.isArray(eduRes.data) ? eduRes.data : (eduRes.data?.educators || eduRes.data?.data || []);
      setEducators(eduData);
      const schData = Array.isArray(schRes.data) ? schRes.data : (schRes.data?.inquiries || schRes.data?.schools || []);
      setSchools(schData);
    } catch (e) {
      toast.error('Failed to load educator payments');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return summary.educators;
    return summary.educators.filter((r) =>
      (r.educator_name || '').toLowerCase().includes(q) ||
      r.schools.some((s) => (s.school_name || '').toLowerCase().includes(q))
    );
  }, [summary, search]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (rec) => { setEditing(rec); setModalOpen(true); };
  const removeRecord = async (rec) => {
    if (!confirm('Delete this payment record? This also removes it from the School P&L Educator Cost.')) return;
    try {
      await axios.delete(`${API}/school-expenses/${rec.id}`, { headers: getAuthHeaders() });
      toast.success('Payment deleted');
      fetchAll();
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const toggle = (eid) => setExpanded((prev) => ({ ...prev, [eid]: !prev[eid] }));

  const T = summary.totals || {};

  return (
    <div className="space-y-5" data-testid="educator-payments-tab">
      {/* Summary strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="rounded-xl border border-slate-100 p-4 bg-indigo-50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> Total Paid Out
          </div>
          <div className="mt-1 text-2xl font-black text-indigo-900">{fmtINR(T.total_amount)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4 bg-emerald-50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> Cleared
          </div>
          <div className="mt-1 text-2xl font-black text-emerald-900">{fmtINR(T.paid_amount)}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4 bg-amber-50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-amber-700 flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5" /> Pending
          </div>
          <div className="mt-1 text-2xl font-black text-amber-900">
            {fmtINR(Number(T.total_amount || 0) - Number(T.paid_amount || 0))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
            <GraduationCap className="w-3.5 h-3.5" /> Educators Paid
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">{T.educators || 0}</div>
        </div>
        <div className="rounded-xl border border-slate-100 p-4 bg-slate-50">
          <div className="text-[11px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5" /> Schools Covered
          </div>
          <div className="mt-1 text-2xl font-black text-slate-900">{T.schools || 0}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search educator or school..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/30 focus:border-[#1E3A5F]"
            data-testid="pay-search"
          />
        </div>
        <Button variant="outline" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <Link to="/admin/expenses" className="ml-auto">
          <Button variant="outline" className="text-blue-700 border-blue-300 hover:bg-blue-50">
            <ExternalLink className="w-4 h-4 mr-1.5" /> Open School P&L
          </Button>
        </Link>
        <Button onClick={openAdd} className="bg-[#1E3A5F] hover:bg-[#0A1F44] text-white" data-testid="add-payment-btn">
          <Plus className="w-4 h-4 mr-1.5" /> Add Payment
        </Button>
      </div>

      {/* Per-educator table */}
      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 font-black text-[#1E3A5F]">
          Payments by Educator
        </div>
        {loading ? (
          <LoadingSpinner text="Loading educator payments…" />
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm" data-testid="pay-empty">
            No educator payments recorded yet. Click <b>Add Payment</b> — it will flow into the School P&L Educator Cost automatically.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((r) => {
              const eid = r.educator_id || '__unassigned__';
              const isOpen = !!expanded[eid];
              return (
                <div key={eid} data-testid={`pay-educator-row-${eid}`}>
                  <button
                    type="button"
                    onClick={() => toggle(eid)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 text-left"
                  >
                    {isOpen ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                    <div className="w-9 h-9 rounded-full bg-[#1E3A5F] text-white flex items-center justify-center font-bold text-xs">
                      {(r.educator_name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0F1E33] truncate">{r.educator_name || 'Unassigned'}</div>
                      <div className="text-xs text-slate-500">
                        {r.schools.length} school{r.schools.length === 1 ? '' : 's'} · {r.records} record{r.records === 1 ? '' : 's'} · last {fmtDate(r.last_date)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-[#0F1E33]">{fmtINR(r.total_amount)}</div>
                      <div className="text-[11px] text-slate-500">Paid {fmtINR(r.paid_amount)}</div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="bg-slate-50 px-4 py-3 space-y-3">
                      {/* Per-school roll-up */}
                      <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 text-left">School</th>
                              <th className="px-3 py-2 text-right">Total Paid</th>
                              <th className="px-3 py-2 text-right">Cleared</th>
                              <th className="px-3 py-2 text-right">Records</th>
                              <th className="px-3 py-2 text-left">Last Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {r.schools.map((s, i) => (
                              <tr key={`${s.school_id}-${i}`} className="border-t border-slate-100">
                                <td className="px-3 py-2 font-semibold text-slate-800">{s.school_name || 'General'}</td>
                                <td className="px-3 py-2 text-right font-bold text-[#0F1E33]">{fmtINR(s.total_amount)}</td>
                                <td className="px-3 py-2 text-right text-emerald-700">{fmtINR(s.paid_amount)}</td>
                                <td className="px-3 py-2 text-right">{s.records}</td>
                                <td className="px-3 py-2 text-xs">{fmtDate(s.last_date)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Individual records for this educator */}
                      <div className="overflow-x-auto bg-white rounded-lg border border-slate-100">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
                            <tr>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">School</th>
                              <th className="px-3 py-2 text-left">Notes</th>
                              <th className="px-3 py-2 text-left">Status</th>
                              <th className="px-3 py-2 text-right">Amount</th>
                              <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {records
                              .filter((rec) => (rec.educator_id || '') === (r.educator_id || ''))
                              .map((rec) => (
                                <tr key={rec.id} className="border-t border-slate-100">
                                  <td className="px-3 py-2 text-xs">{fmtDate(rec.expense_date)}</td>
                                  <td className="px-3 py-2 text-xs font-semibold text-slate-800">{rec.school_name || 'General'}</td>
                                  <td className="px-3 py-2 text-xs text-slate-600 max-w-[240px] truncate">{rec.description || '—'}</td>
                                  <td className="px-3 py-2 text-xs">
                                    <span className={`inline-block px-2 py-0.5 rounded border font-bold uppercase tracking-wide ${STATUS_TINT[rec.payment_status] || STATUS_TINT.pending}`}>
                                      {rec.payment_status || 'pending'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right font-bold text-[#0F1E33]">{fmtINR(rec.amount)}</td>
                                  <td className="px-3 py-2 text-right">
                                    <button onClick={() => openEdit(rec)} className="p-1 hover:bg-slate-100 rounded" title="Edit">
                                      <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                    </button>
                                    <button onClick={() => removeRecord(rec)} className="p-1 hover:bg-rose-50 rounded ml-1" title="Delete">
                                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PaymentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        educators={educators}
        schools={schools}
        editing={editing}
        onSaved={fetchAll}
      />
    </div>
  );
}
