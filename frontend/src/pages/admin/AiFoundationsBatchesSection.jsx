/**
 * AiFoundationsBatchesSection — admin batch manager (create / edit / delete)
 * Lives inside the AI Foundations CRM tab so admins can configure cohort
 * timings / dates that students see on the booking form.
 */
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Calendar, Clock, Users, Plus, Trash2, Save, X, Edit3, RefreshCw, Loader2 } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const empty = {
  label: '',
  track: '',
  days_label: '',
  days: [],
  timing: '',
  start_date: '',
  start_date_label: '',
  capacity: 10,
  is_active: true,
};

const TRACKS = [
  { value: '', label: 'All Tracks' },
  { value: 'explorer', label: 'Explorer (6-8)' },
  { value: 'creator', label: 'Creator (9-12)' },
];

const AiFoundationsBatchesSection = ({ getAuthHeaders }) => {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/ai-foundations/batches`, { headers: getAuthHeaders() });
      setBatches(r.data?.batches || []);
    } catch (e) {
      toast.error('Failed to load batches');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const openCreate = () => {
    setForm(empty);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (b) => {
    setForm({ ...empty, ...b });
    setEditingId(b.id);
    setShowForm(true);
  };

  const save = async () => {
    if (!form.label.trim()) return toast.error('Label is required');
    setSaving(true);
    try {
      const payload = { ...form, capacity: Number(form.capacity) || 10 };
      if (editingId) {
        await axios.patch(`${API}/admin/ai-foundations/batches/${editingId}`, payload, { headers: getAuthHeaders() });
        toast.success('Batch updated');
      } else {
        await axios.post(`${API}/admin/ai-foundations/batches`, payload, { headers: getAuthHeaders() });
        toast.success('Batch created');
      }
      setShowForm(false);
      setEditingId(null);
      setForm(empty);
      fetchBatches();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this batch? Students with existing bookings will keep their batch_id reference.')) return;
    try {
      await axios.delete(`${API}/admin/ai-foundations/batches/${id}`, { headers: getAuthHeaders() });
      toast.success('Batch deleted');
      fetchBatches();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden" data-testid="aif-batches-section">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-black text-[#0F1E33] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600" /> Batches — Date &amp; Timing
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Configure cohort schedules students can pick from at checkout.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchBatches} disabled={loading}
            className="text-xs px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-700 flex items-center gap-1.5 disabled:opacity-50"
            data-testid="batches-refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <button onClick={openCreate}
            className="text-xs px-3 py-2 rounded-lg bg-[#1E3A5F] text-white font-bold flex items-center gap-1.5 hover:bg-[#0F1E33]"
            data-testid="batches-new-btn">
            <Plus className="w-3.5 h-3.5" /> New Batch
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-blue-50/60 border-b border-blue-100 p-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <Field label="Display Label *">
              <input className="ai-batch-input" value={form.label} placeholder="Weekday Evening · Explorer"
                onChange={e => update('label', e.target.value)} data-testid="batch-label-input" />
            </Field>
            <Field label="Track">
              <select className="ai-batch-input" value={form.track} onChange={e => update('track', e.target.value)} data-testid="batch-track-select">
                {TRACKS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Capacity">
              <input type="number" min={1} max={100} className="ai-batch-input" value={form.capacity}
                onChange={e => update('capacity', e.target.value)} data-testid="batch-capacity-input" />
            </Field>
            <Field label="Days Label">
              <input className="ai-batch-input" value={form.days_label} placeholder="Mon · Wed · Fri"
                onChange={e => update('days_label', e.target.value)} data-testid="batch-days-input" />
            </Field>
            <Field label="Timing">
              <input className="ai-batch-input" value={form.timing} placeholder="5:00 PM – 6:00 PM IST"
                onChange={e => update('timing', e.target.value)} data-testid="batch-timing-input" />
            </Field>
            <Field label="Start Date">
              <input type="date" className="ai-batch-input" value={form.start_date}
                onChange={e => {
                  const v = e.target.value;
                  let label = v;
                  try {
                    if (v) label = new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                  } catch { /* noop */ }
                  setForm(prev => ({ ...prev, start_date: v, start_date_label: label }));
                }}
                data-testid="batch-startdate-input" />
            </Field>
            <Field label="Active">
              <select className="ai-batch-input" value={form.is_active ? '1' : '0'}
                onChange={e => update('is_active', e.target.value === '1')} data-testid="batch-active-select">
                <option value="1">Active (visible to students)</option>
                <option value="0">Inactive (hidden)</option>
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={save} disabled={saving}
              className="text-xs px-4 py-2 rounded-lg bg-[#1E3A5F] text-white font-bold flex items-center gap-1.5 hover:bg-[#0F1E33] disabled:opacity-60"
              data-testid="batch-save-btn">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              {editingId ? 'Update Batch' : 'Create Batch'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); setForm(empty); }}
              className="text-xs px-4 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 font-bold text-slate-600 flex items-center gap-1.5"
              data-testid="batch-cancel-btn">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {batches.length === 0 && !loading ? (
          <div className="text-center py-10 text-sm text-slate-500">
            No batches yet. Create one to let students pick their cohort timing.
          </div>
        ) : (
          <table className="w-full text-sm" data-testid="batches-table">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="text-left px-4 py-2 font-bold">Batch</th>
                <th className="text-left px-4 py-2 font-bold">Track</th>
                <th className="text-left px-4 py-2 font-bold">Schedule</th>
                <th className="text-left px-4 py-2 font-bold">Start</th>
                <th className="text-left px-4 py-2 font-bold">Enrolled</th>
                <th className="text-left px-4 py-2 font-bold">Status</th>
                <th className="text-right px-4 py-2 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map(b => (
                <tr key={b.id} className="border-t border-slate-100 hover:bg-slate-50/60" data-testid={`batch-row-${b.id}`}>
                  <td className="px-4 py-3 font-bold text-[#0F1E33]">{b.label}</td>
                  <td className="px-4 py-3 text-slate-700">{b.track ? (b.track === 'explorer' ? 'Explorer' : 'Creator') : 'All'}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex flex-col text-xs gap-0.5">
                      <span className="font-semibold">{b.days_label || '—'}</span>
                      <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" /> {b.timing || '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-700 text-xs">{b.start_date_label || b.start_date || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs">
                      <div className="font-bold text-[#0F1E33] flex items-center gap-1"><Users className="w-3 h-3" /> {b.enrolled_paid || 0}/{b.capacity || 10} paid</div>
                      <div className="text-slate-500">{b.seats_left ?? 0} seat{(b.seats_left ?? 0) === 1 ? '' : 's'} left</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button onClick={() => openEdit(b)}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-blue-600"
                        data-testid={`batch-edit-${b.id}`}>
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(b.id)}
                        className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                        data-testid={`batch-delete-${b.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`.ai-batch-input{width:100%;padding:.5rem .7rem;border:1.5px solid #E2E8F0;border-radius:.5rem;font-size:.85rem;background:white;outline:none;transition:border-color .15s}
        .ai-batch-input:focus{border-color:#2563EB}`}</style>
    </div>
  );
};

const Field = ({ label, children }) => (
  <label className="block">
    <span className="text-[10px] font-bold tracking-wider text-slate-600 uppercase mb-1 block">{label}</span>
    {children}
  </label>
);

export default AiFoundationsBatchesSection;
