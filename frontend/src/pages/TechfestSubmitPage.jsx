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
  Trophy, Calendar, Loader2, CheckCircle2, Link2, Cake,
} from 'lucide-react';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const ZONES = [
  { slug: 'west',    label: 'West · Mumbai'    },
  { slug: 'east',    label: 'East · Kanpur'    },
  { slug: 'north',   label: 'North · Delhi'    },
  { slug: 'south',   label: 'South · Bangalore'},
  { slug: 'central', label: 'Central · Indore' },
];
const COMPETITIONS = [
  { slug: 'robo_sumo',       label: 'Robo Sumo' },
  { slug: 'robo_race',       label: 'Robo Race' },
  { slug: 'robo_innovation', label: 'Robo Innovation Challenge' },
];
const INNOVATION_CATEGORIES = [
  'Healthcare', 'Education', 'Agriculture', 'Sustainability',
  'Assistive Tech', 'Smart Home', 'Transportation', 'Other',
];

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

  const [form, setForm] = useState({
    full_name: '', date_of_birth: '', age: '', email: '', phone: '',
    country: 'India', pincode: '', state: '', city: '', school_or_college: '',
    zone: '', competition: '', project_category: '', project_theme: '',
    team_id: '', competition_id: '', drive_link: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const setField = (k) => (e) => {
    const v = e.target.value;
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'date_of_birth') next.age = ageFromDob(v);
      return next;
    });
  };

  const isInnovation = form.competition === 'robo_innovation';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.zone)        { setError('Please select your zone'); return; }
    if (!form.competition) { setError('Please select a competition'); return; }
    if (!form.drive_link.startsWith('http')) { setError('Please paste a valid Google Drive link'); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        age: form.age ? Number(form.age) : undefined,
        project_category: isInnovation ? (form.project_category || undefined) : undefined,
        project_theme:    isInnovation ? (form.project_theme    || undefined) : undefined,
      };
      const res = await fetch(`${API_BASE}/api/techfest/submissions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Submission failed');
      setDone(true);
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
    } catch (err) {
      setError(err.message);
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
          <div className="text-center py-16" data-testid="techfest-submit-success">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <h1 className="trp-h1 text-3xl text-[#0A1F44]">Project submitted!</h1>
            <p className="text-slate-600 mt-3 max-w-md mx-auto font-light">
              Thanks for uploading your project. The OLL team &amp; Techfest jury will review it and share the next update on your email + WhatsApp.
            </p>
            <Link to="/techfest" className="trp-btn primary mt-6 inline-flex">
              Back to Techfest <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <div className="trp-eyebrow text-[#DC2626] flex items-center gap-2"><Upload className="w-3 h-3" /> Techfest 2026 · Submission Portal</div>
              <h1 className="trp-h1 text-3xl sm:text-4xl text-[#0A1F44] mt-1">Submit your project</h1>
              <p className="text-slate-600 mt-2 font-light">
                Upload your final project details to be considered for the Grand Finale at IIT Bombay. Once submitted, our team will validate it and confirm your competition slot.
              </p>
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
                    <label className="trp-label">Zone*</label>
                    <select required className="trp-input" value={form.zone} onChange={setField('zone')} data-testid="sub-zone">
                      <option value="">Select your zone</option>
                      {ZONES.map((z) => <option key={z.slug} value={z.slug}>{z.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="trp-label">Competition*</label>
                    <select required className="trp-input" value={form.competition} onChange={setField('competition')} data-testid="sub-competition">
                      <option value="">Select competition</option>
                      {COMPETITIONS.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
                    </select>
                  </div>
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
                    <label className="trp-label">Team ID</label>
                    <input className="trp-input" value={form.team_id} onChange={setField('team_id')} placeholder="From techfest.org" data-testid="sub-team-id" />
                  </div>
                  <div>
                    <label className="trp-label">Competition ID</label>
                    <input className="trp-input" value={form.competition_id} onChange={setField('competition_id')} placeholder="From techfest.org" data-testid="sub-competition-id" />
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
                    <p className="mt-1 text-[11px] text-slate-500 font-light">Make sure the folder / file is set to <strong>Anyone with the link · Viewer</strong> so the jury can access it.</p>
                  </div>
                </div>
              </section>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="trp-btn primary disabled:opacity-70"
                  data-testid="techfest-submit-btn"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : <><Upload className="w-4 h-4" /> Submit Project</>}
                </button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
  );
}
