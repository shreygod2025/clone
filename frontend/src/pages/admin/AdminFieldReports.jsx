/**
 * Field Reports — team members log a "field day": a check-in with
 * geolocation + selfie, followed by any number of school visits and a
 * meeting note per visit. Managers see everyone's reports; regular
 * users see their own.
 *
 * Two tabs:
 *   • My Field Day → the live check-in / add-visit / add-meeting flow
 *   • Reports      → read-only browse of every report (scoped)
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import {
  MapPin, Camera, LogOut, LogIn, Building2, Users, Plus, FileText,
  Calendar, Phone, Mail, Trash2, ChevronDown, ChevronRight, Loader2, User,
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

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
};

// ── Geolocation helper — returns { lat, lon } or throws ───────────
const getCoords = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) return reject(new Error('Geolocation not available'));
  navigator.geolocation.getCurrentPosition(
    (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
    (e) => reject(e),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

const uploadImage = async (file, getAuthHeaders) => {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('type', 'images');
  const res = await axios.post(`${API}/upload`, fd, { headers: getAuthHeaders() });
  return res.data.url;
};

// ── Small building blocks ─────────────────────────────────────────
const Chip = ({ children, tone = 'slate' }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-${tone}-100 text-${tone}-700 border border-${tone}-200`}>
    {children}
  </span>
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
  notes: '',
  latitude: null, longitude: null,
});

const SchoolVisitModal = ({ open, onClose, onSaved, reportId, getAuthHeaders }) => {
  const [form, setForm] = useState(emptyVisit());
  const [saving, setSaving] = useState(false);
  const [locBusy, setLocBusy] = useState(false);

  useEffect(() => { if (open) setForm(emptyVisit()); }, [open]);

  const captureLocation = async () => {
    setLocBusy(true);
    try {
      const { lat, lon } = await getCoords();
      setForm((f) => ({ ...f, latitude: lat, longitude: lon }));
      toast.success('Location captured');
    } catch (e) {
      toast.error(e.message || 'Location unavailable');
    } finally { setLocBusy(false); }
  };

  const updateContact = (i, k, v) => setForm((f) => ({
    ...f, contacts: f.contacts.map((c, idx) => (idx === i ? { ...c, [k]: v } : c)),
  }));
  const addContact = () => setForm((f) => ({ ...f, contacts: [...f.contacts, { name: '', phone: '', email: '', role: '' }] }));
  const removeContact = (i) => setForm((f) => ({ ...f, contacts: f.contacts.length > 1 ? f.contacts.filter((_, idx) => idx !== i) : f.contacts }));

  const save = async () => {
    if (!form.school_name.trim()) { toast.error('School name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        contacts: form.contacts.filter((c) => c.name?.trim()),
        // Strip empty emails so Pydantic's EmailStr doesn't reject the whole row.
      };
      payload.contacts = payload.contacts.map((c) => ({
        ...c,
        email: c.email?.trim() ? c.email.trim() : undefined,
      }));
      const res = await axios.post(`${API}/field-reports/${reportId}/school-visits`, payload, { headers: getAuthHeaders() });
      toast.success('School visit saved');
      onSaved(res.data);
      onClose();
    } catch (e) {
      toast.error(e?.response?.data?.detail || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="school-visit-modal">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5 text-emerald-600" /> Log School Visit</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">School Name *</label>
              <Input value={form.school_name} onChange={(e) => setForm({ ...form, school_name: e.target.value })} data-testid="visit-school-name" />
            </div>
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
              <div className="flex gap-2" data-testid="visit-robotics">
                {['yes', 'no'].map((v) => {
                  const active = form.has_robotics === v;
                  return (
                    <button key={v} type="button" onClick={() => setForm({ ...form, has_robotics: v, robotics_provider: v === 'yes' ? form.robotics_provider : '' })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border-2 ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-500' : 'border-slate-200 text-slate-500'}`}>
                      {v}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {form.has_robotics === 'yes' && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Provided by</label>
              <Input placeholder="e.g. WhiteHat Jr, In-house" value={form.robotics_provider} onChange={(e) => setForm({ ...form, robotics_provider: e.target.value })} data-testid="visit-robotics-provider" />
            </div>
          )}

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
                <Input className="col-span-2" placeholder="Role" value={c.role} onChange={(e) => updateContact(i, 'role', e.target.value)} />
                <button type="button" onClick={() => removeContact(i)} className="col-span-1 rounded-lg border border-slate-200 hover:border-red-300 hover:text-red-500 text-slate-400 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} data-testid="visit-cancel">Cancel</Button>
            <Button onClick={save} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700" data-testid="visit-save">
              {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : null} Save visit
            </Button>
          </div>
        </div>
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

// ── Report card ───────────────────────────────────────────────────
const ReportCard = ({ r }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid={`report-card-${r.id}`}>
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start gap-3 p-4 hover:bg-slate-50 text-left">
        {open ? <ChevronDown className="w-4 h-4 text-slate-400 mt-1" /> : <ChevronRight className="w-4 h-4 text-slate-400 mt-1" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-800">{r.user_name}</span>
            <Chip tone={r.check_out ? 'slate' : 'emerald'}>{r.check_out ? 'Closed' : 'Live'}</Chip>
            <span className="text-xs text-slate-500 ml-auto">{fmtDateTime(r.check_in?.at)}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1"><Building2 className="w-3 h-3" /> {r.school_visits?.length || 0} visits</span>
            {r.check_in?.location_label && <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.check_in.location_label}</span>}
          </div>
        </div>
      </button>
      {open && (
        <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50/50">
          {r.check_in?.photo_url && (
            <img src={r.check_in.photo_url} alt="check-in" className="w-32 h-32 object-cover rounded-lg border border-slate-200" />
          )}
          {r.check_in?.latitude != null && <MapPreview lat={r.check_in.latitude} lon={r.check_in.longitude} />}
          {r.check_in?.notes && <div className="text-sm text-slate-600 whitespace-pre-wrap">{r.check_in.notes}</div>}
          {(r.school_visits || []).map((v) => (
            <div key={v.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600" /> {v.school_name}</div>
                <span className="text-[11px] text-slate-500">{fmtDateTime(v.at)}</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 flex flex-wrap gap-1.5">
                {v.city && <Chip tone="slate">{v.city}</Chip>}
                {v.board && <Chip tone="blue">{v.board}</Chip>}
                {v.student_count && <Chip tone="amber">{v.student_count} students</Chip>}
                {v.fees_range && <Chip tone="purple">{v.fees_range}</Chip>}
                {v.has_robotics === 'yes' && <Chip tone="emerald">Robotics ✓ {v.robotics_provider ? `· ${v.robotics_provider}` : ''}</Chip>}
                {v.has_robotics === 'no' && <Chip tone="rose">No robotics</Chip>}
              </div>
              {v.contacts?.length > 0 && (
                <div className="mt-2 text-xs text-slate-700">
                  {v.contacts.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 py-0.5">
                      <span className="font-medium">{c.name}</span>
                      {c.role && <span className="text-slate-400">· {c.role}</span>}
                      {c.phone && <span className="inline-flex items-center gap-1 text-slate-500"><Phone className="w-3 h-3" /> {c.phone}</span>}
                      {c.email && <span className="inline-flex items-center gap-1 text-slate-500"><Mail className="w-3 h-3" /> {c.email}</span>}
                    </div>
                  ))}
                </div>
              )}
              {v.meeting && (
                <div className="mt-2 rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs">
                  <div className="text-slate-700 whitespace-pre-wrap"><strong>Meeting:</strong> {v.meeting.report}</div>
                  {v.meeting.product_problems && <div className="mt-1 text-rose-700 whitespace-pre-wrap"><strong>Issues:</strong> {v.meeting.product_problems}</div>}
                  {v.meeting.next_step && <div className="mt-1 text-emerald-700"><strong>Next:</strong> {v.meeting.next_step}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────
export default function AdminFieldReports() {
  const { user, getAuthHeaders } = useAuth();
  const [tab, setTab] = useState('my-day');
  const [current, setCurrent] = useState(null);      // active/latest live checkin for THIS user
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showVisit, setShowVisit] = useState(false);
  const [meetingCtx, setMeetingCtx] = useState(null); // { reportId, visitId } | null

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/field-reports`, { headers: getAuthHeaders() });
      setReports(res.data || []);
      // Live check-in for this user = most recent without check_out
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
      // Ask for a selfie
      const file = await new Promise((res) => {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = 'image/*'; input.capture = 'user';
        input.onchange = () => res(input.files?.[0] || null);
        input.click();
      });
      if (file) {
        try { photo_url = await uploadImage(file, getAuthHeaders); } catch {/* optional */}
      }
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

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto" data-testid="admin-field-reports">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><MapPin className="w-6 h-6 text-emerald-600" /> Field Reports</h1>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'my-day' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('my-day')} data-testid="tab-my-day">My Field Day</button>
            <button className={`px-3 py-1.5 text-sm font-medium rounded ${tab === 'reports' ? 'bg-white shadow' : 'text-slate-600'}`} onClick={() => setTab('reports')} data-testid="tab-reports">Reports ({reports.length})</button>
          </div>
        </div>

        {tab === 'my-day' && (
          <div className="space-y-4" data-testid="field-my-day">
            {!current ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <div className="font-semibold text-slate-800">Ready to hit the field?</div>
                <div className="text-sm text-slate-500 mt-1 mb-4">Check in to record your location and start logging school visits.</div>
                <Button onClick={doCheckIn} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700" data-testid="checkin-btn">
                  {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <LogIn className="w-4 h-4 mr-1" />}
                  Check In
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
                {current.check_in?.photo_url && (
                  <img src={current.check_in.photo_url} alt="check-in" className="w-24 h-24 object-cover rounded-lg border border-slate-200" />
                )}
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
                          <div className="mt-2 text-xs text-slate-600">
                            <FileText className="w-3.5 h-3.5 inline mr-1" /> Meeting logged
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'reports' && (
          <div className="space-y-3" data-testid="field-reports-list">
            {loading ? (
              <div className="text-center py-8 text-slate-400"><Loader2 className="w-5 h-5 mx-auto animate-spin" /></div>
            ) : reports.length === 0 ? (
              <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-500 text-sm">No field reports yet.</div>
            ) : (
              reports.map((r) => <ReportCard key={r.id} r={r} />)
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
