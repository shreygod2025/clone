import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Paperclip, Loader2, X, IndianRupee } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const today = () => new Date().toISOString().slice(0, 10);
const EMPTY = { amount: '', gst_percent: '0', earning_date: today(), source: '', description: '', invoice_number: '', invoice_url: '' };

const EarningForm = ({ open, initial, onClose, onSave, getAuthHeaders }) => {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  useEffect(() => {
    if (open) setF(initial ? { ...EMPTY, ...initial, amount: String(initial.amount), gst_percent: String(initial.gst_percent || 0) } : { ...EMPTY, earning_date: today() });
  }, [open, initial]);
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const amount = parseFloat(f.amount) || 0;
  const gst = Math.round(amount * (parseFloat(f.gst_percent) || 0)) / 100;

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await axios.post(`${API}/upload?type=invoices`, fd, { headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' } });
      setF((p) => ({ ...p, invoice_url: res.data.url }));
    } catch (e) { toast.error(e?.response?.data?.detail || 'Upload failed'); }
    finally { setUploading(false); }
  };

  const submit = async () => {
    if (amount <= 0) { toast.error('Enter an amount'); return; }
    setSaving(true);
    try { await onSave({ ...f, amount, gst_percent: parseFloat(f.gst_percent) || 0 }); onClose(); }
    catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg" data-testid="earning-form-dialog">
        <DialogHeader><DialogTitle>{initial ? 'Edit earning' : 'Add earning'}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-1">Amount (excl. GST) *<Input type="number" min="0" value={f.amount} onChange={set('amount')} data-testid="earning-amount" /></label>
          <label className="col-span-1">GST %
            <select value={f.gst_percent} onChange={set('gst_percent')} className="w-full h-9 border rounded-md px-2" data-testid="earning-gst">
              {['0', '5', '12', '18', '28'].map((g) => <option key={g} value={g}>{g}%</option>)}
            </select>
          </label>
          <label>Date *<Input type="date" value={f.earning_date} onChange={set('earning_date')} data-testid="earning-date" /></label>
          <label>Invoice no.<Input value={f.invoice_number} onChange={set('invoice_number')} data-testid="earning-invoice-number" /></label>
          <label className="col-span-2">Client / Source<Input value={f.source} onChange={set('source')} data-testid="earning-source" /></label>
          <label className="col-span-2">Description<Input value={f.description} onChange={set('description')} data-testid="earning-description" /></label>
          <div className="col-span-2">
            <div className="mb-1">Invoice file</div>
            {f.invoice_url ? (
              <div className="flex items-center gap-2 text-xs">
                <a href={f.invoice_url} target="_blank" rel="noreferrer" className="text-blue-600 underline truncate" data-testid="earning-invoice-link">View uploaded invoice</a>
                <button type="button" onClick={() => setF((p) => ({ ...p, invoice_url: '' }))} data-testid="earning-invoice-remove"><X className="w-3.5 h-3.5 text-slate-500" /></button>
              </div>
            ) : (
              <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(e) => upload(e.target.files?.[0])} disabled={uploading} data-testid="earning-invoice-file" className="text-xs" />
            )}
            {uploading && <span className="text-xs text-slate-500 inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Uploading…</span>}
          </div>
          <div className="col-span-2 rounded-lg bg-slate-50 p-3 text-xs flex justify-between" data-testid="earning-calc">
            <span>Base {fmtINR(amount)}</span><span>GST {fmtINR(gst)}</span><span className="font-bold">Total {fmtINR(amount + gst)}</span>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || uploading} data-testid="earning-save">{saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}Save</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default function ProjectEarnings({ projectId, getAuthHeaders }) {
  const [data, setData] = useState({ earnings: [], total: 0, total_gst: 0, total_with_gst: 0 });
  const [form, setForm] = useState({ open: false, initial: null });

  const load = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/projects/${projectId}/earnings`, { headers: getAuthHeaders() });
      setData(r.data);
    } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load earnings'); }
  }, [projectId, getAuthHeaders]);
  useEffect(() => { load(); }, [load]);

  const save = async (payload) => {
    const h = { headers: getAuthHeaders() };
    if (form.initial) await axios.put(`${API}/projects/earnings/${form.initial.id}`, payload, h);
    else await axios.post(`${API}/projects/${projectId}/earnings`, payload, h);
    toast.success('Earning saved');
    load();
  };
  const remove = async (e) => {
    if (!window.confirm('Delete this earning?')) return;
    try { await axios.delete(`${API}/projects/earnings/${e.id}`, { headers: getAuthHeaders() }); toast.success('Deleted'); load(); }
    catch (err) { toast.error(err?.response?.data?.detail || 'Delete failed'); }
  };

  return (
    <div className="bg-white rounded-xl border p-4" data-testid="project-earnings">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center gap-1 text-emerald-700 font-black text-lg" data-testid="project-earnings-total"><IndianRupee className="w-4 h-4" />{fmtINR(data.total).slice(1)}</div>
        <span className="text-xs text-slate-500">excl. GST · GST {fmtINR(data.total_gst)} · Invoiced {fmtINR(data.total_with_gst)}</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setForm({ open: true, initial: null })} data-testid="project-add-earning-btn"><Plus className="w-4 h-4 mr-1" />Add Earning</Button>
      </div>
      {data.earnings.length === 0 ? (
        <div className="text-sm text-slate-400 py-6 text-center" data-testid="project-earnings-empty">No earnings recorded yet.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] uppercase tracking-wide text-slate-500 text-left">
              <th className="py-2 pr-3">Date</th><th className="pr-3">Client / Source</th><th className="pr-3">Invoice</th>
              <th className="pr-3 text-right">Base</th><th className="pr-3 text-right">GST</th><th className="pr-3 text-right">Total</th><th />
            </tr></thead>
            <tbody>
              {data.earnings.map((e) => (
                <tr key={e.id} className="border-t" data-testid={`earning-row-${e.id}`}>
                  <td className="py-2 pr-3 whitespace-nowrap">{e.earning_date}</td>
                  <td className="pr-3"><div className="font-medium">{e.source || '—'}</div>{e.description && <div className="text-xs text-slate-500">{e.description}</div>}</td>
                  <td className="pr-3 text-xs">
                    {e.invoice_number || ''}
                    {e.invoice_url && <a href={e.invoice_url} target="_blank" rel="noreferrer" className="ml-1 inline-flex items-center text-blue-600" data-testid={`earning-invoice-${e.id}`}><Paperclip className="w-3 h-3" />File</a>}
                  </td>
                  <td className="pr-3 text-right">{fmtINR(e.amount)}</td>
                  <td className="pr-3 text-right text-slate-500">{e.gst_percent ? `${fmtINR(e.gst_amount)} (${e.gst_percent}%)` : '—'}</td>
                  <td className="pr-3 text-right font-semibold">{fmtINR(e.total_amount)}</td>
                  <td className="whitespace-nowrap text-right">
                    <button onClick={() => setForm({ open: true, initial: e })} className="p-1 text-slate-500 hover:text-slate-900" data-testid={`earning-edit-${e.id}`}><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => remove(e)} className="p-1 text-slate-500 hover:text-red-600" data-testid={`earning-delete-${e.id}`}><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <EarningForm open={form.open} initial={form.initial} onClose={() => setForm({ open: false, initial: null })} onSave={save} getAuthHeaders={getAuthHeaders} />
    </div>
  );
}
