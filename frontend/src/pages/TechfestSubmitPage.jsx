/**
 * Techfest — Project submission page. Reuses the register-page shell &
 * design tokens (icse-* classes are loaded there). Sits at
 * /techfest/submit and links off the "Submit Project" CTA on the
 * landing + register pages.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Upload, User, Mail, Phone, MapPin, Building2, GraduationCap,
  Trophy, Calendar, Loader2, CheckCircle2, Link2, Cake, Users, Plus, Trash2, FileText, FileDown,
} from 'lucide-react';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

export const ZONES = [
  { slug: 'west',    label: 'West · IIT Bombay · 17 Dec 2026'              },
  { slug: 'east',    label: 'East · IIT Kanpur · 24 Oct 2026'              },
  { slug: 'north',   label: 'North · Modern Public School, Shalimar Bagh, Delhi · 21 Nov 2026'},
  { slug: 'south',   label: 'South · RVCE College, Bangalore · 26 Nov 2026' },
  { slug: 'central', label: 'Central · Indore (Date TBA)'                  },
];
export const COMPETITIONS = [
  { slug: 'robo_sumo',       label: 'Robo Sumo',                 zonal: true  },
  { slug: 'robo_race',       label: 'Robo Race',                 zonal: true  },
  { slug: 'robo_innovation', label: 'Robo Innovation Challenge', zonal: false },
];
export const AGE_CATEGORIES = [
  { slug: 'junior', label: 'Junior · Grade 4-7' },
  { slug: 'senior', label: 'Senior · Grade 8-12' },
];
export const INNOVATION_CATEGORIES = [
  'Healthcare', 'Education', 'Agriculture', 'Sustainability',
  'Assistive Tech', 'Smart Home', 'Transportation', 'Other',
];
export const MAX_TEAM_MEMBERS = 5;
export const emptyMember = () => ({ name: '', date_of_birth: '', email: '', phone: '', school: '', id_proof_url: '', id_proof_type: 'aadhar' });

// Compute age from a Date-of-birth ISO string (YYYY-MM-DD)
const ageFromDob = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? String(age) : '';
};

export default function TechfestSubmitPage() {
  useEffect(() => { document.title = 'Submit Project · OLL Robotics Championship · Techfest 2026'; }, []);

  const DRAFT_KEY = 'techfest-submit-draft-v2';

  const initialForm = {
    full_name: '', date_of_birth: '', age: '', email: '', phone: '',
    country: 'India', pincode: '', state: '', city: '', school_or_college: '',
    age_category: '',
    // NEW: main student's ID proof
    id_proof_url: '', id_proof_type: 'aadhar',
    competition: '', zone: '',
    project_category: '', project_theme: '',
    team_id: '', competition_id: '', drive_link: '',
    school_permission_url: '',
    team_members: [],   // extra members (excludes the team lead)
  };

  // Restore draft from localStorage on mount (only if not already submitted).
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...initialForm, ...parsed };
      }
    } catch { /* ignore */ }
    return initialForm;
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [submissionRef, setSubmissionRef] = useState(''); // id returned by backend on successful submit
  const [error, setError] = useState('');
  const [draftSavedAt, setDraftSavedAt] = useState(null);

  // Autosave to localStorage on every form change (debounced by React batching).
  // Only saves when the user has typed at least one field so blank drafts
  // don't overwrite existing ones between refreshes.
  useEffect(() => {
    if (done) return;
    const hasContent = Object.entries(form).some(([k, v]) => {
      if (k === 'country') return v && v !== 'India';
      if (Array.isArray(v)) return v.length > 0;
      return !!(v && String(v).trim());
    });
    if (!hasContent) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setDraftSavedAt(new Date());
    } catch { /* quota exceeded — silently ignore */ }
  }, [form, done]);

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
    setForm(initialForm);
    setDraftSavedAt(null);
  };

  const setField = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'date_of_birth') next.age = ageFromDob(v);
      return next;
    });
  };

  const isInnovation = form.competition === 'robo_innovation';
  const isZonal      = form.competition === 'robo_sumo' || form.competition === 'robo_race';

  // ── Team members ──────────────────────────────────────────
  const addMember = () => setForm((f) => ({
    ...f,
    team_members: f.team_members.length < MAX_TEAM_MEMBERS ? [...f.team_members, emptyMember()] : f.team_members,
  }));
  const removeMember = (i) => setForm((f) => ({ ...f, team_members: f.team_members.filter((_, idx) => idx !== i) }));
  const updateMember = (i, k, v) => setForm((f) => ({
    ...f, team_members: f.team_members.map((m, idx) => (idx === i ? { ...m, [k]: v } : m)),
  }));

  // ── File uploads (ID proof / school permission letter) ────
  // Uses /api/upload which now accepts .pdf / .png / .jpg / .webp / .heic.
  // Public upload endpoint requires auth — but Techfest submitters are
  // NOT logged in. So we serve the file through a naked FormData POST
  // to /api/techfest/upload which we expose without auth.
  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('type', file.type?.startsWith('image/') ? 'images' : 'documents');
    // Try public techfest upload first, fall back to admin /upload if it
    // fails (backward compat while we ship the public endpoint).
    const res = await fetch(`${API_BASE}/api/techfest/upload`, { method: 'POST', body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || 'Upload failed');
    }
    const data = await res.json();
    return data.url;
  };
  const [uploadingKey, setUploadingKey] = useState('');
  const [downloadingLetter, setDownloadingLetter] = useState(false);
  const pickAndUpload = async (key, onDone) => {
    setUploadingKey(key);
    try {
      const file = await new Promise((res) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = () => res(input.files?.[0] || null);
        input.click();
      });
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { setError('File too large (max 10MB)'); return; }
      const url = await uploadFile(file);
      onDone(url);
    } catch (err) { setError(err.message || 'Upload failed'); }
    finally { setUploadingKey(''); }
  };

  // ── Pre-filled permission letter download ────────────────
  const downloadPermissionLetter = async () => {
    setError('');
    setDownloadingLetter(true);
    try {
      const payload = {
        full_name: form.full_name || '',
        date_of_birth: form.date_of_birth || '',
        email: form.email || '',
        phone: form.phone || '',
        school_or_college: form.school_or_college || '',
        competition: form.competition || '',
        zone: form.zone || '',
        age_category: form.age_category || '',
        team_members: (form.team_members || []).filter((m) => m.name?.trim()),
      };
      const res = await fetch(`${API_BASE}/api/techfest/permission-letter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Could not build the letter');
      const blob = await res.blob();
      // Extract filename from content-disposition header if present.
      const cd = res.headers.get('content-disposition') || '';
      const match = cd.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : 'OLL-Techfest-Permission-Letter.docx';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || 'Could not download the letter');
    } finally { setDownloadingLetter(false); }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    // ── Comprehensive required-field validation ──
    const REQUIRED = [
      ['full_name', 'Full Name'],
      ['date_of_birth', 'Date of Birth'],
      ['email', 'Email'],
      ['phone', 'Phone Number'],
      ['country', 'Country'],
      ['pincode', 'Pincode'],
      ['state', 'State'],
      ['city', 'City'],
      ['school_or_college', 'School / College Name'],
      ['age_category', 'Age Category'],
      ['id_proof_url', 'ID Proof of Main Student'],
      ['id_proof_type', 'ID Proof Type'],
      ['competition', 'Competition'],
      ['team_id', 'Team ID'],
      ['competition_id', 'Competition ID'],
      ['drive_link', 'Google Drive Link'],
    ];
    for (const [k, label] of REQUIRED) {
      if (!form[k] || !String(form[k]).trim()) {
        setError(`Please fill ${label}`);
        try { document.querySelector(`[data-testid="sub-${k.replace(/_/g,'-')}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
        return;
      }
    }
    if (isZonal && !form.zone) { setError('Please select your zone'); return; }
    if (isInnovation) {
      if (!form.project_category) { setError('Please pick a project category'); return; }
      if (!form.project_theme)    { setError('Please pick a project theme'); return; }
    }
    if (!form.drive_link.startsWith('http')) { setError('Please paste a valid Google Drive link'); return; }
    // If any team member row exists, every field on that row must be filled.
    for (let i = 0; i < form.team_members.length; i++) {
      const m = form.team_members[i];
      const missing = [];
      if (!m.name?.trim()) missing.push('Name');
      if (!m.date_of_birth) missing.push('DOB');
      if (!m.email?.trim()) missing.push('Email');
      if (!m.phone?.trim()) missing.push('Phone');
      if (!m.school?.trim()) missing.push('School');
      if (!m.id_proof_url) missing.push('ID Proof');
      if (missing.length) {
        setError(`Team member #${i + 2}: please fill ${missing.join(', ')}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        zone: isZonal ? form.zone : undefined,
        project_category: isInnovation ? (form.project_category || undefined) : undefined,
        project_theme:    isInnovation ? (form.project_theme    || undefined) : undefined,
        team_members: (form.team_members || []).filter((m) => m.name?.trim()),
      };
      const res = await fetch(`${API_BASE}/api/techfest/submissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Submission failed');
      // Success — clear the saved draft so refreshing doesn't repopulate.
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setSubmissionRef(data?.id || '');
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    } catch (err) {
      setError(typeof err.message === 'string' ? err.message : 'Submission failed');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white" data-testid="techfest-submit-page">
      <style>{`
        .trp-input { width:100%; height:44px; padding:0 14px; border:1.5px solid #E2E8F0; border-radius:12px; font-size:14px; background:#fff; transition:border-color .15s ease, box-shadow .15s ease; }
        .trp-input:focus { border-color:#DC2626; outline:none; box-shadow: 0 0 0 3px rgba(220,38,38,0.12); }
        .trp-label { display:block; font-family:'Proxima Nova','Montserrat',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; color:#0A1F44; margin-bottom:6px; }
        .trp-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 20px; border-radius:12px; font-family:'Proxima Nova','Montserrat',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; transition:transform .15s ease, box-shadow .15s ease; }
        .trp-btn.primary { background:#DC2626; color:#fff; box-shadow: 0 10px 24px rgba(220,38,38,0.35); }
        .trp-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(220,38,38,0.45); }
        .trp-eyebrow { font-family:'Proxima Nova','Montserrat',sans-serif; font-size:11px; font-weight:800; letter-spacing:0.18em; text-transform:uppercase; }
        .trp-h1 { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:900; letter-spacing:-0.02em; }
      `}</style>

      <header className="border-b border-slate-100 py-4 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/techfest" className="inline-flex items-center gap-2">
            <img src={OLL_LOGO} alt="OLL" className="h-7" />
          </Link>
          <Link to="/techfest" className="text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-[#0A1F44]">← Back to Techfest</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {done ? (
          <div className="py-12" data-testid="techfest-submit-success">
            <div className="max-w-xl mx-auto text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <h1 className="trp-h1 text-3xl text-[#0A1F44]">Project submitted!</h1>
              <p className="text-slate-600 mt-3 font-light">
                We've emailed a confirmation to <strong>{form.email}</strong> with your submission details. The OLL team &amp; Techfest jury will review and share the next update on your email + WhatsApp.
              </p>
              {submissionRef && (
                <div className="mt-6 inline-block rounded-xl border border-slate-200 bg-slate-50 px-5 py-3 text-left">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Submission reference</div>
                  <div className="font-mono text-sm text-[#0A1F44] mt-1" data-testid="techfest-submission-ref">{submissionRef}</div>
                </div>
              )}
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-left">
                <strong>Need to edit later?</strong> You can update your project details any time until <strong>1 Nov 2026, 11:59 PM IST</strong> (East Zone · Kanpur: <strong>20 Oct 2026</strong>). Head to the submission portal and sign in with your Team ID or the team leader's phone number.
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Link to="/techfest/my-submission" className="trp-btn primary inline-flex" data-testid="techfest-view-submission">
                  View / Update Submission <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to="/techfest" className="trp-btn inline-flex border border-slate-200 text-[#0A1F44]">
                  Back to Techfest
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="trp-eyebrow text-[#DC2626] flex items-center gap-2"><Upload className="w-3 h-3" /> Techfest 2026 · Submission Portal</div>
              <h1 className="trp-h1 text-3xl sm:text-4xl text-[#0A1F44] mt-1">Submit your project</h1>
              <p className="text-slate-600 mt-2 font-light">
                Upload your final project details to be considered for the Grand Finale at IIT Bombay. Once submitted, our team will validate it and confirm your competition slot.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm text-slate-600">Already submitted? Update any detail of your entry.</span>
                <Link to="/techfest/my-submission" className="trp-btn inline-flex border border-[#0A1F44] text-[#0A1F44] text-xs" data-testid="techfest-edit-submission-btn">
                  Edit Submission <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700" data-testid="techfest-submit-error">
                {error}
              </div>
            )}

            <form onSubmit={submit} className="space-y-6" data-testid="techfest-submit-form">
              <section>
                <h2 className="trp-eyebrow text-slate-500 mb-3 flex items-center gap-1.5"><User className="w-3 h-3" /> Personal details</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="trp-label">Full Name*</label>
                    <input required className="trp-input" value={form.full_name} onChange={setField('full_name')} data-testid="sub-full-name" />
                  </div>
                  <div>
                    <label className="trp-label"><Cake className="w-3 h-3 inline mr-1" /> Date of Birth*</label>
                    <input required type="date" className="trp-input" value={form.date_of_birth} onChange={setField('date_of_birth')} data-testid="sub-dob" />
                  </div>
                  <div>
                    <label className="trp-label">Age</label>
                    <input readOnly className="trp-input bg-slate-50" value={form.age} placeholder="Auto-filled from DOB" data-testid="sub-age" />
                  </div>
                  <div>
                    <label className="trp-label"><Mail className="w-3 h-3 inline mr-1" /> Email Address*</label>
                    <input required type="email" className="trp-input" value={form.email} onChange={setField('email')} data-testid="sub-email" />
                  </div>
                  <div>
                    <label className="trp-label"><Phone className="w-3 h-3 inline mr-1" /> Phone Number*</label>
                    <input required className="trp-input" value={form.phone} onChange={setField('phone')} data-testid="sub-phone" />
                  </div>
                  <div>
                    <label className="trp-label">Country*</label>
                    <input required className="trp-input" value={form.country} onChange={setField('country')} data-testid="sub-country" />
                  </div>
                </div>
              </section>

              {/* ─── Main Student · ID Proof (mandatory) ─── */}
              <section className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-4" data-testid="sub-main-id-block">
                <h2 className="trp-eyebrow text-amber-800 mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3" /> Main Student · ID Proof <span className="text-rose-600">*</span></h2>
                <p className="text-[11px] text-slate-600 font-light mb-3">Upload the team lead&apos;s Aadhaar / PAN / valid ID. This is mandatory for verification on match day.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    className="trp-input"
                    style={{ width: 'auto', paddingRight: 32 }}
                    value={form.id_proof_type}
                    onChange={setField('id_proof_type')}
                    data-testid="sub-id-proof-type"
                  >
                    <option value="aadhar">Aadhar card</option>
                    <option value="pan">PAN card</option>
                    <option value="other">Other</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => pickAndUpload('main-id', (url) => setForm((f) => ({ ...f, id_proof_url: url })))}
                    disabled={uploadingKey === 'main-id'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A1F44] text-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-60"
                    data-testid="sub-id-proof-url"
                  >
                    {uploadingKey === 'main-id' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {form.id_proof_url ? 'Replace ID' : 'Upload ID'}
                  </button>
                  {form.id_proof_url && (
                    <a href={form.id_proof_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> ID uploaded
                    </a>
                  )}
                </div>
              </section>

              {/* ─── Team members (moved: appears right below Personal details) ─── */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="trp-eyebrow text-slate-500 flex items-center gap-1.5"><Users className="w-3 h-3" /> Team Members ({form.team_members.length + 1} / {MAX_TEAM_MEMBERS + 1})</h2>
                  {form.team_members.length < MAX_TEAM_MEMBERS && (
                    <button type="button" onClick={addMember} className="text-[11px] font-bold text-[#DC2626] uppercase tracking-widest inline-flex items-center gap-1" data-testid="sub-add-member">
                      <Plus className="w-3 h-3" /> Add member
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-light mb-3">You (the team lead) count as member 1 — details taken from above. Add up to 4 more. <strong>Every field on each added member row is mandatory.</strong></p>
                {form.team_members.map((m, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-3" data-testid={`sub-member-${i}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-bold text-slate-600">Member {i + 2}</div>
                      <button type="button" onClick={() => removeMember(i)} className="text-slate-400 hover:text-red-500" data-testid={`sub-member-remove-${i}`}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <input required className="trp-input" placeholder="Full Name*" value={m.name} onChange={(e) => updateMember(i, 'name', e.target.value)} data-testid={`sub-member-${i}-name`} />
                      <input required type="date" className="trp-input" placeholder="DOB*" value={m.date_of_birth} onChange={(e) => updateMember(i, 'date_of_birth', e.target.value)} data-testid={`sub-member-${i}-dob`} />
                      <input required type="email" className="trp-input" placeholder="Email*" value={m.email} onChange={(e) => updateMember(i, 'email', e.target.value)} data-testid={`sub-member-${i}-email`} />
                      <input required className="trp-input" placeholder="Phone*" value={m.phone} onChange={(e) => updateMember(i, 'phone', e.target.value)} data-testid={`sub-member-${i}-phone`} />
                      <input required className="trp-input sm:col-span-2" placeholder="School / College*" value={m.school} onChange={(e) => updateMember(i, 'school', e.target.value)} data-testid={`sub-member-${i}-school`} />
                      <div className="sm:col-span-2">
                        <div className="flex items-center gap-2">
                          <select className="trp-input flex-1" value={m.id_proof_type} onChange={(e) => updateMember(i, 'id_proof_type', e.target.value)}>
                            <option value="aadhar">Aadhar card</option>
                            <option value="pan">PAN card</option>
                            <option value="other">Other</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => pickAndUpload(`member-${i}`, (url) => updateMember(i, 'id_proof_url', url))}
                            disabled={uploadingKey === `member-${i}`}
                            className="trp-input flex items-center justify-center gap-1.5 font-bold text-[11px] uppercase tracking-widest cursor-pointer hover:bg-slate-50 disabled:opacity-60"
                            style={{ width: 'auto', paddingLeft: 16, paddingRight: 16 }}
                            data-testid={`sub-member-${i}-idproof-upload`}
                          >
                            {uploadingKey === `member-${i}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                            {m.id_proof_url ? 'Replace ID*' : 'Upload ID*'}
                          </button>
                        </div>
                        {m.id_proof_url && (
                          <a href={m.id_proof_url} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                            <CheckCircle2 className="w-3 h-3" /> ID uploaded
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h2 className="trp-eyebrow text-slate-500 mb-3 flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Address</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="trp-label">Pincode*</label>
                    <input required className="trp-input" value={form.pincode} onChange={setField('pincode')} data-testid="sub-pincode" />
                  </div>
                  <div>
                    <label className="trp-label">State*</label>
                    <input required className="trp-input" value={form.state} onChange={setField('state')} data-testid="sub-state" />
                  </div>
                  <div>
                    <label className="trp-label">City*</label>
                    <input required className="trp-input" value={form.city} onChange={setField('city')} data-testid="sub-city" />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="trp-label"><GraduationCap className="w-3 h-3 inline mr-1" /> School / College Name*</label>
                    <input required className="trp-input" value={form.school_or_college} onChange={setField('school_or_college')} data-testid="sub-school" />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="trp-eyebrow text-slate-500 mb-3 flex items-center gap-1.5"><Trophy className="w-3 h-3" /> Competition</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="trp-label">Competition*</label>
                    <select required className="trp-input" value={form.competition} onChange={(e) => setForm((f) => ({ ...f, competition: e.target.value, zone: '' }))} data-testid="sub-competition">
                      <option value="">Select competition</option>
                      {COMPETITIONS.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="trp-label">Age Category*</label>
                    <select required className="trp-input" value={form.age_category} onChange={setField('age_category')} data-testid="sub-age-category">
                      <option value="">Select category</option>
                      {AGE_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                    </select>
                  </div>
                  {isZonal && (
                    <div className="sm:col-span-2">
                      <label className="trp-label">Zone*</label>
                      <select required className="trp-input" value={form.zone} onChange={setField('zone')} data-testid="sub-zone">
                        <option value="">Select your zone</option>
                        {ZONES.map((z) => <option key={z.slug} value={z.slug}>{z.label}</option>)}
                      </select>
                      <p className="mt-1 text-[11px] text-slate-500 font-light">Only Robo Sumo &amp; Robo Race are zonal. Pick the round closest to you.</p>
                    </div>
                  )}
                  {isInnovation && (
                    <>
                      <div>
                        <label className="trp-label">Project Category*</label>
                        <select required className="trp-input" value={form.project_category} onChange={setField('project_category')} data-testid="sub-project-category">
                          <option value="">Select category</option>
                          {INNOVATION_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="trp-label">Project Theme*</label>
                        <input required className="trp-input" value={form.project_theme} onChange={setField('project_theme')} placeholder="e.g. Autonomous crop-monitor" data-testid="sub-project-theme" />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="trp-label">Team ID*</label>
                    <input required className="trp-input" value={form.team_id} onChange={setField('team_id')} placeholder="From techfest.org" data-testid="sub-team-id" />
                  </div>
                  <div>
                    <label className="trp-label">Competition ID*</label>
                    <input required className="trp-input" value={form.competition_id} onChange={setField('competition_id')} placeholder="From techfest.org" data-testid="sub-competition-id" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="trp-label"><Link2 className="w-3 h-3 inline mr-1" /> Google Drive Link*</label>
                    <input
                      required
                      type="url"
                      className="trp-input"
                      value={form.drive_link}
                      onChange={setField('drive_link')}
                      placeholder="https://drive.google.com/…"
                      data-testid="sub-drive-link"
                    />
                    <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-600 font-light leading-relaxed">
                      <div className="font-bold text-slate-700 mb-1">Your Drive folder must contain:</div>
                      <ul className="list-disc pl-4 space-y-1">
                        <li><strong>Technical Abstract (Track 1 &amp; 2)</strong> — 500-800 words covering: team &amp; bot name, one-line design approach; mechanical design (chassis, dimensions/weight, structural choices); drivetrain &amp; motors (type/count, wheels, battery/voltage); control system (wired/wireless for Track 1; RC setup for Track 2); match strategy (pushing/defense or driving approach).</li>
                        <li><strong>Design diagram or sketch</strong> — a labelled diagram, circuit sketch, or CAD drawing showing how the prototype is structured and how its parts connect.</li>
                        <li><strong>Short video demonstration</strong> of your bot running.</li>
                        <li>Make sure the folder is <strong>Anyone with the link · Viewer</strong> so the jury can access it.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </section>

              {/* ─── School permission letter ─── */}
              <section className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-4" data-testid="sub-permission-block">
                <h2 className="trp-eyebrow text-slate-500 mb-2 flex items-center gap-1.5"><FileText className="w-3 h-3" /> School Permission Letter</h2>
                <p className="text-[11px] text-slate-600 font-light mb-3">We&rsquo;ll pre-fill this letter with your team &amp; competition details — just print it on your school letterhead, get it signed by the principal, then upload the scan/PDF here.</p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={downloadPermissionLetter}
                    disabled={downloadingLetter}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest text-slate-700 hover:border-slate-400 disabled:opacity-60"
                    data-testid="sub-permission-download"
                  >
                    {downloadingLetter ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    Download pre-filled letter
                  </button>
                  <button
                    type="button"
                    onClick={() => pickAndUpload('permission', (url) => setForm((f) => ({ ...f, school_permission_url: url })))}
                    disabled={uploadingKey === 'permission'}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#0A1F44] text-white px-3 py-2 text-[11px] font-bold uppercase tracking-widest disabled:opacity-60"
                    data-testid="sub-permission-upload"
                  >
                    {uploadingKey === 'permission' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {form.school_permission_url ? 'Replace signed letter' : 'Upload signed letter'}
                  </button>
                  {form.school_permission_url && (
                    <a href={form.school_permission_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
                      <CheckCircle2 className="w-3 h-3" /> Uploaded
                    </a>
                  )}
                </div>
              </section>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="trp-btn primary disabled:opacity-70"
                  data-testid="techfest-submit-btn"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Submit Project</>}
                </button>
                {draftSavedAt && (
                  <span className="text-[11px] text-slate-500 font-light inline-flex items-center gap-1.5" data-testid="sub-draft-indicator">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Draft auto-saved · your data is safe if you leave
                  </span>
                )}
                {draftSavedAt && (
                  <button
                    type="button"
                    onClick={() => { if (window.confirm('Clear all saved draft data on this device?')) clearDraft(); }}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                    data-testid="sub-draft-clear"
                  >
                    Clear draft
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
