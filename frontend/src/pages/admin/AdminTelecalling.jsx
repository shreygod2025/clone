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
  UserPlus, MessageSquare, Mail, MapPin, AlertTriangle, PenSquare, Trash2,
  Clock, RefreshCw,
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
  { id: 'techfest_iit_bombay', label: 'Techfest, IIT Bombay' },
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
  const [batchName, setBatchName] = useState('');
  const [uploading, setUploading] = useState(false);
  const { getAuthHeaders } = useAuth();

  useEffect(() => {
    if (open) { setFile(null); setAssignMode('single'); setAssignedTo(''); setAutoPool([]); setDefaultSource(''); setBatchName(''); }
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
      if (batchName) fd.append('batch_name', batchName);
      const r = await axios.post(`${API}/telecalling/import`, fd, { headers: getAuthHeaders() });
      const dupPart = r.data.duplicates ? `, ${r.data.duplicates} duplicate${r.data.duplicates === 1 ? '' : 's'} skipped` : '';
      toast.success(`Imported ${r.data.inserted} contacts into "${r.data.batch_name}" (${r.data.skipped} empty${dupPart})`);
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
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}{u._has_tc ? '' : '  — grant Telecalling access'}
                  </option>
                ))}
              </select>
              {assignedTo && !(users.find(u => u.id === assignedTo)?._has_tc) && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This user doesn&rsquo;t have <b>Telecalling</b> permission — grant it in Admin &rarr; Users &amp; Roles so they can open the queue.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Auto-assign pool</label>
              <div className="grid grid-cols-2 gap-1 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-lg">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-xs cursor-pointer p-1 hover:bg-slate-50 rounded">
                    <input type="checkbox" checked={autoPool.includes(u.id)} onChange={() => togglePool(u.id)} data-testid={`tc-pool-${u.id}`} />
                    <span className={u._has_tc ? '' : 'text-slate-500'}>
                      {u.name || u.email}
                      {!u._has_tc && <span className="ml-1 text-[10px] text-amber-600" title="No telecalling access">⚠</span>}
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Rows are distributed round-robin across selected people. <span className="text-amber-600">⚠ = needs Telecalling permission</span>.</p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Default source (optional)</label>
            <Input value={defaultSource} onChange={(e) => setDefaultSource(e.target.value)} placeholder="e.g. Winter Campaign 2026" data-testid="tc-default-source" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Tab / Sheet name (optional)</label>
            <Input value={batchName} onChange={(e) => setBatchName(e.target.value)}
              placeholder={file?.name?.replace(/\.[^.]+$/, '') || 'Auto-named from file'}
              data-testid="tc-batch-name-input" />
            <p className="text-[11px] text-slate-500 mt-1">Each import becomes its own tab in the queue. You can rename or delete the tab later.</p>
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
// Add Single Client / Lead modal (Direct B2B calling sheet entry)
const AddClientModal = ({ open, onClose, onDone, users, isAdmin, currentUserId, batches }) => {
  const { getAuthHeaders } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    alt_phone: '',
    email: '',
    role: '',
    school_name: '',
    city: '',
    board: '',
    assigned_to: '',
    source: 'Direct Entry',
    batch_name: 'Direct Calling Sheet',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        name: '',
        phone: '',
        alt_phone: '',
        email: '',
        role: '',
        school_name: '',
        city: '',
        board: '',
        assigned_to: isAdmin ? '' : (currentUserId || ''),
        source: 'Direct Entry',
        batch_name: 'Direct Calling Sheet',
        notes: '',
      });
    }
  }, [open, isAdmin, currentUserId]);

  const submit = async (e) => {
    e?.preventDefault();
    if (!form.name.trim()) return toast.error('Contact person name is required');
    if (!form.phone.trim()) return toast.error('Phone number is required');

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        alt_phone: form.alt_phone.trim() || undefined,
        email: form.email.trim() || undefined,
        role: form.role.trim() || undefined,
        school_name: form.school_name.trim() || undefined,
        city: form.city.trim() || undefined,
        board: form.board.trim() || undefined,
        assigned_to: form.assigned_to || undefined,
        source: form.source.trim() || 'Direct Entry',
        batch_name: form.batch_name.trim() || 'Direct Calling Sheet',
        notes: form.notes.trim() || undefined,
      };
      await axios.post(`${API}/telecalling/contacts`, payload, { headers: getAuthHeaders() });
      toast.success('Client added to calling sheet successfully');
      onDone();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Failed to add contact');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto" data-testid="tc-add-client-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Add B2B Client / Lead to Calling Sheet
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Dr. Sunita Sharma"
                required
                data-testid="tc-add-name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <Input
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="e.g. 9876543210"
                required
                data-testid="tc-add-phone"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Alternate Phone</label>
              <Input
                value={form.alt_phone}
                onChange={e => setForm({ ...form, alt_phone: e.target.value })}
                placeholder="e.g. 022-28475892"
                data-testid="tc-add-alt-phone"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="e.g. principal@school.edu"
                data-testid="tc-add-email"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">School / Organization</label>
              <Input
                value={form.school_name}
                onChange={e => setForm({ ...form, school_name: e.target.value })}
                placeholder="e.g. Delhi Public School"
                data-testid="tc-add-school"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Designation</label>
              <select
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                data-testid="tc-add-role"
              >
                <option value="">Select role</option>
                {SCHOOL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <Input
                value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Mumbai, Pune, Bangalore"
                data-testid="tc-add-city"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Board</label>
              <select
                value={form.board}
                onChange={e => setForm({ ...form, board: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                data-testid="tc-add-board"
              >
                <option value="">Select board</option>
                {BOARDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {isAdmin ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assign to Caller</label>
                <select
                  value={form.assigned_to}
                  onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white"
                  data-testid="tc-add-assigned-to"
                >
                  <option value="">Auto / Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Source</label>
                <Input
                  value={form.source}
                  onChange={e => setForm({ ...form, source: e.target.value })}
                  placeholder="e.g. Direct Entry, Inbound, Referral"
                  data-testid="tc-add-source"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Calling Sheet / Batch Name</label>
              <Input
                value={form.batch_name}
                onChange={e => setForm({ ...form, batch_name: e.target.value })}
                placeholder="e.g. Direct Calling Sheet"
                data-testid="tc-add-batch-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Initial context, reference, or call notes..."
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              data-testid="tc-add-notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="tc-add-client-submit"
            >
              {submitting ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add to Calling Sheet
            </Button>
          </div>
        </form>
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
      const patch = { ...form, lead_interested: 'yes', call_picked: 'yes' };
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

const ContactRow = ({ row, idx, isAdmin, users, onPatch, onOpenInterested, onDelete, selected = false, onToggleSelected, extraColumns = [] }) => {
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
    <tr className={`hover:bg-slate-50/60 text-xs ${selected ? 'bg-indigo-50/60' : ''}`} data-testid={`tc-row-${row.id}`}>
      {isAdmin && (
        <td className={`${CELL} w-8 text-center`}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelected && onToggleSelected()}
            className="rounded"
            data-testid={`tc-select-${row.id}`}
            aria-label={`Select ${row.name || row.phone}`}
          />
        </td>
      )}
      <td className={`${CELL} text-slate-400 font-mono w-8 text-right`}>{idx + 1}</td>
      <td className={`${CELL} whitespace-nowrap`}>
        <div className="font-medium text-slate-800">{row.name || <span className="text-slate-400 italic">—</span>}</div>
        <div className="text-[10px] text-slate-500">{row.source || ''}</div>
      </td>
      <td className={`${CELL} font-mono whitespace-nowrap`}>
        <a href={`tel:${row.phone}`} className="text-indigo-700 hover:underline" data-testid={`tc-phone-${row.id}`}>{row.phone}</a>
      </td>
      <td className={`${CELL} whitespace-nowrap`}>
        {row.email ? (
          <a href={`mailto:${row.email}`} className="text-indigo-600 hover:underline" data-testid={`tc-email-${row.id}`}>{row.email}</a>
        ) : (
          <span className="text-slate-400 italic">—</span>
        )}
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
      <td className={`${CELL} max-w-[220px]`} data-testid={`tc-products-${row.id}`}>
        {row.lead_interested === 'yes' && (row.products_interested || []).length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(row.products_interested || []).map(pid => {
              const label = OLL_PRODUCTS.find(p => p.id === pid)?.label || pid;
              return (
                <span key={pid} className="inline-block text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded whitespace-nowrap">
                  {label}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-slate-300 italic text-[10px]">—</span>
        )}
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
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name || u.email}{u._has_tc ? '' : ' ⚠'}
              </option>
            ))}
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
      {extraColumns.map(col => (
        <td key={col} className={`${CELL} whitespace-nowrap max-w-[200px] truncate`} title={row.extra_fields?.[col] || ''} data-testid={`tc-extra-${row.id}-${col}`}>
          {row.extra_fields?.[col] || <span className="text-slate-300 italic">—</span>}
        </td>
      ))}
      {isAdmin && (
        <td className={CELL}>
          <button onClick={() => onDelete(row.id)} className="text-slate-400 hover:text-rose-600" data-testid={`tc-del-${row.id}`}><X className="w-3.5 h-3.5" /></button>
        </td>
      )}
    </tr>
  );
};

// ─────────────────────────────────────────────────────────────────
// Reports tab: Comprehensive Executive Calling Analytics & Side-by-Side Comparison
const ReportsTab = ({ onOpenCallerSheet }) => {
  const { getAuthHeaders } = useAuth();
  const [period, setPeriod] = useState('this_month');
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedUser, setExpandedUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('period', period);
      if (period === 'month') params.set('month', month);
      if (period === 'custom' && dateFrom && dateTo) {
        params.set('date_from', dateFrom);
        params.set('date_to', dateTo);
      }
      const r = await axios.get(`${API}/telecalling/reports?${params}`, { headers: getAuthHeaders() });
      setData(r.data);
    } catch {
      toast.error('Failed to load calling reports');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, period, month, dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = data?.rows || [];
  const summary = data?.summary || {
    active_callers: 0,
    total_calls_made: 0,
    total_calls_picked: 0,
    total_leads_interested: 0,
    total_meetings_booked: 0,
    overall_connection_rate: 0,
    overall_interest_rate: 0,
    total_assigned_contacts: 0,
    total_unworked_contacts: 0,
    total_followups_pending: 0,
  };

  const exportCsv = () => {
    if (!rows.length) return toast.error('No caller data to export');
    const headers = [
      'Caller Name',
      'Assigned in Sheet',
      'Calls Made',
      'Picked / Connected',
      'Connection Rate %',
      'Interested Leads',
      'Interest Rate %',
      'Meetings Booked',
      'Unworked in Sheet',
      'Pending Follow-ups',
      'Converted to CRM',
    ];
    const lines = [headers.join(',')];
    rows.forEach(r => {
      lines.push([
        `"${(r.user_name || 'Caller').replace(/"/g, '""')}"`,
        r.contacts?.total_assigned || 0,
        r.totals?.call_made || 0,
        r.totals?.call_picked || 0,
        `${r.rates?.connection_rate || 0}%`,
        r.totals?.lead_interested || 0,
        `${r.rates?.interest_rate || 0}%`,
        r.totals?.meeting_booked || 0,
        r.contacts?.unworked || 0,
        r.contacts?.followups_pending || 0,
        r.contacts?.converted_inquiries || 0,
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `telecalling-caller-comparison-${period}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Caller comparison CSV downloaded');
  };

  return (
    <div className="space-y-5" data-testid="tc-reports-section">
      {/* Filter and Action Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-indigo-600" /> Period:
          </span>
          {[
            ['today', 'Today'],
            ['yesterday', 'Yesterday'],
            ['this_week', 'This Week'],
            ['this_month', 'This Month'],
            ['all_time', 'All Time'],
            ['custom', 'Custom Range'],
          ].map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                period === p
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              data-testid={`tc-rep-period-${p}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {period === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-7 px-2 border border-slate-200 rounded text-xs bg-white"
                data-testid="tc-rep-date-from"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-7 px-2 border border-slate-200 rounded text-xs bg-white"
                data-testid="tc-rep-date-to"
              />
              <Button size="sm" onClick={load} className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700">Apply</Button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-9 text-xs"
            title="Refresh calling stats"
            data-testid="tc-rep-refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!rows.length}
            className="h-9 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            data-testid="tc-rep-export-csv"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Date Range Sub-label */}
      {data && (
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div>
            Showing calling performance from <span className="font-semibold text-slate-700">{data.date_from}</span> to <span className="font-semibold text-slate-700">{data.date_to}</span>
          </div>
          <div>{summary.active_callers} callers active / assigned</div>
        </div>
      )}

      {/* Executive Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="tc-executive-kpis">
        <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Calls Made</p>
          <p className="text-2xl font-bold mt-1">{summary.total_calls_made}</p>
          <p className="text-[10px] text-white/70 mt-1">{summary.active_callers} callers logged</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Picked (Connected)</p>
          <p className="text-2xl font-bold mt-1">{summary.total_calls_picked}</p>
          <div className="flex items-center gap-1 text-[10px] text-white/80 mt-1">
            <span className="font-bold bg-white/20 px-1 rounded">{summary.overall_connection_rate}%</span>
            <span>conn. rate</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Interested Leads</p>
          <p className="text-2xl font-bold mt-1">{summary.total_leads_interested}</p>
          <div className="flex items-center gap-1 text-[10px] text-white/80 mt-1">
            <span className="font-bold bg-white/20 px-1 rounded">{summary.overall_interest_rate}%</span>
            <span>of picked</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Meetings Booked</p>
          <p className="text-2xl font-bold mt-1">{summary.total_meetings_booked}</p>
          <p className="text-[10px] text-white/80 mt-1">B2B presentations</p>
        </div>

        <div className="bg-gradient-to-br from-purple-600 to-indigo-900 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Total in Sheets</p>
          <p className="text-2xl font-bold mt-1">{summary.total_assigned_contacts}</p>
          <p className="text-[10px] text-white/80 mt-1">{summary.total_unworked_contacts} unworked</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500 to-pink-700 rounded-xl p-3.5 text-white shadow-sm">
          <p className="text-white/70 text-[11px] font-semibold uppercase tracking-wider">Follow-ups</p>
          <p className="text-2xl font-bold mt-1">{summary.total_followups_pending}</p>
          <p className="text-[10px] text-white/80 mt-1">Scheduled calls</p>
        </div>
      </div>

      {/* Side-by-Side Caller Comparison Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden" data-testid="tc-caller-comparison-card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Side-by-Side Caller Comparison &amp; Sheet Status
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Live comparison across all callers. Replaces manual Excel checking — click &ldquo;Open Calling Sheet&rdquo; to inspect or work any caller&rsquo;s sheet.
            </p>
          </div>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full border border-indigo-200">
            {rows.length} Calling Sheets Monitored
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-2" />
            <p className="text-xs">Aggregating calling metrics...</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            No telecaller activity recorded for this period.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left" data-testid="tc-caller-comparison-table">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500">
                <tr>
                  <th className="px-3 py-3">Caller</th>
                  <th className="px-3 py-3 text-right">Sheet Contacts</th>
                  <th className="px-3 py-3 text-right">Calls Made</th>
                  <th className="px-3 py-3 text-right">Connected</th>
                  <th className="px-3 py-3 text-right">Connection %</th>
                  <th className="px-3 py-3 text-right">Interested</th>
                  <th className="px-3 py-3 text-right">Interest %</th>
                  <th className="px-3 py-3 text-right">Meetings</th>
                  <th className="px-3 py-3 text-right">Unworked</th>
                  <th className="px-3 py-3 text-right">Follow-ups</th>
                  <th className="px-3 py-3 text-right">CRM Converted</th>
                  <th className="px-3 py-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(r => {
                  const connRate = r.rates?.connection_rate || 0;
                  const intRate = r.rates?.interest_rate || 0;
                  const made = r.totals?.call_made || 0;
                  const picked = r.totals?.call_picked || 0;
                  const interested = r.totals?.lead_interested || 0;
                  const meetings = r.totals?.meeting_booked || 0;
                  const assigned = r.contacts?.total_assigned || 0;
                  const unworked = r.contacts?.unworked || 0;
                  const followups = r.contacts?.followups_pending || 0;
                  const converted = r.contacts?.converted_inquiries || 0;
                  const isExpanded = expandedUser === r.user_id;

                  return (
                    <tr key={r.user_id} className="hover:bg-slate-50/70 transition" data-testid={`tc-caller-row-${r.user_id}`}>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setExpandedUser(isExpanded ? null : r.user_id)}
                            className="text-slate-400 hover:text-slate-700"
                            title="Toggle daily breakdown"
                            data-testid={`tc-rep-expand-${r.user_id}`}
                          >
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <div>
                            <div className="font-bold text-slate-800 text-xs">{r.user_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{r.user_id ? r.user_id.slice(0, 8) + '...' : ''}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-slate-700 font-mono">
                        {assigned}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-slate-900 font-mono">
                        {made}
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-blue-700 font-mono">
                        {picked}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          connRate >= 50
                            ? 'bg-emerald-100 text-emerald-800'
                            : connRate >= 30
                            ? 'bg-blue-100 text-blue-800'
                            : connRate > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {connRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-emerald-700 font-mono">
                        {interested}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          intRate >= 20
                            ? 'bg-emerald-100 text-emerald-800'
                            : intRate > 0
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {intRate}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-bold text-amber-600 font-mono">
                        {meetings}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 font-mono">
                        {unworked > 0 ? (
                          <span className="text-amber-600 font-semibold">{unworked}</span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-600 font-mono">
                        {followups}
                      </td>
                      <td className="px-3 py-3 text-right text-purple-700 font-semibold font-mono">
                        {converted}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onOpenCallerSheet && onOpenCallerSheet(r.user_id)}
                          className="h-7 text-[11px] px-2.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                          data-testid={`tc-open-sheet-${r.user_id}`}
                        >
                          <FileSpreadsheet className="w-3 h-3 mr-1 text-indigo-500" />
                          Open Sheet
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expanded User Daily Log Drawer */}
      {expandedUser && (() => {
        const userRow = rows.find(r => r.user_id === expandedUser);
        if (!userRow || !userRow.days?.length) return null;
        return (
          <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm" data-testid="tc-rep-daily-drawer">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                Day-by-Day Calling Activity for <span className="text-indigo-600">{userRow.user_name}</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setExpandedUser(null)}
                className="h-7 text-xs text-slate-500"
              >
                Close Daily Breakdown ✕
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-right">Calls Made</th>
                    <th className="px-3 py-2 text-right">Connected</th>
                    <th className="px-3 py-2 text-right">Interested</th>
                    <th className="px-3 py-2 text-right">Meetings Booked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userRow.days.map(d => (
                    <tr key={d.day} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono font-medium text-slate-700">{d.day}</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-900 font-mono">{d.call_made}</td>
                      <td className="px-3 py-2 text-right font-bold text-blue-700 font-mono">{d.call_picked}</td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700 font-mono">{d.lead_interested}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-600 font-mono">{d.meeting_booked}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
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
  const [callers, setCallers] = useState([]);
  const [showAddClient, setShowAddClient] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [sortDesc, setSortDesc] = useState(true);   // Date Added sort direction
  const [showImport, setShowImport] = useState(false);
  const [interestedRow, setInterestedRow] = useState(null);
  // Batches (imported sheets → tabs)
  const [batches, setBatches] = useState([]);
  const [activeBatch, setActiveBatch] = useState('all');   // 'all' | batch_id
  const [renamingBatch, setRenamingBatch] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  // Bulk selection
  const [selected, setSelected] = useState(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  const [bulkAssignUser, setBulkAssignUser] = useState('');

  const loadBatches = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/telecalling/batches`, { headers: getAuthHeaders() });
      setBatches(r.data.items || []);
    } catch { /* silent — batches optional */ }
  }, [getAuthHeaders]);

  const loadCallers = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/telecalling/callers`, { headers: getAuthHeaders() });
      setCallers(r.data.callers || []);
    } catch { /* silent */ }
  }, [getAuthHeaders]);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '2000');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search) params.set('search', search);
      if (isAdmin && assigneeFilter !== 'all') params.set('assigned_to', assigneeFilter);
      if (activeBatch && activeBatch !== 'all') params.set('batch_id', activeBatch);
      const r = await axios.get(`${API}/telecalling/contacts?${params}`, { headers: getAuthHeaders() });
      setContacts(r.data.contacts || []);
      setSelected(new Set());   // clear selection whenever the list changes
    } catch { toast.error('Failed to load contacts'); }
    finally { setLoading(false); }
  }, [getAuthHeaders, statusFilter, search, isAdmin, assigneeFilter, activeBatch]);

  const loadUsers = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const r = await axios.get(`${API}/team-users?limit=200`, { headers: getAuthHeaders() });
      const list = Array.isArray(r.data) ? r.data : (r.data.users || r.data.data || []);
      // Show every active team user. Tag each with whether they have the
      // telecalling permission so the admin can see at a glance who can
      // actually work the queue — but don't hard-filter, otherwise the
      // dropdown ends up empty until permissions are granted.
      const enriched = list
        .filter(u => (u.status || 'active') !== 'inactive')
        .map(u => ({
          ...u,
          _has_tc: isAdminRole(u.role) || (u.permissions || []).includes('telecalling'),
        }))
        // Sort: users with access first, then by name
        .sort((a, b) => (b._has_tc - a._has_tc) || (a.name || a.email || '').localeCompare(b.name || b.email || ''));
      setUsers(enriched);
    } catch { /* silent */ }
  }, [getAuthHeaders, isAdmin]);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadContacts(); }, [loadContacts]);
  useEffect(() => { loadBatches(); }, [loadBatches]);
  useEffect(() => { loadCallers(); }, [loadCallers]);

  // ── Bulk / batch operations ──────────────────────────────────
  const toggleSelected = (id) => setSelected(s => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const selectAllVisible = () => setSelected(new Set(contacts.map(c => c.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} contact${ids.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    try {
      const r = await axios.post(`${API}/telecalling/contacts/bulk-delete`, { ids }, { headers: getAuthHeaders() });
      toast.success(`Deleted ${r.data.deleted}`);
      clearSelection();
      loadContacts();
      loadBatches();
      loadCallers();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed'); }
  };

  const bulkAssign = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    try {
      const r = await axios.post(
        `${API}/telecalling/contacts/bulk-assign`,
        { ids, assigned_to: bulkAssignUser || null },
        { headers: getAuthHeaders() },
      );
      toast.success(`Assigned ${r.data.updated}`);
      setBulkAssignOpen(false);
      setBulkAssignUser('');
      clearSelection();
      loadContacts();
      loadCallers();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Assign failed'); }
  };

  const renameBatch = async (batchId, newName) => {
    const clean = (newName || '').trim();
    if (!clean) return;
    try {
      await axios.patch(`${API}/telecalling/batches/${batchId}`, { name: clean }, { headers: getAuthHeaders() });
      setRenamingBatch(null);
      setRenameValue('');
      loadBatches();
      loadContacts();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Rename failed'); }
  };

  const deleteBatch = async (batch) => {
    if (!window.confirm(`Delete the "${batch.name}" tab and all ${batch.contact_count || 0} contacts in it? This cannot be undone.`)) return;
    try {
      await axios.delete(`${API}/telecalling/batches/${batch.id}`, { headers: getAuthHeaders() });
      toast.success('Tab deleted');
      if (activeBatch === batch.id) setActiveBatch('all');
      loadBatches();
      loadContacts();
      loadCallers();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed'); }
  };

  const patchRow = async (id, patch) => {
    // Optimistic update
    setContacts(cs => cs.map(c => c.id === id ? { ...c, ...patch } : c));
    try {
      const r = await axios.patch(`${API}/telecalling/contacts/${id}`, patch, { headers: getAuthHeaders() });
      setContacts(cs => cs.map(c => c.id === id ? r.data : c));
      if (patch.call_picked !== undefined || patch.lead_interested !== undefined) {
        loadCallers();
      }
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
      loadCallers();
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

  // Union of extra_fields keys across the visible contacts → sheet-specific
  // columns rendered after the standard ones.
  const extraColumns = useMemo(() => {
    const s = new Set();
    contacts.forEach(c => { Object.keys(c.extra_fields || {}).forEach(k => s.add(k)); });
    // Prefer the order defined on the batch metadata when a specific tab is active
    if (activeBatch !== 'all') {
      const batch = batches.find(b => b.id === activeBatch);
      const ordered = (batch?.extra_columns || []).filter(k => s.has(k));
      const rest = [...s].filter(k => !ordered.includes(k));
      return [...ordered, ...rest];
    }
    return [...s];
  }, [contacts, activeBatch, batches]);

  const allSelected = contacts.length > 0 && contacts.every(c => selected.has(c.id));
  const toggleAll = () => (allSelected ? clearSelection() : selectAllVisible());

  return (
    <AdminLayout>
      <div className="p-6 max-w-[1400px] mx-auto" data-testid="admin-telecalling">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Phone className="w-6 h-6 text-indigo-600" /> Telecalling</h1>
          <div className="flex items-center gap-2">
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'queue' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('queue')} data-testid="tc-tab-queue">Queue &amp; Sheets</button>
              <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'reports' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('reports')} data-testid="tc-tab-reports">Reports &amp; KPIs</button>
            </div>
            <Button
              size="sm"
              onClick={() => setShowAddClient(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              data-testid="tc-add-client-btn"
            >
              <Plus className="w-4 h-4 mr-1" /> Add Client
            </Button>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowImport(true)} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="tc-import-btn">
                <Upload className="w-4 h-4 mr-1" /> Import Excel
              </Button>
            )}
          </div>
        </div>

        {tab === 'queue' && (
          <div className="space-y-3">
            {/* Caller Calling Sheet Switcher (Replaces manual Excel sheets for callers) */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm space-y-2" data-testid="tc-caller-sheets-bar">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Calling Sheets by Caller:
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Switch between caller sheets directly on the website without maintaining separate Excel files
                  </span>
                </div>
                {isAdmin && (
                  <span className="text-[11px] text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {callers.length} Active Caller Sheets
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setAssigneeFilter('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                    assigneeFilter === 'all'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                  data-testid="tc-caller-sheet-all"
                >
                  <span>All Clients / Sheets</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    assigneeFilter === 'all' ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {callers.reduce((acc, c) => acc + (c.total_contacts || 0), 0)}
                  </span>
                </button>

                {/* Current user's sheet if present */}
                {(() => {
                  const myCaller = callers.find(c => c.user_id === user?.id);
                  if (!myCaller) return null;
                  const isSelected = assigneeFilter === myCaller.user_id;
                  return (
                    <button
                      onClick={() => setAssigneeFilter(myCaller.user_id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                      }`}
                      data-testid="tc-caller-sheet-me"
                    >
                      <span>★ My Calling Sheet</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-emerald-200 text-emerald-900'
                      }`}>
                        {myCaller.total_contacts}
                      </span>
                      {myCaller.unworked > 0 && (
                        <span className={`text-[9px] px-1 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {myCaller.unworked} unworked
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Other callers */}
                {callers.filter(c => c.user_id !== user?.id).map(c => {
                  const isSelected = assigneeFilter === c.user_id;
                  return (
                    <button
                      key={c.user_id}
                      onClick={() => setAssigneeFilter(c.user_id)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                      data-testid={`tc-caller-sheet-${c.user_id}`}
                    >
                      <span>{c.user_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {c.total_contacts}
                      </span>
                      {c.unworked > 0 && (
                        <span className={`text-[9px] px-1 rounded ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.unworked} left
                        </span>
                      )}
                    </button>
                  );
                })}

                {isAdmin && (
                  <button
                    onClick={() => setAssigneeFilter('unassigned')}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
                      assigneeFilter === 'unassigned'
                        ? 'bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    data-testid="tc-caller-sheet-unassigned"
                  >
                    <span>Unassigned</span>
                  </button>
                )}
              </div>
            </div>
            {/* Batch tabs (imported sheets) */}
            {(batches.length > 0 || isAdmin) && (
              <div className="flex items-center gap-1 flex-wrap bg-white rounded-lg border border-slate-200 p-1.5" data-testid="tc-batch-tabs">
                <button
                  onClick={() => setActiveBatch('all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${activeBatch === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  data-testid="tc-batch-tab-all"
                >
                  All Contacts
                </button>
                {batches.map(b => (
                  <div key={b.id} className={`inline-flex items-center rounded-md ${activeBatch === b.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`} data-testid={`tc-batch-tab-${b.id}`}>
                    {renamingBatch === b.id ? (
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={e => setRenameValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') renameBatch(b.id, renameValue);
                          if (e.key === 'Escape') { setRenamingBatch(null); setRenameValue(''); }
                        }}
                        onBlur={() => renameBatch(b.id, renameValue)}
                        className="px-2 py-1 text-xs bg-white text-slate-900 border border-indigo-300 rounded outline-none w-40"
                        data-testid={`tc-batch-rename-input-${b.id}`}
                      />
                    ) : (
                      <button
                        onClick={() => setActiveBatch(b.id)}
                        onDoubleClick={() => isAdmin && (setRenamingBatch(b.id), setRenameValue(b.name))}
                        title={isAdmin ? 'Double-click to rename' : ''}
                        className="px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                      >
                        {b.name}
                        <span className={`ml-1.5 text-[10px] tabular-nums ${activeBatch === b.id ? 'text-white/70' : 'text-slate-400'}`}>{b.contact_count}</span>
                      </button>
                    )}
                    {isAdmin && activeBatch === b.id && renamingBatch !== b.id && (
                      <>
                        <button
                          onClick={() => { setRenamingBatch(b.id); setRenameValue(b.name); }}
                          className="p-1 hover:bg-white/20 rounded"
                          title="Rename tab"
                          data-testid={`tc-batch-rename-${b.id}`}
                        >
                          <PenSquare className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => deleteBatch(b)}
                          className="p-1 hover:bg-red-500/60 rounded mr-1"
                          title="Delete this tab and all its contacts"
                          data-testid={`tc-batch-delete-${b.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

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

            {/* Bulk toolbar */}
            {isAdmin && selected.size > 0 && (
              <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2" data-testid="tc-bulk-toolbar">
                <span className="text-xs font-bold text-indigo-800">{selected.size} selected</span>
                <button
                  onClick={selectAllVisible}
                  className="text-[11px] text-indigo-700 underline"
                  data-testid="tc-bulk-select-all"
                >
                  Select all {contacts.length}
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => setBulkAssignOpen(true)} data-testid="tc-bulk-assign-btn">
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign…
                  </Button>
                  <Button size="sm" variant="outline" onClick={bulkDelete} className="text-red-600 hover:text-red-700 hover:border-red-300" data-testid="tc-bulk-delete-btn">
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                  </Button>
                  <button onClick={clearSelection} className="text-slate-500 hover:text-slate-900 text-sm px-2" data-testid="tc-bulk-clear">✕</button>
                </div>
              </div>
            )}

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
                      {isAdmin && (
                        <th className={`${HEAD} w-8`}>
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="rounded"
                            data-testid="tc-header-checkbox"
                            aria-label="Select all visible"
                          />
                        </th>
                      )}
                      <th className={`${HEAD} w-8`}>#</th>
                      <th className={HEAD}>Contact</th>
                      <th className={HEAD}>Phone</th>
                      <th className={HEAD}>Email</th>
                      <th className={HEAD}>School</th>
                      <th className={HEAD}>City</th>
                      <th className={`${HEAD} cursor-pointer select-none`} onClick={() => setSortDesc(s => !s)} data-testid="tc-sort-date">
                        Date Added {sortDesc ? '↓' : '↑'}
                      </th>
                      <th className={HEAD}>Status</th>
                      <th className={HEAD}>Picked?</th>
                      <th className={HEAD}>Interested?</th>
                      <th className={HEAD}>Products</th>
                      <th className={HEAD}>Note</th>
                      <th className={HEAD}>Follow-up</th>
                      {isAdmin && <th className={HEAD}>Assignee</th>}
                      <th className={HEAD}>CRM</th>
                      {extraColumns.map(col => (
                        <th key={col} className={HEAD} title={`Imported column: ${col}`}>{col}</th>
                      ))}
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
                          onDelete={deleteRow}
                          selected={selected.has(c.id)}
                          onToggleSelected={() => toggleSelected(c.id)}
                          extraColumns={extraColumns} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {tab === 'reports' && (
          <ReportsTab
            onOpenCallerSheet={(callerId) => {
              setTab('queue');
              setAssigneeFilter(callerId);
            }}
          />
        )}
      </div>

      <AddClientModal
        open={showAddClient}
        onClose={() => setShowAddClient(false)}
        onDone={() => {
          loadContacts();
          loadCallers();
          loadBatches();
        }}
        users={users}
        isAdmin={isAdmin}
        currentUserId={user?.id}
        batches={batches}
      />
      <ImportModal open={showImport} onClose={() => setShowImport(false)} onDone={() => { loadContacts(); loadBatches(); loadCallers(); }} users={users} />
      <InterestedLeadModal open={!!interestedRow} contact={interestedRow} onClose={() => setInterestedRow(null)} onSaved={() => { loadContacts(); loadCallers(); }} />

      {/* Bulk-assign modal */}
      <Dialog open={bulkAssignOpen} onOpenChange={setBulkAssignOpen}>
        <DialogContent className="max-w-md" data-testid="tc-bulk-assign-modal">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" /> Assign {selected.size} contact{selected.size === 1 ? '' : 's'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 mb-1 block">Assign to</label>
              <select value={bulkAssignUser} onChange={(e) => setBulkAssignUser(e.target.value)}
                className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm bg-white" data-testid="tc-bulk-assign-select">
                <option value="">Unassigned</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name || u.email}{u._has_tc ? '' : '  — grant Telecalling access'}
                  </option>
                ))}
              </select>
              {bulkAssignUser && !(users.find(u => u.id === bulkAssignUser)?._has_tc) && (
                <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This user doesn&rsquo;t have <b>Telecalling</b> permission yet.
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setBulkAssignOpen(false)}>Cancel</Button>
              <Button onClick={bulkAssign} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="tc-bulk-assign-confirm">
                {bulkAssignUser ? 'Assign' : 'Unassign'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
