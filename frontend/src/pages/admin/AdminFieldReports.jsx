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
  Eye, PenSquare,
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

// Live camera capture — opens the actual camera stream (works on desktop too
// via getUserMedia). Falls back to the file-input `capture=environment` shim
// on browsers where getUserMedia is unavailable / permission denied.
const openCameraCapture = () => new Promise((resolve) => {
  // Try live camera first
  if (!navigator.mediaDevices?.getUserMedia) return resolve('__fallback__');
  resolve('__live__');
});

const CameraCaptureModal = ({ open, onClose, onCaptured }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState(null);
  const [facing, setFacing] = useState('environment');

  const start = useCallback(async (mode = facing) => {
    setStarting(true); setErr(null);
    try {
      // stop any existing stream first
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (e) {
      setErr(e?.message || 'Camera access denied');
    } finally { setStarting(false); }
  }, [facing]);

  useEffect(() => {
    if (open) start(facing);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flip = () => {
    const next = facing === 'environment' ? 'user' : 'environment';
    setFacing(next);
    start(next);
  };

  const shoot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
      onCaptured(file);
      // stop the stream + close
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      onClose();
    }, 'image/jpeg', 0.85);
  };

  const useFallback = async () => {
    // Fall back to the mobile file-input with capture attribute
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.onchange = () => {
      const f = input.files?.[0] || null;
      document.body.removeChild(input);
      if (f) { onCaptured(f); onClose(); }
    };
    input.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" data-testid="camera-capture-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Camera className="w-5 h-5" /> Click Photo</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {err ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              Camera unavailable: {err}
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={useFallback} data-testid="camera-fallback-btn">Pick a photo instead</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" data-testid="camera-video" />
                {starting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-between gap-2">
                <Button variant="outline" size="sm" onClick={flip} data-testid="camera-flip-btn">Flip</Button>
                <Button onClick={shoot} disabled={starting} className="flex-1 bg-emerald-600 hover:bg-emerald-700" data-testid="camera-shoot-btn">
                  <Camera className="w-4 h-4 mr-1" /> Capture
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

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

const SchoolVisitModal = ({ open, onClose, onSaved, reportId, getAuthHeaders, initialVisit = null, editMode = false }) => {
  const [form, setForm] = useState(emptyVisit());
  const [saving, setSaving] = useState(false);
  const [locBusy, setLocBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  // Pre-save "action points" — collected inline with the visit form.
  const [followupDate,  setFollowupDate]  = useState('');
  const [followupNote,  setFollowupNote]  = useState('');
  const [wantEmail,     setWantEmail]     = useState(false);
  const [emailTpl,      setEmailTpl]      = useState(EMAIL_TEMPLATES[0].id);
  const [emailTo,       setEmailTo]       = useState('');
  const currentTpl = EMAIL_TEMPLATES.find(t => t.id === emailTpl) || EMAIL_TEMPLATES[0];

  useEffect(() => {
    if (!open) return;
    if (initialVisit) {
      setForm({ ...emptyVisit(), ...initialVisit,
        contacts: initialVisit.contacts?.length ? initialVisit.contacts : [{ name: '', phone: '', email: '', role: '' }] });
    } else {
      setForm(emptyVisit());
    }
    setFollowupDate(''); setFollowupNote(''); setWantEmail(false);
    setEmailTpl(EMAIL_TEMPLATES[0].id); setEmailTo('');
  }, [open, initialVisit]);

  // Pre-select recipient email when contacts have one
  useEffect(() => {
    const firstEmail = (form.contacts || []).find(c => c.email)?.email || '';
    setEmailTo((cur) => cur || firstEmail);
  }, [form.contacts]);

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

  const onCameraCaptured = async (file) => {
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
    if (!form.photo_url && !editMode) { toast.error('Please click a photo of the visit'); return; }
    if (wantEmail && !emailTo.trim()) { toast.error('Enter recipient email or uncheck Send Email'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contacts: form.contacts
          .filter((c) => c.name?.trim())
          .map((c) => ({ ...c, email: c.email?.trim() ? c.email.trim() : undefined })),
      };
      let saved;
      if (editMode && initialVisit?.id) {
        const res = await axios.patch(
          `${API}/field-reports/${reportId}/school-visits/${initialVisit.id}`,
          payload, { headers: getAuthHeaders() });
        saved = res.data;
      } else {
        const res = await axios.post(
          `${API}/field-reports/${reportId}/school-visits`,
          payload, { headers: getAuthHeaders() });
        saved = res.data;
      }
      toast.success(editMode ? 'Visit updated' : 'School visit saved');

      // ── Post-save side effects (executed only when data is filled) ─────
      const jobs = [];
      if (followupDate && saved.school_inquiry_id) {
        jobs.push(axios.patch(`${API}/schools/${saved.school_inquiry_id}`, {
          followup_date: followupDate, followup_note: followupNote || '',
        }, { headers: getAuthHeaders() })
          .then(() => toast.success('Follow-up added'))
          .catch(() => toast.error('Follow-up could not be saved (school not linked yet — mark Lead Interested to promote to CRM first)')));
      } else if (followupDate && !saved.school_inquiry_id) {
        toast.warning('Follow-up skipped: mark Lead Interested = Yes to auto-create the CRM lead first.');
      }
      if (wantEmail) {
        const firstContact = (saved.contacts || form.contacts || [])[0] || {};
        const subject = currentTpl.subject
          .replaceAll('{name}', firstContact.name || 'there')
          .replaceAll('{school}', saved.school_name || '');
        const body = currentTpl.body
          .replaceAll('{name}', firstContact.name || 'there')
          .replaceAll('{school}', saved.school_name || '')
          .replaceAll('{sender}', 'OLL Team');
        jobs.push(axios.post(`${API}/emails/send`, {
          to: emailTo, subject, body_html: body.replace(/\n/g, '<br>'), body_text: body,
        }, { headers: getAuthHeaders() })
          .then(() => toast.success('Email sent'))
          .catch((e) => toast.error(e?.response?.data?.detail || 'Email failed')));
      }
      await Promise.allSettled(jobs);

      onSaved(saved);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  const openProposal = () => {
    toast.info('Proposal opens in a new tab after saving — set Lead Interested = Yes so we can link the school first.');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="school-visit-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> {editMode ? 'Edit School Visit' : 'Log School Visit'}</DialogTitle></DialogHeader>

        <div className="space-y-4 mt-2">
            {/* Photo */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-500 flex items-center gap-1"><Camera className="w-3 h-3" /> Visit Photo *</div>
                <Button size="sm" variant="outline" onClick={() => setCameraOpen(true)} data-testid="visit-capture-photo">
                  <Camera className="w-3.5 h-3.5 mr-1" /> {form.photo_url ? 'Retake' : 'Click Photo'}
                </Button>
              </div>
              {form.photo_url ? (
                <img src={form.photo_url} alt="visit" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
              ) : (
                <div className="text-xs text-slate-400 italic">Photo required — click to open the camera.</div>
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

            {/* School Name + Got Entry */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">School Name *</label>
              <Input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} data-testid="visit-school-name" />
              <div className="mt-3">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Did you get entry?</label>
                <YesNoToggle value={form.got_entry} onChange={(v) => setForm({ ...form, got_entry: v })} testid="visit-got-entry" />
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
            </div>

            {/* Who did you meet + Contacts (moved above Has Robotics) */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Who did you meet?</label>
              <Input value={form.met_with} onChange={(e) => setForm({ ...form, met_with: e.target.value })} placeholder="e.g. Mrs. Sharma (Principal)" data-testid="visit-met-with" />
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

            {/* Has Robotics (moved below contacts) */}
            <div className="grid grid-cols-2 gap-3">
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

            {/* Lead Interested — moved below Has Robotics */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Lead Interested?</label>
              <YesNoToggle value={form.lead_interested} onChange={(v) => setForm({ ...form, lead_interested: v, products_interested: v === 'yes' ? form.products_interested : [] })} testid="visit-interested" />
            </div>

            {/* Products interested — only shown when lead_interested === 'yes' */}
            {form.lead_interested === 'yes' && (
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
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
              <textarea rows={3} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observations, next steps, anything else..." data-testid="visit-notes" />
            </div>

            {/* Action Points (inline pre-save) */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-3" data-testid="visit-action-points">
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Action points</div>

              {/* Follow-up */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Add Follow-up</span>
                  <span className="text-[10px] text-slate-500">Needs Lead Interested = Yes</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input type="date" className="h-9 text-sm" value={followupDate} onChange={(e) => setFollowupDate(e.target.value)} data-testid="visit-followup-date" />
                  <Input className="h-9 text-sm" placeholder="Follow-up note (optional)" value={followupNote} onChange={(e) => setFollowupNote(e.target.value)} data-testid="visit-followup-note" />
                </div>
              </div>

              {/* Proposal */}
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Create Proposal</span>
                  <button type="button" onClick={openProposal} className="text-xs font-semibold text-indigo-600 hover:underline" data-testid="visit-proposal-btn">Open proposal builder</button>
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">Save the visit first — once the CRM lead is linked, use "CRM →" on the visit row to open the proposal builder.</p>
              </div>

              {/* Send Email */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer mb-1">
                  <input type="checkbox" checked={wantEmail} onChange={(e) => setWantEmail(e.target.checked)} data-testid="visit-email-toggle" />
                  <Mail className="w-3.5 h-3.5" /> Send Email to contact
                </label>
                {wantEmail && (
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <select className="h-9 px-2 border border-slate-200 rounded-lg text-xs bg-white"
                      value={emailTpl} onChange={(e) => setEmailTpl(e.target.value)} data-testid="visit-email-template">
                      {EMAIL_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                    <Input className="h-9 text-sm" type="email" placeholder="Recipient email" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} data-testid="visit-email-to" />
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={onClose} data-testid="visit-cancel">Cancel</Button>
              <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="visit-save">
                {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} {editMode ? 'Update visit' : 'Save visit'}
              </Button>
            </div>
          </div>
      </DialogContent>
      <CameraCaptureModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCaptured={onCameraCaptured} />
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

// ── View-Details modal ────────────────────────────────────────────
const ViewVisitModal = ({ open, visit, onClose, onEdit }) => {
  if (!visit) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto" data-testid="view-visit-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" /> {visit.school_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="text-xs text-slate-500">{fmtDateTime(visit.at)} · {visit.location_label || 'No address'}</div>
          {visit.photo_url && <img src={visit.photo_url} alt="visit" className="w-full max-h-64 object-cover rounded-lg border border-slate-200" />}
          <VisitRow v={visit} />
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" onClick={onClose}>Close</Button>
            <Button onClick={onEdit} className="bg-[#1E3A5F] hover:bg-[#0F203E]" data-testid="view-visit-edit-btn">
              <PenSquare className="w-4 h-4 mr-1" /> Edit Visit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ── Visit row inside day-wise report ───────────────────────────────
const VisitRow = ({ v, onView = null, onEdit = null }) => (
  <div className="rounded-lg border border-slate-200 bg-white p-3">
    <div className="flex items-center justify-between">
      <div className="font-semibold text-slate-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600" /> {v.school_name}</div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-slate-500">{fmtDateTime(v.at)}</span>
        {onView && (
          <button onClick={() => onView(v)} className="text-slate-400 hover:text-indigo-600" title="View details" data-testid={`visit-view-${v.id}`}>
            <Eye className="w-3.5 h-3.5" />
          </button>
        )}
        {onEdit && (
          <button onClick={() => onEdit(v)} className="text-slate-400 hover:text-indigo-600" title="Edit visit" data-testid={`visit-edit-${v.id}`}>
            <PenSquare className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
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
const DayGroupCard = ({ day, reports, onView, onEdit }) => {
  const [open, setOpen] = useState(false);
  const totalVisits = reports.reduce((n, r) => n + (r.school_visits?.length || 0), 0);
  const interested = reports.reduce((n, r) => n + (r.school_visits || []).filter(v => v.lead_interested === 'yes').length, 0);
  const entries = reports.reduce((n, r) => n + (r.school_visits || []).filter(v => v.got_entry === 'yes').length, 0);
  const km = reports.reduce((n, r) => n + Number(r.distance_km || 0), 0);
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
            <Chip tone="rose">{km.toFixed(1)} km</Chip>
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
                {r.distance_km > 0 && <Chip tone="rose">{Number(r.distance_km).toFixed(1)} km</Chip>}
              </div>
              {r.check_in?.photo_url && <img src={r.check_in.photo_url} alt="checkin" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />}
              {(r.school_visits || []).map(v => (
                <VisitRow key={v.id} v={v}
                  onView={() => onView && onView(r, v)}
                  onEdit={() => onEdit && onEdit(r, v)} />
              ))}
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
  const [viewVisit, setViewVisit] = useState(null);
  const [editVisit, setEditVisit] = useState(null);   // { reportId, visit }

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

  const [checkinCameraOpen, setCheckinCameraOpen] = useState(false);
  const [checkinBusy, setCheckinBusy] = useState(false);

  const startCheckIn = () => {
    if (busy || checkinBusy) return;
    setCheckinCameraOpen(true);
  };

  const doCheckInWithPhoto = async (file) => {
    setBusy(true);
    let lat = null, lon = null, photo_url = null;
    try {
      try { const c = await getCoords(); lat = c.lat; lon = c.lon; } catch {/* optional */}
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
    let lat = null, lon = null;
    try { const c = await getCoords(); lat = c.lat; lon = c.lon; } catch {/* optional */}
    try {
      await axios.patch(`${API}/field-reports/${current.id}/checkout`,
        { latitude: lat, longitude: lon }, { headers: getAuthHeaders() });
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
    let visits = 0, entries = 0, interested = 0, km = 0;
    filteredReports.forEach(r => {
      days.add(dayKey(r.check_in?.at || r.created_at));
      km += Number(r.distance_km || 0);
      (r.school_visits || []).forEach(v => {
        visits += 1;
        if (v.got_entry === 'yes') entries += 1;
        if (v.lead_interested === 'yes') interested += 1;
      });
    });
    return { days: days.size, visits, entries, interested, km: Math.round(km * 100) / 100 };
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
                <Button onClick={startCheckIn} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700" data-testid="checkin-btn">
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Camera className="w-4 h-4 mr-1" />}
                  Check In (click photo)
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Chip tone="emerald">Live</Chip>
                    <span className="text-sm text-slate-600">since {fmtDateTime(current.check_in?.at)}</span>
                    {current.distance_km > 0 && <Chip tone="rose">{Number(current.distance_km).toFixed(1)} km so far</Chip>}
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
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-500">{fmtDateTime(v.at)}</span>
                            <button onClick={() => setViewVisit({ reportId: current.id, visit: v })}
                              className="text-slate-400 hover:text-indigo-600" title="View details" data-testid={`today-view-${v.id}`}>
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditVisit({ reportId: current.id, visit: v })}
                              className="text-slate-400 hover:text-indigo-600" title="Edit visit" data-testid={`today-edit-${v.id}`}>
                              <PenSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Days on Field', val: kpis.days, color: 'from-emerald-600 to-emerald-400' },
                { label: 'Schools Visited', val: kpis.visits, color: 'from-blue-600 to-blue-400' },
                { label: 'Entries Gained', val: kpis.entries, color: 'from-indigo-600 to-indigo-400' },
                { label: 'Schools Interested', val: kpis.interested, color: 'from-amber-600 to-amber-400' },
                { label: 'Distance (km)', val: kpis.km, color: 'from-rose-600 to-rose-400' },
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
                  {grouped.map(([day, rows]) => (
                    <DayGroupCard key={day} day={day} reports={rows}
                      onView={(r, v) => setViewVisit({ reportId: r.id, visit: v })}
                      onEdit={(r, v) => setEditVisit({ reportId: r.id, visit: v })} />
                  ))}
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
      <CameraCaptureModal
        open={checkinCameraOpen}
        onClose={() => setCheckinCameraOpen(false)}
        onCaptured={(f) => f && doCheckInWithPhoto(f)}
      />
      <ViewVisitModal open={!!viewVisit} visit={viewVisit?.visit || null}
        onClose={() => setViewVisit(null)}
        onEdit={() => { const v = viewVisit; setViewVisit(null); setEditVisit(v); }} />
      <SchoolVisitModal
        open={!!editVisit}
        onClose={() => setEditVisit(null)}
        onSaved={() => load()}
        reportId={editVisit?.reportId}
        getAuthHeaders={getAuthHeaders}
        initialVisit={editVisit?.visit || null}
        editMode
      />
    </AdminLayout>
  );
}
