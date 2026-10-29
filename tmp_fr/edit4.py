def edit(p, pairs):
    s = open(p).read()
    for a, b in pairs:
        assert s.count(a) == 1, (p, a[:70], s.count(a))
        s = s.replace(a, b)
    open(p, 'w').write(s)

D = '/app/frontend/src/pages/franchise/'
edit(D + 'franchiseContent.js', [
("  { t: '3D Printing', i: Printer, img: `${F}/skill-4.webp` },", "  { t: 'Drones', i: Plane },"),
("  Bot, Code2, BrainCircuit, Box, Printer,", "  Bot, Code2, BrainCircuit, Box, Plane,"),
("export const IMG = {", "export const HERO_VIDEO = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/c23889bc0653ebb8_gemini_generated_video_88fbeeac.mp4';\n\nexport const IMG = {"),
])
edit(D + 'FranchiseSections.jsx', [
("  WHY_START, DIFFERENT, YOU_HAVE, WE_PROVIDE, INCLUDED, SERVICES, SKILL_CARDS, IMG,", "  WHY_START, DIFFERENT, YOU_HAVE, WE_PROVIDE, INCLUDED, SERVICES, SKILL_CARDS, IMG, HERO_VIDEO,"),
("import { Check, ArrowRight, Building2, Users2, Handshake } from 'lucide-react';", "import { Check, ArrowRight, Building2, Users2, Handshake } from 'lucide-react';\nimport { BrochureButton } from './BrochureModal';"),
('''        <div className="fr-hero-photo"><img src={IMG.buildKid} alt="Student building a robot at an OLL center" /></div>''',
 '''        <div className="fr-hero-photo">
          <video src={HERO_VIDEO} poster={IMG.buildKid} autoPlay muted loop playsInline preload="metadata" aria-label="Students learning robotics at an OLL center" data-testid="franchise-hero-video" />
        </div>'''),
('''          <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-hero-apply-btn">Apply for an OLL Franchise <ArrowRight size={18} /></button>
          <div className="fr-invest"''', '''          <button type="button" className="fr-cta" onClick={onApply} data-testid="franchise-hero-apply-btn">Apply for an OLL Franchise <ArrowRight size={18} /></button>
          <BrochureButton testid="franchise-hero-brochure-btn" />
          <div className="fr-invest"'''),
])
edit(D + 'FranchiseEnquiryForm.jsx', [
("import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';", "import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';\nimport { CityCombobox } from './CityCombobox';"),
("const EMPTY = { name: '', phone: '', email: '', city_state: '', occupation: '', has_space: '', reason: '' };",
 "const EMPTY = { name: '', phone: '', email: '', city_state: '', occupation: '', occupation_other: '', has_space: '', reason: '' };\nconst OCCUPATIONS = ['Educator', 'Institute Owner', 'Other'];"),
('''    if (!f.has_space) { toast.error('Tell us whether you already have a space'); return; }
    setBusy(true);
    try {
      await axios.post(`${API}/franchise/enquiry`, { ...f, phone: f.phone.replace(/\\D/g, '').slice(-10) });''',
 '''    if (!f.city_state) { toast.error('Please select your city'); return; }
    const occupation = f.occupation === 'Other' ? f.occupation_other.trim() : f.occupation;
    if (!occupation || occupation.length < 2) { toast.error('Please tell us your current occupation'); return; }
    if (!f.has_space) { toast.error('Tell us whether you already have a space'); return; }
    setBusy(true);
    try {
      const { occupation_other: _o, ...rest } = f;
      await axios.post(`${API}/franchise/enquiry`, { ...rest, occupation, phone: f.phone.replace(/\\D/g, '').slice(-10) });'''),
('''        <Field label="City / State"><input required minLength={2} value={f.city_state} onChange={set('city_state')} placeholder="e.g. Pune, Maharashtra" data-testid="franchise-input-city" /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Current Occupation or Business"><input required minLength={2} value={f.occupation} onChange={set('occupation')} placeholder="e.g. Tuition centre owner, teacher, entrepreneur" data-testid="franchise-input-occupation" /></Field>
        </div>''', '''        <div className="fr-field"><span>City / State <b style={{ color: '#DC2626' }}>*</b></span>
          <CityCombobox value={f.city_state} onChange={(v) => setF((p) => ({ ...p, city_state: v }))} testid="franchise-input-city" />
        </div>
        <div style={{ gridColumn: '1 / -1' }} className="fr-field">
          <span>Current Occupation or Business <b style={{ color: '#DC2626' }}>*</b></span>
          <div className="fr-chip-row">
            {OCCUPATIONS.map((o) => (
              <button type="button" key={o} onClick={() => setF((p) => ({ ...p, occupation: o }))}
                className={`fr-chip ${f.occupation === o ? 'on' : ''}`} data-testid={`franchise-occupation-${o.toLowerCase().replace(/\\s+/g, '-')}`}>{o}</button>
            ))}
          </div>
          {f.occupation === 'Other' && (
            <input value={f.occupation_other} onChange={set('occupation_other')} placeholder="Tell us what you do" style={{ marginTop: 4 }} data-testid="franchise-input-occupation-other" />
          )}
        </div>'''),
])
edit(D + 'FranchiseLandingPage.jsx', [
("import { FranchiseEnquiryForm } from './FranchiseEnquiryForm';", "import { FranchiseEnquiryForm } from './FranchiseEnquiryForm';\nimport { BrochureButton } from './BrochureModal';\nimport { FrCenters } from './FrCenters';"),
('''        <span className="fr-nav-invest">Investment <b>₹2.5 Lakhs</b></span>''', '''        <span className="fr-nav-invest">Investment <b>₹2.5 Lakhs</b></span>
        <BrochureButton className="fr-ghost dark sm" label="Brochure" testid="franchise-nav-brochure-btn" />'''),
('      <InsideClassroom />\n', '      <InsideClassroom />\n      <FrCenters />\n'),
('''        <div className="fr-photo-frame fr-final-kid">''', '''        <div style={{ marginTop: '1.25rem' }}><BrochureButton testid="franchise-final-brochure-btn" label="Download the Franchise Brochure" /></div>
        <div className="fr-photo-frame fr-final-kid">'''),
])
edit(D + 'franchiseStyles.js', [
(".fr-hero-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center 30%; }",
 ".fr-hero-photo img, .fr-hero-photo video { width: 100%; height: 100%; object-fit: cover; object-position: center 30%; display: block; }"),
(".fr-cta.sm { padding: 0.65rem 1.15rem; font-size: 0.78rem; }", """.fr-cta.sm { padding: 0.65rem 1.15rem; font-size: 0.78rem; }
.fr-ghost { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.4rem; border-radius: 999px; cursor: pointer; background: rgba(7,19,69,0.6); color: #fff; border: 1.5px solid rgba(59,130,246,0.85); font-weight: 800; font-size: 0.85rem; letter-spacing: 0.03em; text-transform: uppercase; box-shadow: 0 0 20px rgba(59,130,246,0.35); transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; font-family: inherit; }
.fr-ghost:hover { transform: translateY(-2px); background: rgba(37,99,235,0.35); box-shadow: 0 0 30px rgba(59,130,246,0.6); }
.fr-ghost.dark { background: #fff; color: #0A1A5C; border-color: rgba(10,26,92,0.25); box-shadow: none; }
.fr-ghost.dark:hover { background: #EEF4FF; }
.fr-ghost.sm { padding: 0.6rem 1rem; font-size: 0.75rem; }
.fr-select { display: flex; align-items: center; gap: 8px; width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; font-weight: 500; color: #0A1A5C; background: #F8FAFC; text-align: left; cursor: pointer; font-family: inherit; text-transform: none; letter-spacing: 0; transition: border-color 0.2s, box-shadow 0.2s; }
.fr-select.ph span { color: #94A3B8; }
.fr-select:focus, .fr-select[data-state="open"] { outline: none; border-color: #E11D2E; box-shadow: 0 0 0 3px rgba(225,29,46,0.12); }
.fr-modal-form { display: grid; gap: 0.85rem; font-family: 'Montserrat', sans-serif; }
.fr-modal-form .fr-field input { width: 100%; border: 1px solid #CBD5E1; border-radius: 12px; padding: 0.75rem 0.9rem; font-size: 0.95rem; color: #0A1A5C; background: #F8FAFC; outline: none; font-family: inherit; }
.fr-modal-form .fr-field input:focus { border-color: #E11D2E; box-shadow: 0 0 0 3px rgba(225,29,46,0.12); }

/* Centers */
.fr-centers { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem; }
.fr-center { border-radius: 18px; padding: 1.25rem; background: linear-gradient(180deg, rgba(37,99,235,0.2), rgba(7,19,69,0.85)); border: 1px solid rgba(59,130,246,0.75); box-shadow: 0 0 22px rgba(59,130,246,0.22); display: flex; flex-direction: column; transition: transform 0.3s ease, box-shadow 0.3s ease; }
.fr-center:hover { transform: translateY(-4px); box-shadow: 0 0 36px rgba(59,130,246,0.45); }
.fr-center.red { background: linear-gradient(180deg, rgba(225,29,46,0.28), rgba(60,8,25,0.65)); border-color: rgba(248,113,113,0.75); box-shadow: 0 0 22px rgba(225,29,46,0.25); }
.fr-center-top { display: flex; gap: 0.75rem; align-items: flex-start; }
.fr-center-pin { flex-shrink: 0; width: 40px; height: 40px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: radial-gradient(circle at 30% 30%, #3B82F6, #1E3A8A); box-shadow: 0 0 16px rgba(59,130,246,0.6); }
.fr-center.red .fr-center-pin { background: radial-gradient(circle at 30% 30%, #F43F5E, #9F1239); box-shadow: 0 0 16px rgba(225,29,46,0.6); }
.fr-center h3 { font-family: 'Zing Rust','Anton',sans-serif; font-weight: 400; text-transform: uppercase; font-size: 1.45rem; line-height: 1.05; }
.fr-center-top p { font-size: 0.82rem; color: #93C5FD; font-weight: 700; margin-top: 2px; }
.fr-center.red .fr-center-top p { color: #FCA5A5; }
.fr-center-addr { font-size: 0.82rem; color: rgba(219,234,254,0.78); margin-top: 0.75rem; line-height: 1.5; flex: 1; }
.fr-center-actions { display: flex; gap: 0.5rem; margin-top: 0.9rem; }
.fr-center-actions a { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; font-size: 0.72rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; color: #fff; text-decoration: none; border: 1px solid rgba(255,255,255,0.3); background: rgba(255,255,255,0.06); }
.fr-center-actions a:hover { background: rgba(255,255,255,0.16); }

/* Mobile polish */
@media (max-width: 640px) {
  .fr-sec { padding: 3.5rem 1rem; }
  .fr-head { margin-bottom: 1.75rem; }
  .fr-h2 { font-size: 2.2rem; }
  .fr-sub { font-size: 0.92rem; }
  .fr-hero { padding: 5.75rem 1rem 2.5rem; }
  .fr-hero-h1 { font-size: 2.9rem; }
  .fr-hero-tag { font-size: 0.75rem; letter-spacing: 0.3em; }
  .fr-need-row span { font-size: 1rem; }
  .fr-hero-actions { gap: 0.75rem; }
  .fr-hero-actions .fr-cta, .fr-hero-actions .fr-ghost { width: 100%; justify-content: center; }
  .fr-invest { border-left: 0; padding-left: 0; flex-direction: row; align-items: baseline; gap: 0.6rem; }
  .fr-hero-chips { flex-direction: row; flex-wrap: wrap; position: static; margin-top: 0.75rem; }
  .fr-hero-chips span { font-size: 0.66rem; padding: 6px 9px; }
  .fr-hero-copy { margin-top: 1.5rem; font-size: 0.88rem; }
  .fr-nav { padding: 7px 8px 7px 14px; }
  .fr-nav img { height: 28px !important; }
  .fr-nav .fr-ghost { display: none; }
  .fr-grid, .fr-grid.five { grid-template-columns: 1fr; gap: 0.9rem; }
  .fr-card { padding: 1.3rem 1.1rem 1.1rem; }
  .fr-card.fr-row { padding: 1.3rem 1.1rem; }
  .fr-tabpanel { padding: 1.2rem; gap: 0.9rem; }
  .fr-panel-t { font-size: 1.5rem; }
  .fr-items { grid-template-columns: 1fr; }
  .fr-icon.big { width: 56px; height: 56px; }
  .fr-strip { border-radius: 16px; font-size: 0.86rem; padding: 0.85rem 1rem; }
  .fr-easy-have, .fr-easy-give { padding: 3rem 0.8rem 0.9rem; }
  .fr-easy-cap b { font-size: 1.4rem; }
  .fr-give-list li { font-size: 0.85rem; }
  .fr-eco-circle { max-width: 240px; }
  .fr-centers { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 0.8rem; padding-bottom: 0.75rem; margin: 0 -1rem; padding-left: 1rem; padding-right: 1rem; scrollbar-width: none; }
  .fr-centers::-webkit-scrollbar { display: none; }
  .fr-center { flex: 0 0 82%; scroll-snap-align: start; }
  .fr-tl-card { padding: 1rem 1.1rem; }
  .fr-tl-card h3 { font-size: 1.35rem; }
  .fr-form-card { padding: 1.2rem; border-radius: 18px; }
  .fr-field input, .fr-field textarea, .fr-select { font-size: 16px; }
  .fr-chip { padding: 0.55rem 0.85rem; }
  .fr-final { gap: 2rem; }
  .fr-themed section { padding-left: 1rem !important; padding-right: 1rem !important; }
}"""),
])
print('ok')
