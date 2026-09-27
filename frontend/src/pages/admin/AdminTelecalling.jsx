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

const BOARDS = ['CBSE', 'ICSE', 'IB', 'IGCSE', 'State Board', 'Other'];
const SCHOOL_CONTACT_ROLES = [
  'Principal', 'Director', 'Trustee / Owner', 'Vice Principal',
  'Coordinator', 'Primary Coordinator', 'Secondary Coordinator',
  'Computer Teacher', 'Teacher', 'Head of Department', 'Accounts', 'Admin', 'Other',
];

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
  const [showMeeting, setShowMeeting] = useState(false);

  useEffect(() => {
    if (open && contact) {
      setForm({
        name:                contact.name || '',
        phone:               contact.phone || '',
        email:               contact.email || '',
        role:                contact.role || '',
        school_name:         contact.school_name || '',
        city:                contact.city || '',
        board:               contact.board || '',
        notes:               contact.notes || '',
        products_interested: contact.products_interested || [],
        contacts:            contact.contacts || [],
        meeting_at:          contact.meeting_at || '',
        meeting_mode:        contact.meeting_mode || '',
        meeting_link:        contact.meeting_link || '',
        meeting_address:     contact.meeting_address || '',
      });
      setShowMeeting(!!(contact.meeting_at || contact.meeting_mode));
    }
  }, [open, contact]);

  const toggleProduct = (id) => setForm(f => ({
    ...f,
    products_interested: (f.products_interested || []).includes(id)
      ? f.products_interested.filter(x => x !== id)
      : [...(f.products_interested || []), id],
  }));

  const updateSubContact = (i, k, v) => setForm(f => ({
    ...f, contacts: (f.contacts || []).map((c, idx) => idx === i ? { ...c, [k]: v } : c),
  }));
  const addSubContact = () => setForm(f => ({
    ...f, contacts: [...(f.contacts || []), { name: '', phone: '', email: '', role: '' }],
  }));
  const removeSubContact = (i) => setForm(f => ({
    ...f, contacts: (f.contacts || []).filter((_, idx) => idx !== i),
  }));

  const save = async () => {
    if (!contact) return;
    setSaving(true);
    try {
      const patch = { ...form, lead_interested: 'yes' };
      // Strip empty sub-contacts
      patch.contacts = (patch.contacts || []).filter(c => c.name?.trim() || c.phone?.trim());
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="tc-interested-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> Interested Lead — {contact.name || contact.phone}</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          {/* Primary Contact */}
          <div className="rounded-lg border border-slate-200 p-3 bg-slate-50/60">
            <div className="text-[10px] uppercase font-bold text-slate-500 mb-2">Primary Contact</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Name</label>
                <Input className="h-9 text-sm" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="tci-name" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Phone</label>
                <Input className="h-9 text-sm" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="tci-phone" />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Email</label>
                <Input className="h-9 text-sm" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 mb-0.5">Role</label>
                <select className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white"
                  value={form.role || ''} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="tci-role">
                  <option value="">Select role</option>
                  {SCHOOL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* School details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">School</label>
              <Input value={form.school_name || ''} onChange={(e) => setForm({ ...form, school_name: e.target.value })} data-testid="tci-school" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
              <Input value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Board</label>
              <select className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                value={form.board || ''} onChange={(e) => setForm({ ...form, board: e.target.value })} data-testid="tci-board">
                <option value="">Select</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Products */}
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

          {/* Additional Contacts */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">More contacts</div>
              <button type="button" onClick={addSubContact} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1" data-testid="tci-add-contact"><Plus className="w-3 h-3" /> Add contact</button>
            </div>
            {(form.contacts || []).map((c, i) => (
              <div key={i} className="grid grid-cols-12 gap-1.5 mb-1.5" data-testid={`tci-contact-${i}`}>
                <Input className="col-span-3 h-9 text-xs" placeholder="Name" value={c.name || ''} onChange={(e) => updateSubContact(i, 'name', e.target.value)} />
                <Input className="col-span-3 h-9 text-xs" placeholder="Phone" value={c.phone || ''} onChange={(e) => updateSubContact(i, 'phone', e.target.value)} />
                <Input className="col-span-3 h-9 text-xs" placeholder="Email" value={c.email || ''} onChange={(e) => updateSubContact(i, 'email', e.target.value)} />
                <select className="col-span-2 h-9 px-1 border border-slate-200 rounded-lg text-xs bg-white"
                  value={c.role || ''} onChange={(e) => updateSubContact(i, 'role', e.target.value)}>
                  <option value="">Role</option>
                  {SCHOOL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <button type="button" onClick={() => removeSubContact(i)} className="col-span-1 rounded-lg border border-slate-200 hover:border-red-300 hover:text-red-500 text-slate-400 flex items-center justify-center"><X className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>

          {/* Schedule Meeting — action point */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
            <button type="button" onClick={() => setShowMeeting(s => !s)}
              className="w-full flex items-center justify-between text-left" data-testid="tci-toggle-meeting">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Schedule Meeting {form.meeting_at && '· ' + form.meeting_at.slice(0, 16).replace('T', ' ')}</span>
              {showMeeting ? <ChevronDown className="w-4 h-4 text-indigo-600" /> : <ChevronRight className="w-4 h-4 text-indigo-600" />}
            </button>
            {showMeeting && (
              <div className="mt-2 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Date & Time</label>
                    <Input type="datetime-local" className="h-9 text-sm" value={form.meeting_at || ''} onChange={(e) => setForm({ ...form, meeting_at: e.target.value })} data-testid="tci-meeting-datetime" />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Mode</label>
                    <div className="flex gap-1" data-testid="tci-meeting-mode">
                      {['online', 'offline'].map(m => {
                        const active = form.meeting_mode === m;
                        return (
                          <button key={m} type="button" onClick={() => setForm({ ...form, meeting_mode: m })}
                            className={`flex-1 h-9 rounded-lg border-2 text-xs font-bold uppercase transition ${active ? 'bg-indigo-100 text-indigo-700 border-indigo-500' : 'border-slate-200 text-slate-500'}`}
                            data-testid={`tci-meeting-mode-${m}`}
                          >{m}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {form.meeting_mode === 'online' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Meeting Link</label>
                    <Input className="h-9 text-sm" placeholder="https://meet.google.com/..." value={form.meeting_link || ''} onChange={(e) => setForm({ ...form, meeting_link: e.target.value })} data-testid="tci-meeting-link" />
                  </div>
                )}
                {form.meeting_mode === 'offline' && (
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-0.5">Address</label>
                    <textarea rows={2} placeholder="Meeting venue address..." value={form.meeting_address || ''} onChange={(e) => setForm({ ...form, meeting_address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm" data-testid="tci-meeting-address" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
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
// Follow-up cell (quick presets + custom picker) — renders the popover
// with `position: fixed` so it isn't clipped by the table container.
const FollowupCell = ({ row, onChange, testid }) => {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const b = btnRef.current?.getBoundingClientRect();
    if (b) {
      // Anchor the 240px popover above the button when there isn't
      // enough space below — otherwise place it below.
      const vh = window.innerHeight;
      const below = vh - b.bottom;
      const popH = 260;
      const top = below < popH ? Math.max(8, b.top - popH - 4) : b.bottom + 4;
      setPos({ top, left: Math.min(window.innerWidth - 250, Math.max(8, b.left)) });
    }
    const onClick = (e) => { if (popRef.current && !popRef.current.contains(e.target) && !btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const iso = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const now = new Date();
  const eod = new Date(now); eod.setHours(18, 0, 0, 0);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const in2 = new Date(now); in2.setDate(in2.getDate() + 2);
  const in3 = new Date(now); in3.setDate(in3.getDate() + 3);

  const presets = [
    { label: 'Today EOD (6 PM)', value: iso(eod) },
    { label: 'Tomorrow, same time', value: iso(tomorrow) },
    { label: '+2 days',            value: iso(in2) },
    { label: '+3 days',            value: iso(in3) },
  ];

  const label = row.followup_at
    ? new Date(row.followup_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).replace(',', '')
    : 'Set';
  const overdue = row.followup_at && new Date(row.followup_at) < new Date();

  return (
    <>
      <button
        ref={btnRef}
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        className={`whitespace-nowrap inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded border transition ${
          row.followup_at
            ? overdue ? 'bg-rose-50 text-rose-700 border-rose-200'
                     : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'border-slate-200 text-slate-500 hover:border-indigo-400 hover:text-indigo-600'
        }`}
        data-testid={testid}
      >
        <Calendar className="w-3 h-3 shrink-0" /> <span className="whitespace-nowrap">{label}</span>
      </button>
      {open && (
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: 240 }}
          className="z-[1000] bg-white border border-slate-200 rounded-lg shadow-xl p-2 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          {presets.map(p => (
            <button key={p.label}
              onClick={() => { onChange(p.value); setOpen(false); }}
              className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-slate-50"
              data-testid={`${testid}-preset`}
            >
              {p.label}
            </button>
          ))}
          <div className="border-t border-slate-100 pt-2">
            <label className="block text-[10px] text-slate-500 mb-1 px-1">Custom date/time</label>
            <input type="datetime-local" value={custom} onChange={(e) => setCustom(e.target.value)}
              className="w-full h-8 px-2 border border-slate-200 rounded text-xs" data-testid={`${testid}-custom-input`} />
            <div className="flex gap-1 mt-1">
              <button onClick={() => { if (custom) { onChange(custom); setOpen(false); } }}
                className="flex-1 h-7 rounded bg-[#1E3A5F] text-white text-xs font-semibold hover:bg-[#0F203E]"
                data-testid={`${testid}-custom-save`}>Set</button>
              {row.followup_at && (
                <button onClick={() => { onChange(null); setOpen(false); }}
                  className="h-7 px-2 rounded border border-rose-200 text-rose-600 text-xs">Clear</button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const STATUS_OPTIONS = [
  { value: 'new',        label: 'New',        color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'follow_up',  label: 'Follow-up',  color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  { value: 'no_answer',  label: 'No Answer',  color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'interested', label: 'Interested', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
];

// ─────────────────────────────────────────────────────────────────
// Row (Excel-like)
// Excel-like table styles — every cell gets a right + bottom border
const CELL = 'px-2 py-1.5 border-r border-slate-200 border-b';
const HEAD = 'px-2 py-2 text-left border-r border-slate-200 border-b bg-slate-50 text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap';

const ContactRow = ({ row, idx, isAdmin, users, onPatch, onOpenInterested, onDelete }) => {
  const noteRef = useRef(null);
  const [note, setNote] = useState(row.notes || '');
  useEffect(() => { setNote(row.notes || ''); }, [row.id, row.notes]);

  const commit = (field, value) => { onPatch(row.id, { [field]: value }); };
  const commitNote = () => { if (note !== (row.notes || '')) commit('notes', note); };

  const statusMeta = STATUS_OPTIONS.find(s => s.value === (row.status || 'new')) || STATUS_OPTIONS[0];
  const createdAt = row.created_at
    ? new Date(row.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
    : '—';

  return (
    <tr className="hover:bg-slate-50/60 text-xs" data-testid={`tc-row-${row.id}`}>
      <td className={`${CELL} text-slate-400 font-mono w-8 text-right`}>{idx + 1}</td>
      <td className={`${CELL} whitespace-nowrap`}>
        <div className="font-medium text-slate-800">{row.name || <span className="text-slate-400 italic">—</span>}</div>
        <div className="text-[10px] text-slate-500">{row.source || ''}</div>
      </td>
      <td className={`${CELL} font-mono whitespace-nowrap`}>
        <a href={`tel:${row.phone}`} className="text-indigo-700 hover:underline" data-testid={`tc-phone-${row.id}`}>{row.phone}</a>
      </td>
      <td className={CELL}>{row.school_name || <span className="text-slate-400 italic">—</span>}</td>
      <td className={CELL}>{row.city || <span className="text-slate-400 italic">—</span>}</td>
      <td className={`${CELL} text-slate-500 whitespace-nowrap`}>{createdAt}</td>
      <td className={CELL}>
        <select
          value={row.status || 'new'}
          onChange={(e) => commit('status', e.target.value)}
          className={`h-6 px-1 rounded border text-[10px] font-semibold whitespace-nowrap ${statusMeta.color}`}
          data-testid={`tc-status-${row.id}`}
        >
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </td>
      <td className={CELL}>
        <YN value={row.call_picked} onChange={(v) => commit('call_picked', v)} testid={`tc-picked-${row.id}`} />
      </td>
      <td className={CELL}>
        <YN
          value={row.lead_interested}
          onChange={(v) => {
            if (v === 'yes') onOpenInterested(row);
            else commit('lead_interested', v);
          }}
          testid={`tc-interested-${row.id}`}
        />
      </td>
      <td className={`${CELL} min-w-[180px]`}>
        <textarea ref={noteRef} value={note} onChange={(e) => setNote(e.target.value)} onBlur={commitNote}
          rows={1} placeholder="Add note..." className="w-full text-xs px-1 py-0.5 border-0 bg-transparent resize-none focus:outline-none focus:bg-white focus:border focus:border-slate-300 rounded"
          data-testid={`tc-note-${row.id}`} />
      </td>
      <td className={CELL}>
        <FollowupCell row={row} onChange={(v) => commit('followup_at', v)} testid={`tc-followup-${row.id}`} />
      </td>
      {isAdmin && (
        <td className={CELL}>
          <select value={row.assigned_to || ''} onChange={(e) => commit('assigned_to', e.target.value || null)}
            className="text-xs h-7 px-1 border border-slate-200 rounded bg-white max-w-[130px]" data-testid={`tc-assigned-${row.id}`}>
            <option value="">Unassigned</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
          </select>
        </td>
      )}
      <td className={CELL}>
        {row.school_inquiry_id ? (
          <a href={`/admin/schools?school_id=${row.school_inquiry_id}`} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-emerald-700 hover:underline whitespace-nowrap"><Building2 className="w-3 h-3" /> CRM</a>
        ) : (
          <span className="text-slate-400 italic">—</span>
        )}
      </td>
      {isAdmin && (
        <td className={CELL}>
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
  const [sortDesc, setSortDesc] = useState(true);   // Date Added sort direction
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
                <option value="new">New</option>
                <option value="follow_up">Follow-up</option>
                <option value="no_answer">No Answer</option>
                <option value="interested">Interested</option>
                <option value="not_picked">Not picked</option>
                <option value="unworked">Unworked</option>
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
                <table className="w-full text-xs border-collapse" data-testid="tc-table">
                  <thead>
                    <tr>
                      <th className={`${HEAD} w-8`}>#</th>
                      <th className={HEAD}>Contact</th>
                      <th className={HEAD}>Phone</th>
                      <th className={HEAD}>School</th>
                      <th className={HEAD}>City</th>
                      <th className={`${HEAD} cursor-pointer select-none`} onClick={() => setSortDesc(s => !s)} data-testid="tc-sort-date">
                        Date Added {sortDesc ? '↓' : '↑'}
                      </th>
                      <th className={HEAD}>Status</th>
                      <th className={HEAD}>Picked?</th>
                      <th className={HEAD}>Interested?</th>
                      <th className={HEAD}>Note</th>
                      <th className={HEAD}>Follow-up</th>
                      {isAdmin && <th className={HEAD}>Assignee</th>}
                      <th className={HEAD}>CRM</th>
                      {isAdmin && <th className={HEAD}></th>}
                    </tr>
                  </thead>
                  <tbody>
                    {[...contacts]
                      .sort((a, b) => {
                        const av = a.created_at || ''; const bv = b.created_at || '';
                        return sortDesc ? bv.localeCompare(av) : av.localeCompare(bv);
                      })
                      .map((c, idx) => (
                        <ContactRow key={c.id} row={c} idx={idx} isAdmin={isAdmin} users={users}
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
