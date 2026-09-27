/**
 * Field Reports — team members log a "field day": a check-in with
 * geolocation + selfie, followed by any number of school visits and a
 * meeting note per visit. Managers see everyone's reports; regular
 * users see their own.
 *
 * Tabs:
 *   • My Field Day → the live check-in / add-visit / add-meeting flow
 *   • Reports      → team-wide, day-wise browse with filters
 *   • Calendar     → month calendar of team visits (dot-per-visit)
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MapPin, Camera, LogOut, LogIn, Building2, Users, Plus, FileText, Calendar,
  Phone, Mail, Trash2, ChevronDown, ChevronRight, Loader2, User, Send, X,
} from 'lucide-react';
import { AdminLayout } from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BOARDS = ['CBSE', 'ICSE', 'IB', 'IGCSE', 'State Board', 'Other'];
const STUDENT_BUCKETS = ['<200', '200-500', '500-1000', '1000-2000', '2000+'];
const FEES_BUCKETS = ['<₹25k', '₹25k-50k', '₹50k-1L', '₹1L-2L', '₹2L+'];

// Kept in sync with AdminSchoolCRM.jsx PRIMARY_CONTACT_ROLES
const SCHOOL_CONTACT_ROLES = [
  'Principal', 'Director', 'Trustee / Owner', 'Vice Principal',
  'Coordinator', 'Primary Coordinator', 'Secondary Coordinator',
  'Computer Teacher', 'Teacher', 'Head of Department', 'Accounts', 'Admin', 'Other',
];

// OLL Products — canonical list surfaced across School CRM + proposal builder
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

const EMAIL_TEMPLATES = [
  {
    id: 'intro',
    label: 'Introduction — OLL Program',
    subject: 'Great meeting you — quick intro to OLL',
    body: 'Hi {name},\n\nGreat meeting you today at {school}. As promised, here is a quick brief on the OLL program — Robotics + AI curriculum, teacher training, and hands-on kits for your students.\n\nHappy to schedule a quick demo at your convenience. Please let me know a time that works.\n\nBest,\n{sender}',
  },
  {
    id: 'proposal',
    label: 'Proposal Follow-up',
    subject: 'OLL Proposal for {school}',
    body: 'Hi {name},\n\nThank you for the discussion today. Please find attached our detailed proposal for {school}. It covers the program scope, pricing, and rollout plan.\n\nHappy to walk you through the specifics on a quick call.\n\nBest,\n{sender}',
  },
  {
    id: 'nudge',
    label: 'Gentle Nudge',
    subject: 'Following up on our conversation',
    body: 'Hi {name},\n\nHope you had a great week! Just wanted to check in on our conversation about the OLL program at {school}. Would love to hear your thoughts and answer any questions.\n\nBest,\n{sender}',
  },
];

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};
const fmtDay = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
};
const dayKey = (iso) => (iso ? String(iso).slice(0, 10) : '');
const monthKey = (iso) => (iso ? String(iso).slice(0, 7) : ''); // YYYY-MM

// ── Geolocation ─────────────────────────────────────────────────
const getCoords = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
    (e) => reject(e),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

const reverseGeocode = async (lat, lon) => {
  // Nominatim — no API key, but be polite and only call on user action.
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&zoom=10&addressdetails=1&lat=${lat}&lon=${lon}`,
      { headers: { 'Accept': 'application/json' } },
    );
    if (!r.ok) return null;
    const j = await r.json();
    const a = j.address || {};
    const city = a.city || a.town || a.village || a.suburb || a.county || '';
    const label = j.display_name || '';
    return { city, label };
  } catch { return null; }
};

const uploadImage = async (file, getAuthHeaders) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'images');
  const res = await axios.post(`${API}/upload`, fd, { headers: getAuthHeaders() });
  return res.data.url;
};

// Camera capture — open the OS camera (fallback: file input with capture attr).
// We use a hidden <input type=file accept="image/*" capture="environment">
// which on mobile/PWA always opens the back camera, and on desktop lets the
// user pick a file (still acceptable).
const captureFromCamera = () => new Promise((resolve) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.capture = 'environment';
  input.onchange = () => resolve(input.files?.[0] || null);
  input.click();
});

// ── Small building blocks ─────────────────────────────────────────
const Chip = ({ children, tone = 'slate' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-${tone}-100 text-${tone}-700 border border-${tone}-200`}>
    {children}
  </span>
);

const YesNoToggle = ({ value, onChange, testid }) => (
  <div className="flex gap-2" data-testid={testid}>
    {['yes', 'no'].map((v) => {
      const active = value === v;
      return (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase border-2 transition ${
            active
              ? v === 'yes' ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'bg-rose-50 text-rose-700 border-rose-500'
              : 'border-slate-200 text-slate-500'
          }`}
        >{v}</button>
      );
    })}
  </div>
);

const MapPreview = ({ lat, lon }) => {
  if (lat == null || lon == null) return null;
  const url = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.005}%2C${lat - 0.003}%2C${lon + 0.005}%2C${lat + 0.003}&layer=mapnik&marker=${lat}%2C${lon}`;
  return (
    <div className="rounded-lg overflow-hidden border border-slate-200" data-testid="field-map-preview">
      <iframe title="map" src={url} className="w-full h-40 border-0" loading="lazy" />
      <div className="bg-slate-50 border-t border-slate-200 px-2 py-1 text-[10px] text-slate-500 font-mono">
        {lat.toFixed(5)}, {lon.toFixed(5)}
      </div>
    </div>
  );
};

// ── School Visit modal ────────────────────────────────────────────
const emptyVisit = () => ({
  school_name: '', city: '', board: '', student_count: '', fees_range: '',
  has_robotics: '', robotics_provider: '',
  contacts: [{ name: '', phone: '', email: '', role: '' }],
  notes: '', met_with: '',
  got_entry: '', lead_interested: '',
  products_interested: [],
  photo_url: null,
  latitude: null, longitude: null, location_label: '',
});

const SchoolVisitModal = ({ open, onClose, onSaved, reportId, getAuthHeaders }) => {
  const [form, setForm] = useState(emptyVisit());
  const [saving, setSaving] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [savedVisit, setSavedVisit] = useState(null);   // shows post-save action strip

  useEffect(() => { if (open) { setForm(emptyVisit()); setSavedVisit(null); } }, [open]);

  const captureLocation = async () => {
    setLocBusy(true);
    try {
      const { lat, lon } = await getCoords();
      const geo = await reverseGeocode(lat, lon);
      setForm((f) => ({
        ...f,
        latitude: lat, longitude: lon,
        // Only auto-fill city if empty — never overwrite what admin typed
        city: f.city || geo?.city || '',
        location_label: geo?.label || '',
      }));
      toast.success(geo?.city ? `Location captured — city: ${geo.city}` : 'Location captured');
    } catch (e) {
      toast.error(e.message || 'Location unavailable');
    } finally { setLocBusy(false); }
  };

  const doCapturePhoto = async () => {
    const file = await captureFromCamera();
    if (!file) return;
    try {
      const url = await uploadImage(file, getAuthHeaders);
      setForm((f) => ({ ...f, photo_url: url }));
      toast.success('Photo captured');
    } catch (e) {
      toast.error('Photo upload failed');
    }
  };

  const toggleProduct = (id) => setForm((f) => ({
    ...f,
    products_interested: f.products_interested.includes(id)
      ? f.products_interested.filter(x => x !== id)
      : [...f.products_interested, id],
  }));

  const updateContact = (i, k, v) => setForm((f) => ({
    ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)),
  }));
  const addContact = () => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: '', phone: '', email: '', role: '' }] }));
  const removeContact = (i) => setForm((f) => ({ ...f, contacts: f.contacts.length > 1 ? f.contacts.filter((_, idx) => idx !== i) : f.contacts }));

  const save = async () => {
    if (!form.school_name.trim()) { toast.error('School name is required'); return; }
    if (!form.photo_url) { toast.error('Please click a photo of the visit'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contacts: form.contacts
          .filter((c) => c.name?.trim())
          .map((c) => ({ ...c, email: c.email?.trim() ? c.email.trim() : undefined })),
      };
      const res = await axios.post(`${API}/field-reports/${reportId}/school-visits`, payload, { headers: getAuthHeaders() });
      toast.success('School visit saved');
      onSaved(res.data);
      setSavedVisit(res.data);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  // Post-save actions
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTpl, setEmailTpl] = useState(EMAIL_TEMPLATES[0].id);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const currentTpl = EMAIL_TEMPLATES.find(t => t.id === emailTpl) || EMAIL_TEMPLATES[0];
  useEffect(() => {
    if (savedVisit) {
      // preselect first contact email
      const firstEmail = (savedVisit.contacts || []).find(c => c.email)?.email || '';
      setEmailTo(firstEmail);
    }
  }, [savedVisit]);

  const sendEmail = async () => {
    if (!emailTo.trim()) { toast.error('Recipient email is required'); return; }
    setEmailSending(true);
    try {
      const firstContact = (savedVisit?.contacts || [])[0] || {};
      const subject = currentTpl.subject
        .replaceAll('{name}', firstContact.name || 'there')
        .replaceAll('{school}', savedVisit?.school_name || '');
      const body = currentTpl.body
        .replaceAll('{name}', firstContact.name || 'there')
        .replaceAll('{school}', savedVisit?.school_name || '')
        .replaceAll('{sender}', 'OLL Team');
      await axios.post(`${API}/emails/send`, {
        to: emailTo, subject, body_html: body.replace(/\n/g, '<br>'), body_text: body,
      }, { headers: getAuthHeaders() });
      toast.success('Email sent');
      setEmailOpen(false);
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Failed to send email');
    } finally { setEmailSending(false); }
  };

  const addFollowup = async () => {
    if (!savedVisit?.school_inquiry_id) { toast.error('No linked school found — open the school in CRM first'); return; }
    const when = window.prompt('Follow-up date (YYYY-MM-DD):', new Date(Date.now() + 3 * 86400e3).toISOString().slice(0, 10));
    if (!when) return;
    const note = window.prompt('Follow-up note (optional):', '');
    try {
      await axios.patch(`${API}/schools/${savedVisit.school_inquiry_id}`, {
        followup_date: when, followup_note: note || '',
      }, { headers: getAuthHeaders() });
      toast.success('Follow-up added');
    } catch (e) { toast.error('Failed to add follow-up'); }
  };

  const createProposal = () => {
    if (!savedVisit?.school_inquiry_id) { toast.error('No linked school — visit the School CRM first'); return; }
    window.open(`/admin/schools?school_id=${savedVisit.school_inquiry_id}&action=proposal`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="school-visit-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> Log School Visit</DialogTitle></DialogHeader>

        {savedVisit ? (
          <div className="space-y-4 mt-2">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <Building2 className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <div className="font-semibold text-emerald-900">Saved — {savedVisit.school_name}</div>
                <div className="text-xs text-emerald-700">What would you like to do next?</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button variant="outline" onClick={addFollowup} data-testid="post-save-followup"><Calendar className="w-4 h-4 mr-1" /> Add Follow-up</Button>
              <Button variant="outline" onClick={createProposal} data-testid="post-save-proposal"><FileText className="w-4 h-4 mr-1" /> Create Proposal</Button>
              <Button variant="outline" onClick={() => setEmailOpen(true)} data-testid="post-save-email"><Mail className="w-4 h-4 mr-1" /> Send Email</Button>
            </div>
            {emailOpen && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Send Email</div>
                  <button onClick={() => setEmailOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                </div>
                <label className="block text-xs font-semibold text-slate-600">Template</label>
                <select className="w-full h-9 px-2 border border-slate-200 rounded-lg text-sm" value={emailTpl} onChange={(e) => setEmailTpl(e.target.value)} data-testid="email-template">
                  {EMAIL_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
                <label className="block text-xs font-semibold text-slate-600">To</label>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} placeholder="contact@school.edu" data-testid="email-to" />
                <div className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded p-2 bg-white whitespace-pre-wrap">
                  <strong>Subject:</strong> {currentTpl.subject.replaceAll('{school}', savedVisit.school_name)}{'\n\n'}
                  {currentTpl.body.replaceAll('{name}', savedVisit.contacts?.[0]?.name || 'there').replaceAll('{school}', savedVisit.school_name).replaceAll('{sender}', 'OLL Team')}
                </div>
                <Button className="w-full bg-[#1E3A5F] hover:bg-[#0F203E]" onClick={sendEmail} disabled={emailSending} data-testid="email-send-btn">
                  {emailSending ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Send className="w-4 h-4 mr-1" />} Send Email
                </Button>
              </div>
            )}
            <div className="flex justify-end pt-3 border-t">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            {/* Photo */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><Camera className="w-3 h-3" /> Visit Photo *</div>
                <Button size="sm" variant="outline" onClick={doCapturePhoto} data-testid="visit-capture-photo">
                  <Camera className="w-3.5 h-3.5 mr-1" /> {form.photo_url ? 'Retake' : 'Click Photo'}
                </Button>
              </div>
              {form.photo_url ? (
                <img src={form.photo_url} alt="visit" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="text-xs text-slate-400 italic">Photo required — click a picture from your phone camera.</div>
              )}
            </div>

            {/* Location */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> School Location</div>
                <Button size="sm" variant="outline" onClick={captureLocation} disabled={locBusy} data-testid="visit-capture-location">
                  {locBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
                  <span className="ml-1">Capture location</span>
                </Button>
              </div>
              {form.latitude != null && <div className="mt-2"><MapPreview lat={form.latitude} lon={form.longitude} /></div>}
            </div>

            {/* School Name + Entry/Interest toggles */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">School Name *</label>
              <Input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} data-testid="visit-school-name" />
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Did you get entry?</label>
                  <YesNoToggle value={form.got_entry} onChange={(v) => setForm({ ...form, got_entry: v })} testid="visit-got-entry" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Interested?</label>
                  <YesNoToggle value={form.lead_interested} onChange={(v) => setForm({ ...form, lead_interested: v })} testid="visit-interested" />
                </div>
              </div>
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Who did you meet?</label>
                <Input value={form.met_with} onChange={(e) => setForm({ ...form, met_with: e.target.value })} placeholder="e.g. Mrs. Sharma (Principal)" data-testid="visit-met-with" />
              </div>
            </div>

            {/* Basic details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} data-testid="visit-city" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Board</label>
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" value={form.board} onChange={(e) => setForm({ ...form, board: e.target.value })} data-testid="visit-board">
                  <option value="">Select</option>{BOARDS.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Students</label>
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" value={form.student_count} onChange={(e) => setForm({ ...form, student_count: e.target.value })} data-testid="visit-students">
                  <option value="">Select</option>{STUDENT_BUCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Fees Range</label>
                <select className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm" value={form.fees_range} onChange={(e) => setForm({ ...form, fees_range: e.target.value })} data-testid="visit-fees">
                  <option value="">Select</option>{FEES_BUCKETS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Has Robotics</label>
                <YesNoToggle value={form.has_robotics} onChange={(v) => setForm({ ...form, has_robotics: v, robotics_provider: v === 'yes' ? form.robotics_provider : '' })} testid="visit-robotics" />
              </div>
              {form.has_robotics === 'yes' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Provided by</label>
                  <Input placeholder="e.g. WhiteHat Jr" value={form.robotics_provider} onChange={(e) => setForm({ ...form, robotics_provider: e.target.value })} data-testid="visit-robotics-provider" />
                </div>
              )}
            </div>

            {/* Products interested */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2">Product Interested In (select all that apply)</label>
              <div className="flex flex-wrap gap-2" data-testid="visit-products">
                {OLL_PRODUCTS.map(p => {
                  const active = form.products_interested.includes(p.id);
                  return (
                    <button key={p.id} type="button" onClick={() => toggleProduct(p.id)}
                      className={`px-2.5 py-1 text-xs rounded-full border-2 transition ${active ? 'bg-indigo-50 text-indigo-700 border-indigo-500 font-semibold' : 'border-slate-200 text-slate-500'}`}
                      data-testid={`visit-product-${p.id}`}
                    >{p.label}</button>
                  );
                })}
              </div>
            </div>

            {/* Contacts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Contacts</div>
                <button type="button" onClick={addContact} className="text-xs font-bold text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1" data-testid="visit-add-contact"><Plus className="w-3 h-3" /> Add contact</button>
              </div>
              {form.contacts.map((c, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 mb-2" data-testid={`visit-contact-${i}`}>
                  <Input className="col-span-3" placeholder="Name" value={c.name} onChange={(e) => updateContact(i, 'name', e.target.value)} />
                  <Input className="col-span-3" placeholder="Phone" value={c.phone} onChange={(e) => updateContact(i, 'phone', e.target.value)} />
                  <Input className="col-span-3" placeholder="Email" value={c.email} onChange={(e) => updateContact(i, 'email', e.target.value)} />
                  <select className="col-span-2 h-10 px-2 border border-slate-200 rounded-lg text-sm bg-white"
                    value={c.role} onChange={(e) => updateContact(i, 'role', e.target.value)} data-testid={`visit-contact-role-${i}`}>
                    <option value="">Role</option>
                    {SCHOOL_CONTACT_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <button type="button" onClick={() => removeContact(i)} className="col-span-1 rounded-lg border border-slate-200 hover:border-red-300 hover:text-red-500 text-slate-400 flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observations, next steps, anything else..." data-testid="visit-notes" />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} data-testid="visit-cancel">Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="visit-save">
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save visit
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ── Meeting modal ─────────────────────────────────────────────────
const MeetingModal = ({ open, onClose, onSaved, reportId, visitId, getAuthHeaders }) => {
  const [form, setForm] = useState({ report: '', product_problems: '', next_step: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) setForm({ report: '', product_problems: '', next_step: '' }); }, [open]);

  const save = async () => {
    if (!form.report.trim()) { toast.error('Please write the meeting notes'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/field-reports/${reportId}/school-visits/${visitId}/meeting`, form, { headers: getAuthHeaders() });
      toast.success('Meeting saved');
      onSaved();
      onClose();
    } catch (e) { toast.error(e?.response?.data?.detail || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="meeting-modal">
        <DialogHeader><DialogTitle>Add Meeting Note</DialogTitle></DialogHeader>
        <div className="space-y-3 mt-2">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Meeting Report *</label>
            <textarea rows={4} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={form.report} onChange={(e) => setForm({ ...form, report: e.target.value })} data-testid="meeting-report" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Product Problems Faced</label>
            <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" value={form.product_problems} onChange={(e) => setForm({ ...form, product_problems: e.target.value })} data-testid="meeting-problems" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Next Step</label>
            <Input value={form.next_step} onChange={(e) => setForm({ ...form, next_step: e.target.value })} data-testid="meeting-next" />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="meeting-save">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Visit row inside day-wise report ───────────────────────────────
const VisitRow = ({ v }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <div className="font-semibold text-slate-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600" /> {v.school_name}</div>
      <span className="text-[11px] text-slate-500">{fmtDateTime(v.at)}</span>
    </div>
    <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-1.5">
      {v.city && <Chip tone="slate">{v.city}</Chip>}
      {v.board && <Chip tone="blue">{v.board}</Chip>}
      {v.student_count && <Chip tone="amber">{v.student_count} students</Chip>}
      {v.fees_range && <Chip tone="purple">{v.fees_range}</Chip>}
      {v.got_entry === 'yes' && <Chip tone="emerald">Entry ✓</Chip>}
      {v.got_entry === 'no' && <Chip tone="rose">No entry</Chip>}
      {v.lead_interested === 'yes' && <Chip tone="emerald">Interested</Chip>}
      {v.lead_interested === 'no' && <Chip tone="rose">Not interested</Chip>}
      {v.has_robotics === 'yes' && <Chip tone="amber">Has robotics {v.robotics_provider ? `· ${v.robotics_provider}` : ''}</Chip>}
      {v.has_robotics === 'no' && <Chip tone="emerald">No robotics</Chip>}
    </div>
    {v.met_with && <div className="mt-2 text-xs text-slate-700"><strong>Met:</strong> {v.met_with}</div>}
    {v.products_interested?.length > 0 && (
      <div className="mt-1 text-xs text-slate-700 flex flex-wrap gap-1">
        <strong className="mr-1">Products:</strong>
        {v.products_interested.map(pid => (
          <span key={pid} className="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">
            {OLL_PRODUCTS.find(p => p.id === pid)?.label || pid}
          </span>
        ))}
      </div>
    )}
    {v.contacts?.length > 0 && (
      <div className="mt-2 text-xs text-slate-700 space-y-0.5">
        {v.contacts.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{c.name}</span>
            {c.role && <span className="text-slate-400">· {c.role}</span>}
            {c.phone && <span className="inline-flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3" /> {c.phone}</span>}
            {c.email && <span className="inline-flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3" /> {c.email}</span>}
          </div>
        ))}
      </div>
    )}
    {v.notes && <div className="mt-1 text-xs text-slate-600 whitespace-pre-wrap"><strong>Notes:</strong> {v.notes}</div>}
    {v.photo_url && (
      <img src={v.photo_url} alt="visit" className="mt-2 w-24 h-24 object-cover rounded-lg border border-slate-200" />
    )}
    {v.meeting && (
      <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs">
        <div className="text-slate-700 whitespace-pre-wrap"><strong>Meeting:</strong> {v.meeting.report}</div>
        {v.meeting.product_problems && <div className="mt-1 text-rose-700 whitespace-pre-wrap"><strong>Issues:</strong> {v.meeting.product_problems}</div>}
        {v.meeting.next_step && <div className="mt-1 text-emerald-700"><strong>Next:</strong> {v.meeting.next_step}</div>}
      </div>
    )}
  </div>
);

// ── Day group card ─────────────────────────────────────────────────
const DayGroupCard = ({ day, reports }) => {
  const [open, setOpen] = useState(false);
  const totalVisits = reports.reduce((n, r) => n + (r.school_visits?.length || 0), 0);
  const interested = reports.reduce((n, r) => n + (r.school_visits || []).filter(v => v.lead_interested === 'yes').length, 0);
  const entries = reports.reduce((n, r) => n + (r.school_visits || []).filter(v => v.got_entry === 'yes').length, 0);
  const users = [...new Set(reports.map(r => r.user_name).filter(Boolean))];

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid={`day-group-${day}`}>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 text-left">
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800">{fmtDay(day)}</span>
            <Chip tone="emerald">{totalVisits} visits</Chip>
            <Chip tone="indigo">{entries} entries</Chip>
            <Chip tone="amber">{interested} interested</Chip>
            <Chip tone="slate">{users.length} team member{users.length === 1 ? '' : 's'}</Chip>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">{users.join(' · ')}</div>
        </div>
      </button>
      {open && (
        <div className="p-4 border-t border-slate-100 space-y-4 bg-slate-50/50">
          {reports.map((r) => (
            <div key={r.id} className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-800">{r.user_name}</span>
                <span className="text-[11px] text-slate-500">since {fmtDateTime(r.check_in?.at)}</span>
                <Chip tone={r.check_out ? 'slate' : 'emerald'}>{r.check_out ? 'Closed' : 'Live'}</Chip>
              </div>
              {r.check_in?.photo_url && <img src={r.check_in.photo_url} alt="checkin" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />}
              {(r.school_visits || []).map(v => <VisitRow key={v.id} v={v} />)}
              {(!r.school_visits || r.school_visits.length === 0) && (
                <div className="text-xs text-slate-400 italic">No visits logged in this session.</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Month Calendar view ────────────────────────────────────────────
const MonthCalendarView = ({ monthISO, reports }) => {
  const [y, m] = monthISO.split('-').map(Number);
  const firstDay = new Date(y, m - 1, 1);
  const lastDate = new Date(y, m, 0).getDate();
  const startCol = (firstDay.getDay() + 6) % 7; // Mon-first

  // Group by day
  const byDay = {};
  for (const r of reports) {
    const d = dayKey(r.check_in?.at || r.created_at);
    if (!d.startsWith(monthISO)) continue;
    (byDay[d] = byDay[d] || []).push(r);
  }

  const cells = [];
  for (let i = 0; i < startCol; i++) cells.push({ empty: true });
  for (let d = 1; d <= lastDate; d++) {
    const dk = `${monthISO}-${String(d).padStart(2, '0')}`;
    const dayReports = byDay[dk] || [];
    const visits = dayReports.reduce((n, r) => n + (r.school_visits?.length || 0), 0);
    cells.push({ dk, d, dayReports, visits });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="grid grid-cols-7 gap-1 text-[10px] uppercase font-bold text-slate-500 mb-2">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(w => <div key={w} className="text-center py-1">{w}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => c.empty ? (
          <div key={i} className="aspect-square" />
        ) : (
          <div key={c.dk} className={`aspect-square rounded-lg border p-1 text-[10px] flex flex-col ${c.dayReports.length > 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-slate-50/30'}`}>
            <div className="font-semibold text-slate-700">{c.d}</div>
            {c.dayReports.length > 0 && (
              <div className="mt-auto space-y-0.5 overflow-hidden">
                <div className="text-emerald-700 font-semibold text-[10px]">{c.visits} visits</div>
                <div className="flex flex-wrap gap-0.5">
                  {[...new Set(c.dayReports.map(r => r.user_name).filter(Boolean))].slice(0, 3).map(name => (
                    <span key={name} className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-bold flex items-center justify-center" title={name}>
                      {(name || '').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────
export default function AdminFieldReports() {
  const { user, getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('my-day');
  const [current, setCurrent] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [meetingCtx, setMeetingCtx] = useState(null);

  // Filters
  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [userFilter, setUserFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/field-reports`, { headers: getAuthHeaders() });
      setReports(res.data || []);
      const uid = user?.id;
      const mine = (res.data || []).filter((r) => r.user_id === uid);
      setCurrent(mine.find((r) => !r.check_out) || null);
    } catch (e) { toast.error('Failed to load reports'); }
    finally { setLoading(false); }
  }, [getAuthHeaders, user]);

  useEffect(() => { load(); }, [load]);

  const doCheckIn = async () => {
    setBusy(true);
    let lat = null, lon = null, photo_url = null;
    try {
      try { const c = await getCoords(); lat = c.lat; lon = c.lon; } catch {/* optional */}
      // Camera capture — mandatory
      const file = await captureFromCamera();
      if (!file) {
        toast.error('Photo required — please click a photo to check in');
        setBusy(false);
        return;
      }
      try { photo_url = await uploadImage(file, getAuthHeaders); }
      catch { toast.error('Photo upload failed'); setBusy(false); return; }
      const res = await axios.post(`${API}/field-reports/checkin`,
        { latitude: lat, longitude: lon, photo_url }, { headers: getAuthHeaders() });
      setCurrent(res.data);
      toast.success('Checked in!');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Check-in failed');
    } finally { setBusy(false); }
  };

  const doCheckOut = async () => {
    if (!current) return;
    setBusy(true);
    try {
      await axios.patch(`${API}/field-reports/${current.id}/checkout`, {}, { headers: getAuthHeaders() });
      toast.success('Checked out');
      setCurrent(null);
      load();
    } catch (e) { toast.error('Check-out failed'); }
    finally { setBusy(false); }
  };

  // ── Filtered + grouped reports ───────────────────────────────
  const teamUsers = useMemo(
    () => [...new Map(reports.map(r => [r.user_id, { id: r.user_id, name: r.user_name }])).values()],
    [reports],
  );

  const filteredReports = useMemo(
    () => reports.filter(r => {
      const key = dayKey(r.check_in?.at || r.created_at);
      if (!key.startsWith(monthFilter)) return false;
      if (userFilter !== 'all' && r.user_id !== userFilter) return false;
      return true;
    }),
    [reports, monthFilter, userFilter],
  );

  const grouped = useMemo(() => {
    const byDay = {};
    filteredReports.forEach(r => {
      const d = dayKey(r.check_in?.at || r.created_at);
      (byDay[d] = byDay[d] || []).push(r);
    });
    return Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredReports]);

  const kpis = useMemo(() => {
    const days = new Set();
    let visits = 0, entries = 0, interested = 0;
    filteredReports.forEach(r => {
      days.add(dayKey(r.check_in?.at || r.created_at));
      (r.school_visits || []).forEach(v => {
        visits += 1;
        if (v.got_entry === 'yes') entries += 1;
        if (v.lead_interested === 'yes') interested += 1;
      });
    });
    return { days: days.size, visits, entries, interested };
  }, [filteredReports]);

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto" data-testid="admin-field-reports">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-6 h-6 text-emerald-600" /> Field Reports</h1>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'my-day' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('my-day')} data-testid="tab-my-day">My Field Day</button>
            <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'reports' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('reports')} data-testid="tab-reports">Reports</button>
            <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'calendar' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('calendar')} data-testid="tab-calendar">Calendar</button>
          </div>
        </div>

        {/* ── My Field Day ── */}
        {tab === 'my-day' && (
          <div className="space-y-4" data-testid="field-my-day">
            {!current ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">Ready to hit the field?</div>
                <div className="text-sm text-slate-500 mt-1 mb-4">Check in with a photo to start logging school visits.</div>
                <Button onClick={doCheckIn} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700" data-testid="checkin-btn">
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                  Check In (click photo)
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Chip tone="emerald">Live</Chip>
                    <span className="text-sm text-slate-600">since {fmtDateTime(current.check_in?.at)}</span>
                  </div>
                  <Button variant="outline" size="sm" onClick={doCheckOut} disabled={busy} data-testid="checkout-btn">
                    {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogOut className="w-4 h-4 mr-1" />} Check Out
                  </Button>
                </div>
                {current.check_in?.photo_url && <img src={current.check_in.photo_url} alt="check-in" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />}
                {current.check_in?.latitude != null && <MapPreview lat={current.check_in.latitude} lon={current.check_in.longitude} />}
                <Button onClick={() => setShowVisit(true)} className="w-full bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="add-school-visit-btn">
                  <Building2 className="w-4 h-4 mr-1" /> Add School Visit
                </Button>

                {(current.school_visits || []).length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="text-xs font-bold uppercase text-slate-500">Today's visits</div>
                    {current.school_visits.map((v) => (
                      <div key={v.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-800">{v.school_name}</span>
                          <span className="text-[11px] text-slate-500">{fmtDateTime(v.at)}</span>
                        </div>
                        {!v.meeting ? (
                          <Button size="sm" variant="outline" className="mt-2" onClick={() => setMeetingCtx({ reportId: current.id, visitId: v.id })} data-testid={`add-meeting-${v.id}`}>
                            <FileText className="w-3.5 h-3.5 mr-1" /> Add meeting note
                          </Button>
                        ) : (
                          <div className="mt-2 text-xs text-slate-600"><FileText className="w-3.5 h-3.5 inline mr-1" /> Meeting logged</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Reports (day-wise) ── */}
        {(tab === 'reports' || tab === 'calendar') && (
          <div className="space-y-4" data-testid="field-reports-view">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Month</label>
                <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}
                  className="h-9 px-2 border border-slate-200 rounded-lg text-sm" data-testid="filter-month" />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Team Member</label>
                <select value={userFilter} onChange={(e) => setUserFilter(e.target.value)}
                  className="h-9 px-2 border border-slate-200 rounded-lg text-sm bg-white" data-testid="filter-user">
                  <option value="all">All ({teamUsers.length})</option>
                  {teamUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>

            {/* KPI strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: 'Days on Field', val: kpis.days, color: 'from-emerald-600 to-emerald-400' },
                { label: 'Schools Visited', val: kpis.visits, color: 'from-blue-600 to-blue-400' },
                { label: 'Entries Gained', val: kpis.entries, color: 'from-indigo-600 to-indigo-400' },
                { label: 'Schools Interested', val: kpis.interested, color: 'from-amber-600 to-amber-400' },
              ].map(c => (
                <div key={c.label} className={`bg-gradient-to-br ${c.color} rounded-xl p-4 text-white`}>
                  <p className="text-white/70 text-xs font-medium mb-1">{c.label}</p>
                  <p className="text-2xl font-bold">{c.val}</p>
                </div>
              ))}
            </div>

            {tab === 'calendar' ? (
              <MonthCalendarView monthISO={monthFilter} reports={filteredReports} />
            ) : (
              loading ? (
                <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
              ) : grouped.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">No visits in this window.</div>
              ) : (
                <div className="space-y-3">
                  {grouped.map(([day, rows]) => <DayGroupCard key={day} day={day} reports={rows} />)}
                </div>
              )
            )}
          </div>
        )}
      </div>

      <SchoolVisitModal
        open={showVisit}
        onClose={() => setShowVisit(false)}
        onSaved={() => load()}
        reportId={current?.id}
        getAuthHeaders={getAuthHeaders}
      />
      <MeetingModal
        open={!!meetingCtx}
        onClose={() => setMeetingCtx(null)}
        onSaved={() => load()}
        reportId={meetingCtx?.reportId}
        visitId={meetingCtx?.visitId}
        getAuthHeaders={getAuthHeaders}
      />
    </AdminLayout>
  );
}
