/**
 * Telecalling / Cold-Calling.
 *
 * Admin:
 *   - Bulk import an XLSX (auto-recognises name/phone/... headers)
 *   - Assign to a single telecaller OR auto-assign round-robin
 *   - See every row; filter by assignee, status, search
 *
 * Telecaller (user with 'telecalling' permission):
 *   - Sees only rows assigned to them
 *   - Excel-like table with inline toggles: Call Picked? Y/N, Lead Interested? Y/N
 *   - Note editable inline
 *   - Toggling Lead Interested → Yes opens the rich lead popup (products + meeting)
 *   - That save creates a school_inquiry so the lead enters the sales pipeline
 *
 * Reports tab:
 *   - Per-user daily/monthly rollup of Calls Made / Picked / Interested / Meetings Booked
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Phone, Upload, Download, FileSpreadsheet, Users, Search, Filter, X,
  Building2, Calendar, BarChart3, ChevronDown, ChevronRight, Loader2, Plus,
  UserPlus, MessageSquare, Mail, MapPin,
} from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// keep in sync with AdminFieldReports.jsx (or later extract to shared file)
const OLL_PRODUCTS = [
  { id: 'robotics_lab',      label: 'Robotics Lab Setup' },
  { id: 'individual_kit',    label: 'Individual Robotics Kit' },
  { id: 'stem_curriculum',   label: 'STEM Curriculum Integration' },
  { id: 'after_school',      label: 'After School Program' },
  { id: 'teacher_training',  label: 'Teacher Training' },
  { id: 'future_skills',     label: 'Future Skills (AI/Coding)' },
  { id: 'exhibition',        label: 'Robotics Exhibition' },
  { id: 'competition',       label: 'Robotics Competition' },
];

const isAdminRole = (r) => ['admin', 'super_admin', 'superadmin'].includes((r || '').toLowerCase());

// ─────────────────────────────────────────────────────────────────
// Inline yes/no cell
const YN = ({ value, onChange, testid }) => (
  <div className="flex gap-1" data-testid={testid}>
    {['yes', 'no'].map(v => {
      const active = value === v;
      return (
        <button key={v} onClick={(e) => { e.stopPropagation(); onChange(active ? null : v); }}
          className={`w-9 h-6 text-[10px] font-bold uppercase rounded border transition ${active
            ? v === 'yes' ? 'bg-emerald-100 text-emerald-700 border-emerald-500' : 'bg-rose-100 text-rose-700 border-rose-500'
            : 'border-slate-200 text-slate-400 hover:border-slate-400'
            }`}
        >{v}</button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────
// Bulk Import modal
const ImportModal = ({ open, onClose, onDone, users }) => {
  const [file, setFile] = useState(null);
  const [assignMode, setAssignMode] = useState('single');
  const [assignedTo, setAssignedTo] = useState('');
  const [autoPool, setAutoPool] = useState([]);
  const [defaultSource, setDefaultSource] = useState('');
  const [uploading, setUploading] = useState(false);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    if (open) { setFile(null); setAssignMode('single'); setAssignedTo(''); setAutoPool([]); setDefaultSource(''); }
  }, [open]);

  const togglePool = (id) => setAutoPool(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const downloadSample = async () => {
    try {
      const r = await axios.get(`${API}/telecalling/sample-template.xlsx`, {
        headers: getAuthHeaders(), responseType: 'blob',
      });
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'telecalling-template.xlsx'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Could not download template'); }
  };

  const submit = async () => {
    if (!file) return toast.error('Pick a spreadsheet first');
    if (assignMode === 'single' && !assignedTo) return toast.error('Choose a telecaller');
    if (assignMode === 'auto' && autoPool.length === 0) return toast.error('Pick at least one telecaller for auto-assign');
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('assign_mode', assignMode);
      if (assignMode === 'single') fd.append('assigned_to', assignedTo);
      if (assignMode === 'auto') fd.append('auto_pool', autoPool.join(','));
      if (defaultSource) fd.append('default_source', defaultSource);
      const r = await axios.post(`${API}/telecalling/import`, fd, { headers: getAuthHeaders() });
      toast.success(`Imported ${r.data.inserted} contacts (${r.data.skipped} skipped)`);
      onDone();
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Import failed'); }
    finally { setUploading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="tc-import-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5" /> Bulk Import Contacts</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadSample} data-testid="tc-download-template"><Download className="w-3.5 h-3.5 mr-1" /> Sample template</Button>
            <span className="text-xs text-slate-500">Columns: name, phone (required), alt_phone, email, school_name, city, board, notes, source</span>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Spreadsheet (.xlsx)</label>
            <input type="file" accept=".xlsx" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" data-testid="tc-import-file" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Assign mode</label>
            <div className="flex gap-2">
              {[['single', 'One telecaller'], ['auto', 'Auto-assign (round-robin)']].map(([v, l]) => (
                <button key={v} onClick={() => setAssignMode(v)}
                  className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition ${assignMode === v ? 'bg-indigo-50 text-indigo-700 border-indigo-500' : 'border-slate-200 text-slate-500'}`}
                  data-testid={`tc-assign-mode-${v}`}
                >{l}</button>
              ))}
            </div>
          </div>
          {assignMode === 'single' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assign to</label>
              <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" data-testid="tc-assign-single">
                <option value="">Select telecaller...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Auto-assign pool</label>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-slate-50 rounded">
                    <input type="checkbox" checked={autoPool.includes(u.id)} onChange={() => togglePool(u.id)} data-testid={`tc-pool-${u.id}`} />
                    <span>{u.name || u.email}</span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Rows are distributed round-robin across selected people.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Default source (optional)</label>
            <Input value={defaultSource} onChange={(e) => setDefaultSource(e.target.value)} placeholder="e.g. Winter Campaign 2026" data-testid="tc-default-source" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={submit} disabled={uploading} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="tc-import-submit">
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />} Import
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────
// Interested-lead popup
const InterestedLeadModal = ({ open, contact, onClose, onSaved }) => {
  const { getAuthHeaders } = useAuth();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && contact) {
      setForm({
        name:                contact.name || '',
        phone:               contact.phone || '',
        email:               contact.email || '',
        school_name:         contact.school_name || '',
        city:                contact.city || '',
        board:               contact.board || '',
        notes:               contact.notes || '',
        products_interested: contact.products_interested || [],
        meeting_at:          contact.meeting_at || '',
      });
    }
  }, [open, contact]);

  const toggleProduct = (id) => setForm(f => ({
    ...f,
    products_interested: (f.products_interested || []).includes(id)
      ? f.products_interested.filter(x => x !== id)
      : [...(f.products_interested || []), id],
  }));

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      const patch = { ...form, lead_interested: 'yes' };
      const r = await axios.patch(`${API}/telecalling/contacts/${contact.id}`, patch, { headers: getAuthHeaders() });
      toast.success(r.data.school_inquiry_id ? 'Saved · promoted to CRM' : 'Saved');
      onSaved(r.data);
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  if (!contact) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto" data-testid="tc-interested-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> Interested Lead — {contact.name || contact.phone}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
              <Input value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="tci-name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
              <Input value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="tci-phone" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <Input value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">School</label>
              <Input value={form.school_name || ''} onChange={(e) => setForm({ ...form, school_name: e.target.value })} data-testid="tci-school" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
              <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Board</label>
              <Input value={form.board || ''} onChange={(e) => setForm({ ...form, board: e.target.value })} placeholder="CBSE / ICSE / IB / ..." />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2">Products interested in</label>
            <div className="flex flex-wrap gap-2" data-testid="tci-products">
              {OLL_PRODUCTS.map(p => {
                const active = (form.products_interested || []).includes(p.id);
                return (
                  <button key={p.id} onClick={() => toggleProduct(p.id)}
                    className={`px-2.5 py-1 text-xs rounded-full border-2 transition ${active ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-semibold' : 'border-slate-200 text-slate-500'}`}
                    data-testid={`tci-product-${p.id}`}
                  >{p.label}</button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Schedule Meeting</label>
            <Input type="datetime-local" value={form.meeting_at || ''} onChange={(e) => setForm({ ...form, meeting_at: e.target.value })} data-testid="tci-meeting" />
            <p className="text-[10px] text-slate-500 mt-1">Saved on the linked school inquiry as followup date.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="tci-notes" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="tci-save">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save & Promote to CRM
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────────
// Row (Excel-like)
const ContactRow = ({ row, isAdmin, users, onPatch, onOpenInterested, onDelete }) => {
  const noteRef = useRef(null);
  const [note, setNote] = useState(row.notes || '');
  useEffect(() => { setNote(row.notes || ''); }, [row.id, row.notes]);

  const commit = (field, value) => { onPatch(row.id, { [field]: value }); };
  const commitNote = () => { if (note !== (row.notes || '')) commit('notes', note); };

  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50/60 text-xs" data-testid={`tc-row-${row.id}`}>
      <td className="px-2 py-1.5 whitespace-nowrap">
        <div className="font-medium text-slate-800">{row.name || <span className="text-slate-400 italic">—</span>}</div>
        <div className="text-[10px] text-slate-500">{row.source || ''}</div>
      </td>
      <td className="px-2 py-1.5 font-mono">
        <a href={`tel:${row.phone}`} className="text-indigo-700 hover:underline" data-testid={`tc-phone-${row.id}`}>{row.phone}</a>
      </td>
      <td className="px-2 py-1.5">{row.school_name || <span className="text-slate-400 italic">—</span>}</td>
      <td className="px-2 py-1.5">{row.city || <span className="text-slate-400 italic">—</span>}</td>
      <td className="px-2 py-1.5">
        <YN value={row.call_picked} onChange={(v) => commit('call_picked', v)} testid={`tc-picked-${row.id}`} />
      </td>
      <td className="px-2 py-1.5">
        <YN
          value={row.lead_interested}
          onChange={(v) => {
            if (v === 'yes') onOpenInterested(row);
            else commit('lead_interested', v);
          }}
          testid={`tc-interested-${row.id}`}
        />
      </td>
      <td className="px-2 py-1.5 min-w-[200px]">
        <textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)} onBlur={commitNote}
          rows={1} placeholder="Add note..." className="w-full text-xs px-2 py-1 border border-slate-100 rounded resize-none focus:border-slate-300 focus:outline-none"
          data-testid={`tc-note-${row.id}`} />
      </td>
      {isAdmin && (
        <td className="px-2 py-1.5">
          <select value={row.assigned_to || ''} onChange={(e) => commit('assigned_to', e.target.value || null)}
            className="text-xs h-7 px-1 border border-slate-200 rounded bg-white" data-testid={`tc-assigned-${row.id}`}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </td>
      )}
      <td className="px-2 py-1.5">
        {row.school_inquiry_id ? (
          <a href={`/admin/schools?school_id=${row.school_inquiry_id}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline"><Building2 className="w-3 h-3" /> CRM</a>
        ) : (
          <span className="text-slate-400 italic">—</span>
        )}
      </td>
      {isAdmin && (
        <td className="px-2 py-1.5">
          <button onClick={() => onDelete(row.id)} className="text-slate-400 hover:text-rose-600" data-testid={`tc-del-${row.id}`}><X className="w-3.5 h-3.5" /></button>
        </td>
      )}
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────
// Reports tab
const ReportsTab = () => {
  const { getAuthHeaders } = useAuth();
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/telecalling/reports?month=${month}`, { headers: getAuthHeaders() });
      setRows(r.data.rows || []);
    } catch { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [getAuthHeaders, month]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Month</label>
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
            className="h-9 px-2 border border-slate-200 rounded-lg text-sm" data-testid="tc-rep-month" />
        </div>
      </div>
      {loading ? (
        <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">
          No call activity in this month.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map(u => (
            <div key={u.user_id || u.user_name} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <button onClick={() => setExpanded(exp => exp === u.user_id ? null : u.user_id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left" data-testid={`tc-rep-user-${u.user_id}`}>
                {expanded === u.user_id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <div className="flex-1">
                  <div className="font-semibold text-slate-800">{u.user_name}</div>
                  <div className="text-[11px] text-slate-500">Total: {Object.values(u.totals).reduce((a, b) => a + b, 0)} events</div>
                </div>
                <div className="flex gap-3 text-xs">
                  <div className="text-center"><div className="font-bold text-slate-800">{u.totals.call_made}</div><div className="text-[10px] text-slate-500">Made</div></div>
                  <div className="text-center"><div className="font-bold text-emerald-700">{u.totals.call_picked}</div><div className="text-[10px] text-slate-500">Picked</div></div>
                  <div className="text-center"><div className="font-bold text-indigo-700">{u.totals.lead_interested}</div><div className="text-[10px] text-slate-500">Interested</div></div>
                  <div className="text-center"><div className="font-bold text-amber-700">{u.totals.meeting_booked}</div><div className="text-[10px] text-slate-500">Meetings</div></div>
                </div>
              </button>
              {expanded === u.user_id && (
                <div className="border-t border-slate-100 p-3 bg-slate-50/60">
                  <table className="w-full text-xs">
                    <thead className="text-slate-500 text-left">
                      <tr>
                        <th className="pb-1">Day</th>
                        <th className="pb-1 text-right">Made</th>
                        <th className="pb-1 text-right">Picked</th>
                        <th className="pb-1 text-right">Interested</th>
                        <th className="pb-1 text-right">Meetings</th>
                      </tr>
                    </thead>
                    <tbody>
                      {u.days.map(d => (
                        <tr key={d.day} className="border-t border-slate-200">
                          <td className="py-1">{d.day}</td>
                          <td className="py-1 text-right">{d.call_made}</td>
                          <td className="py-1 text-right text-emerald-700">{d.call_picked}</td>
                          <td className="py-1 text-right text-indigo-700">{d.lead_interested}</td>
                          <td className="py-1 text-right text-amber-700">{d.meeting_booked}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// Main page
export default function AdminTelecalling() {
  const { user, getAuthHeaders } = useAuth();
  const isAdmin = isAdminRole(user?.role);
  const [tab, setTab] = useState('queue');
  const [contacts, setContacts] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);
  const [interestedRow, setInterestedRow] = useState(null);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (isAdmin && assigneeFilter !== 'all') params.set('assigned_to', assigneeFilter);
      const r = await axios.get(`${API}/telecalling/contacts?${params}`, { headers: getAuthHeaders() });
      setContacts(r.data.contacts || []);
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  }, [getAuthHeaders, statusFilter, search, isAdmin, assigneeFilter]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const r = await axios.get(`${API}/team-users?limit=200`, { headers: getAuthHeaders() });
      const list = Array.isArray(r.data) ? r.data : (r.data.users || r.data.data || []);
      // Filter to users with 'telecalling' permission (admins always allowed)
      const eligible = list.filter(u =>
        isAdminRole(u.role) || (u.permissions || []).includes('telecalling')
      );
      setUsers(eligible);
    } catch { /* silent */ }
  }, [getAuthHeaders, isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadContacts(); }, [loadContacts]);

  const patchRow = async (id, patch) => {
    // Optimistic update
    setContacts(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      const r = await axios.patch(`${API}/telecalling/contacts/${id}`, patch, { headers: getAuthHeaders() });
      setContacts(cs => cs.map(c => c.id === id ? r.data : c));
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Update failed');
      loadContacts();
    }
  };

  const deleteRow = async (id) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await axios.delete(`${API}/telecalling/contacts/${id}`, { headers: getAuthHeaders() });
      setContacts(cs => cs.filter(c => c.id !== id));
    } catch { toast.error('Delete failed'); }
  };

  const kpis = useMemo(() => {
    let made = 0, picked = 0, interested = 0, meetings = 0;
    contacts.forEach(c => {
      if (c.call_picked === 'yes' || c.call_picked === 'no') made += 1;
      if (c.call_picked === 'yes') picked += 1;
      if (c.lead_interested === 'yes') interested += 1;
      if (c.meeting_at) meetings += 1;
    });
    return { made, picked, interested, meetings };
  }, [contacts]);

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto" data-testid="admin-telecalling">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Phone className="w-6 h-6 text-indigo-600" /> Telecalling</h1>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'queue' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('queue')} data-testid="tc-tab-queue">Queue</button>
              <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'reports' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('reports')} data-testid="tc-tab-reports">Reports</button>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowImport(true)} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="tc-import-btn">
                <Upload className="w-4 h-4 mr-1" /> Import
              </Button>
            )}
          </div>
        </div>

        {tab === 'queue' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Calls Made', val: kpis.made, color: 'from-slate-600 to-slate-400' },
                { label: 'Picked', val: kpis.picked, color: 'from-emerald-600 to-emerald-400' },
                { label: 'Interested', val: kpis.interested, color: 'from-indigo-600 to-indigo-400' },
                { label: 'Meetings Booked', val: kpis.meetings, color: 'from-amber-600 to-amber-400' },
              ].map(c => (
                <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 text-white`}>
                  <p className="text-white/70 text-xs font-medium mb-1">{c.label}</p>
                  <p className="text-2xl font-bold">{c.val}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 items-center bg-white rounded-lg border border-slate-200 p-2">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name / phone / school..."
                  className="w-full pl-8 pr-2 h-9 border border-slate-200 rounded text-sm" data-testid="tc-search" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="h-9 px-2 border border-slate-200 rounded text-xs bg-white" data-testid="tc-filter-status">
                <option value="all">All statuses</option>
                <option value="unworked">Unworked</option>
                <option value="picked">Picked</option>
                <option value="not_picked">Not picked</option>
                <option value="interested">Interested</option>
                <option value="not_interested">Not interested</option>
              </select>
              {isAdmin && (
                <select value={assigneeFilter} onChange={(e) => setAssigneeFilter(e.target.value)}
                  className="h-9 px-2 border border-slate-200 rounded text-xs bg-white" data-testid="tc-filter-assignee">
                  <option value="all">All assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
                </select>
              )}
              <div className="ml-auto text-xs text-slate-500">{contacts.length} rows</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
              {loading ? (
                <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
              ) : contacts.length === 0 ? (
                <div className="text-center text-slate-500 text-sm p-8">
                  {isAdmin ? 'No contacts yet — click Import to upload a spreadsheet.' : 'No contacts assigned to you yet.'}
                </div>
              ) : (
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                    <tr>
                      <th className="px-2 py-2 text-left">Contact</th>
                      <th className="px-2 py-2 text-left">Phone</th>
                      <th className="px-2 py-2 text-left">School</th>
                      <th className="px-2 py-2 text-left">City</th>
                      <th className="px-2 py-2 text-left">Picked?</th>
                      <th className="px-2 py-2 text-left">Interested?</th>
                      <th className="px-2 py-2 text-left">Note</th>
                      {isAdmin && <th className="px-2 py-2 text-left">Assignee</th>}
                      <th className="px-2 py-2 text-left">CRM</th>
                      {isAdmin && <th className="px-2 py-2 text-left"></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => (
                      <ContactRow key={c.id} row={c} isAdmin={isAdmin} users={users}
                        onPatch={patchRow}
                        onOpenInterested={setInterestedRow}
                        onDelete={deleteRow} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'reports' && <ReportsTab />}
      </div>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onDone={loadContacts} users={users} />
      <InterestedLeadModal open={!!interestedRow} contact={interestedRow} onClose={() => setInterestedRow(null)} onSaved={loadContacts} />
    </AdminLayout>
  );
}
