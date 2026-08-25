import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight, ArrowLeft, User, GraduationCap, Building2, CheckCircle2, Loader2,
  FileText, FileDown, MessageCircle,
} from 'lucide-react';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_LOGO = '/techfest/techfest-iitb-logo.webp';
const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const upsertMeta = (key, value, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
};

export default function TechfestRegisterPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const flow = searchParams.get('as'); // null | 'educator' | 'school'
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => { window.scrollTo(0, 0); }, [flow, done]);

  useEffect(() => {
    document.title = 'Register · OLL Robotics Championship · Techfest IIT Bombay 2026';
    upsertMeta('description', 'Register for the OLL Robotics Championship at Techfest IIT Bombay 2026. Individual, Educator/Mentor and School flows available.');
    upsertMeta('robots', 'noindex, nofollow');
  }, []);

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pickFlow = (f) => {
    setError(''); setDone(false); setForm({});
    setSearchParams({ as: f });
  };
  const resetFlow = () => {
    setError(''); setDone(false); setForm({});
    setSearchParams({});
  };

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      const payload = { type: flow, ...form };
      const res = await fetch(`${API_BASE}/api/techfest/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || 'Something went wrong. Please try again.');
      setDone(true);
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at 15% 8%, rgba(220,38,38,0.30), transparent 40%), radial-gradient(circle at 85% 30%, rgba(96,165,250,0.22), transparent 50%), linear-gradient(180deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%)',
      fontFamily: "'Proxima Nova','Montserrat',system-ui,sans-serif",
    }} data-testid="techfest-register-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
        @font-face { font-family: 'Zing Rust'; src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype'); font-weight: 400; font-style: normal; font-display: swap; }
        body:has([data-testid="techfest-register-page"]) { margin: 0; background: #0A1F44; }
        .trp-h1 { font-family: 'Zing Rust','Bebas Neue','Anton',sans-serif; font-weight: 400; letter-spacing: 0.005em; line-height: 0.92; text-transform: uppercase; }
        .trp-eyebrow { font-weight: 700; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .trp-input { width: 100%; padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e2e8f0; background: #ffffff; font-size: 0.95rem; color: #0A1F44; transition: border-color .15s ease, box-shadow .15s ease; }
        .trp-input:focus { outline: none; border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
        .trp-label { font-weight: 700; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; display: block; }
        .trp-btn { display: inline-flex; align-items: center; gap: 6px; padding: 12px 22px; border-radius: 999px; font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase; transition: transform .2s ease, box-shadow .2s ease, background .2s ease; cursor: pointer; text-decoration: none; border: none; }
        .trp-btn.primary { background: #DC2626; color: #fff; box-shadow: 0 12px 22px rgba(220,38,38,0.35); }
        .trp-btn.primary:hover { background: #B91C1C; transform: translateY(-1px); }
        .trp-btn.ghost { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.28); }
        .trp-nav-inner { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.94); backdrop-filter: saturate(180%) blur(14px); -webkit-backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 20px 44px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12); border-radius: 999px; display: flex; align-items: center; justify-content: space-between; padding: 8px 14px 8px 18px; }
        .trp-nav-brands { display: flex; align-items: center; gap: 14px; }
        .trp-nav-brands .divider { width: 1px; height: 36px; background: rgba(10,31,68,0.15); }
        .trp-nav-brands img { display: block; height: 42px; width: auto; }
        .trp-nav-brands img.mark { height: 46px; }
        @media (max-width: 640px) {
          .trp-nav-inner { padding: 6px 10px 6px 12px; }
          .trp-nav-brands { gap: 8px; }
          .trp-nav-brands img { height: 28px; }
          .trp-nav-brands img.mark { height: 32px; }
          .trp-nav-brands .divider { height: 26px; }
        }
      `}</style>

      {/* Sticky OLL × Techfest navbar */}
      <nav className="sticky top-3 z-50 px-3 pt-3" aria-label="Techfest register nav" data-testid="techfest-register-nav">
        <div className="trp-nav-inner">
          <Link to="/techfest" className="trp-nav-brands" data-testid="techfest-register-nav-home">
            <img src={OLL_LOGO} alt="OLL" />
            <span className="divider" aria-hidden="true" />
            <img className="mark" src={TECHFEST_LOGO} alt="Techfest IIT Bombay" />
          </Link>
          <Link to="/techfest" className="trp-btn ghost" style={{ color: '#0A1F44', borderColor: 'rgba(10,31,68,0.30)' }} data-testid="techfest-register-nav-back">
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Link>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="text-center mb-8">
          <div className="trp-eyebrow text-[#FCA5A5]">OLL × Techfest IIT Bombay 2026</div>
          <h1 className="trp-h1 text-5xl sm:text-6xl text-white mt-3">Register for the Championship.</h1>
          <p className="mt-4 text-white/75 text-base sm:text-lg max-w-xl mx-auto font-light">
            Grand Finale live at IIT Bombay <strong style={{ fontWeight: 700, color: '#fff' }}>16–18 December 2026</strong>. Pick the option that fits you.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="px-6 sm:px-10 py-8 sm:py-10">
            {done ? (
              <div className="text-center py-4" data-testid="techfest-register-success">
                <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-9 h-9 text-emerald-600" />
                </div>
                <div className="trp-h1 text-3xl mt-4 text-[#0A1F44]">You&apos;re in.</div>
                <p className="text-slate-600 mt-2 max-w-md mx-auto font-light">
                  Thanks for registering. The OLL team will reach out on your phone and email within 24 hours with next steps for {flow === 'school' ? 'your school' : 'your team'}.
                </p>

                {/* Downloads + WhatsApp — shown for school & educator flows */}
                <div className="mt-8 grid gap-3 max-w-lg mx-auto text-left" data-testid="techfest-register-resources">
                  <a
                    href="/techfest/parent-circular.docx"
                    download
                    className="group flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                    data-testid="techfest-download-parent-circular"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0A1F44] leading-tight">Parent Circular</div>
                      <div className="text-xs text-slate-600 font-light mt-0.5">Share with your students&apos; parents · .docx</div>
                    </div>
                    <FileDown className="w-4 h-4 text-slate-400 group-hover:text-[#DC2626]" />
                  </a>
                  <a
                    href="/techfest/problem-statement.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 p-4 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                    data-testid="techfest-download-problem-statement"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0A1F44,#1E3A5F)' }}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0A1F44] leading-tight">Detailed Problem Statement</div>
                      <div className="text-xs text-slate-600 font-light mt-0.5">IIT Bombay OLL Championship 2026 · .pdf</div>
                    </div>
                    <FileDown className="w-4 h-4 text-slate-400 group-hover:text-[#DC2626]" />
                  </a>
                  <a
                    href="https://chat.whatsapp.com/L3QZmVcVxbxEugCCDTQxzr"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-center gap-3 p-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50/40 hover:border-emerald-500 hover:bg-emerald-50 transition-colors"
                    data-testid="techfest-join-whatsapp"
                  >
                    <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#25D366,#128C7E)' }}>
                      <MessageCircle className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-[#0A1F44] leading-tight">Join the WhatsApp Community</div>
                      <div className="text-xs text-slate-600 font-light mt-0.5">Live updates, mentor Q&amp;A, and cohort chat</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-0.5 transition" />
                  </a>
                </div>

                <div className="mt-8 flex flex-wrap gap-3 justify-center">
                  <button onClick={() => navigate('/techfest')} className="trp-btn primary" data-testid="techfest-register-done-btn">
                    Back to Championship <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={resetFlow} className="trp-btn ghost" style={{ color: '#0A1F44', borderColor: 'rgba(10,31,68,0.30)' }}>
                    Register another
                  </button>
                </div>
              </div>
            ) : !flow ? (
              <div>
                <p className="text-slate-600 text-sm sm:text-base mb-6 font-light">
                  Pick how you&apos;d like to register. Every path leads to the same Grand Finale at IIT Bombay.
                </p>
                <div className="grid gap-3">
                  <a
                    href="https://techfest.org/competitions/oll"
                    target="_blank"
                    rel="noreferrer"
                    className="group flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                    data-testid="techfest-register-option-individual"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0A1F44,#1E3A5F)' }}>
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="trp-h1 text-xl text-[#0A1F44]">Register as an Individual</div>
                      <div className="text-sm text-slate-600 mt-1 font-light">Redirects to techfest.org where you can enter your team and pick your track directly.</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                  </a>

                  <button
                    onClick={() => pickFlow('educator')}
                    className="group text-left flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                    data-testid="techfest-register-option-educator"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                      <GraduationCap className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="trp-h1 text-xl text-[#0A1F44]">Register as an Educator / Mentor</div>
                      <div className="text-sm text-slate-600 mt-1 font-light">Mentoring one or more student teams. We&apos;ll get in touch to help you onboard.</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={() => pickFlow('school')}
                    className="group text-left flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                    data-testid="techfest-register-option-school"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0EA5E9,#0369a1)' }}>
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="trp-h1 text-xl text-[#0A1F44]">Register as a School</div>
                      <div className="text-sm text-slate-600 mt-1 font-light">Onboard your entire institution with a dedicated coordinator + bulk kit pricing.</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} data-testid={`techfest-register-form-${flow}`}>
                <button
                  type="button"
                  onClick={resetFlow}
                  className="text-sm text-slate-500 hover:text-[#DC2626] mb-5 inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to options
                </button>

                <div className="trp-eyebrow text-[#DC2626] mb-1">{flow === 'educator' ? 'Educator / Mentor Registration' : 'School Registration'}</div>
                <div className="trp-h1 text-2xl sm:text-3xl text-[#0A1F44] mb-6">Tell us about {flow === 'school' ? 'your school' : 'yourself'}.</div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="trp-label">Full Name*</label>
                    <input required minLength={2} className="trp-input" value={form.name || ''} onChange={setField('name')} data-testid="techfest-reg-field-name" />
                  </div>
                  <div>
                    <label className="trp-label">Email*</label>
                    <input required type="email" className="trp-input" value={form.email || ''} onChange={setField('email')} data-testid="techfest-reg-field-email" />
                  </div>
                  <div>
                    <label className="trp-label">Phone (WhatsApp)*</label>
                    <input required type="tel" className="trp-input" value={form.phone || ''} onChange={setField('phone')} data-testid="techfest-reg-field-phone" />
                  </div>
                  <div>
                    <label className="trp-label">City*</label>
                    <input required className="trp-input" value={form.city || ''} onChange={setField('city')} data-testid="techfest-reg-field-city" />
                  </div>

                  {flow === 'educator' ? (
                    <>
                      <div>
                        <label className="trp-label">School / Institute you mentor*</label>
                        <input required className="trp-input" value={form.school_or_institute || ''} onChange={setField('school_or_institute')} data-testid="techfest-reg-field-school-or-institute" />
                      </div>
                      <div>
                        <label className="trp-label">Subject you teach*</label>
                        <input required className="trp-input" placeholder="e.g. Physics, Computer Science, Math" value={form.grade_taught || ''} onChange={setField('grade_taught')} data-testid="techfest-reg-field-subject" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="trp-label">Number of students likely to participate*</label>
                        <select required className="trp-input" value={form.student_count || ''} onChange={setField('student_count')} data-testid="techfest-reg-field-student-count">
                          <option value="">Select</option>
                          <option>1–5</option>
                          <option>6–15</option>
                          <option>16–30</option>
                          <option>30+</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="trp-label">Full School Address*</label>
                        <textarea required rows={2} className="trp-input" placeholder="Street, area, city, state, PIN" value={form.school_address || ''} onChange={setField('school_address')} data-testid="techfest-reg-field-school-address" />
                      </div>
                      <div>
                        <label className="trp-label">School Official Email*</label>
                        <input required type="email" className="trp-input" placeholder="office@school.edu" value={form.school_email || ''} onChange={setField('school_email')} data-testid="techfest-reg-field-school-email" />
                      </div>
                      <div>
                        <label className="trp-label">School Phone No.*</label>
                        <input required type="tel" className="trp-input" placeholder="e.g. 022-2222-3333" value={form.school_phone || ''} onChange={setField('school_phone')} data-testid="techfest-reg-field-school-phone" />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="trp-label">School Name*</label>
                        <input required className="trp-input" value={form.school_name || ''} onChange={setField('school_name')} data-testid="techfest-reg-field-school-name" />
                      </div>
                      <div>
                        <label className="trp-label">Your Role / Designation*</label>
                        <input required className="trp-input" placeholder="e.g. Principal, Coordinator" value={form.role_designation || ''} onChange={setField('role_designation')} data-testid="techfest-reg-field-role" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="trp-label">Number of students likely to participate*</label>
                        <select required className="trp-input" value={form.student_count || ''} onChange={setField('student_count')} data-testid="techfest-reg-field-student-count">
                          <option value="">Select</option>
                          <option>1–20</option>
                          <option>21–50</option>
                          <option>51–100</option>
                          <option>100+</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="trp-label">Full School Address*</label>
                        <textarea required rows={2} className="trp-input" placeholder="Street, area, city, state, PIN" value={form.school_address || ''} onChange={setField('school_address')} data-testid="techfest-reg-field-school-address" />
                      </div>
                      <div>
                        <label className="trp-label">School Official Email*</label>
                        <input required type="email" className="trp-input" placeholder="office@school.edu" value={form.school_email || ''} onChange={setField('school_email')} data-testid="techfest-reg-field-school-email" />
                      </div>
                      <div>
                        <label className="trp-label">School Phone No.*</label>
                        <input required type="tel" className="trp-input" placeholder="e.g. 022-2222-3333" value={form.school_phone || ''} onChange={setField('school_phone')} data-testid="techfest-reg-field-school-phone" />
                      </div>
                    </>
                  )}

                  {/* Shared block — does your school already teach robotics? */}
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <label className="trp-label">Do you already teach robotics in your school?*</label>
                    <div className="flex gap-2">
                      {['Yes', 'No'].map((opt) => {
                        const active = form.teaches_robotics === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, teaches_robotics: opt, robotics_format: opt === 'Yes' ? (f.robotics_format || '') : '', robotics_external_company: opt === 'Yes' ? (f.robotics_external_company || '') : '' }))}
                            className="flex-1 py-2.5 rounded-xl border-2 text-sm font-bold transition-colors"
                            style={{
                              borderColor: active ? '#DC2626' : '#e2e8f0',
                              background: active ? 'rgba(220,38,38,0.08)' : '#fff',
                              color: active ? '#DC2626' : '#0A1F44',
                            }}
                            data-testid={`techfest-reg-field-teaches-robotics-${opt.toLowerCase()}`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    {/* Hidden input to satisfy required — we don't actually submit this since we push everything from state */}
                    <input type="hidden" required value={form.teaches_robotics || ''} readOnly />
                  </div>

                  {form.teaches_robotics === 'Yes' && (
                    <div className="sm:col-span-2">
                      <label className="trp-label">In what form?*</label>
                      <select required className="trp-input" value={form.robotics_format || ''} onChange={setField('robotics_format')} data-testid="techfest-reg-field-robotics-format">
                        <option value="">Select</option>
                        <option>In timetable as a subject</option>
                        <option>Afterschool classes</option>
                        <option>Through an external company</option>
                      </select>
                    </div>
                  )}

                  {form.teaches_robotics === 'Yes' && form.robotics_format === 'Through an external company' && (
                    <div className="sm:col-span-2">
                      <label className="trp-label">Which company?*</label>
                      <input required className="trp-input" placeholder="e.g. WhiteHat Jr, Vidyalai" value={form.robotics_external_company || ''} onChange={setField('robotics_external_company')} data-testid="techfest-reg-field-robotics-external-company" />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2" data-testid="techfest-register-error">{error}</div>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="trp-btn primary disabled:opacity-70"
                    data-testid="techfest-register-submit"
                  >
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Registration <ArrowRight className="w-4 h-4" /></>}
                  </button>
                  <span className="text-xs text-slate-500 font-light">By submitting, you agree to be contacted by the OLL team about the Championship.</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
