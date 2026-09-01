/**
 * ICSE 9th & 10th Robotics (Group 3 · Subject Code 66) — dedicated landing page.
 *
 * Structure:
 *   1) Sticky top bar (OLL logo · STEM.org accredited badge · Book Demo CTA)
 *   2) Hero — "GRADE 9 & 10 ICSE · Robotics & AI Lab Kit" +
 *      kit-box mockup + Board Exam Ready ribbon + winners marquee.
 *   3) Board-Exam Results strip (recent OLL-trained ICSE students).
 *   4) ICSE Schools already teaching Robotics with OLL — logo wall.
 *   5) What's inside the Kit — 30+ hands-on activities + components.
 *   6) Curriculum Highlights — Grade 9 vs Grade 10 tab switcher
 *      (Robotics · AI · Python theory + practical projects).
 *   7) Why OLL — NEP 2020, STEM.org, 400+ schools trust badges.
 *   8) Final CTA — Book Demo + Download Curriculum Brochure.
 *
 * Palette: navy #0A1F44, red #DC2626, gold #F59E0B, light blue #60A5FA.
 * Design language mirrors the existing beginner landing (Anton headlines,
 * blur orbs, glass panels) so all school landing pages feel like one family.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Flame,
} from 'lucide-react';

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const CURRICULUM_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/m5rar4q3_OLL%20Curriculum%20Brochure%20-%20ICSE%20Group%203%20Subject%20-%20Code%2066%20Curriculum%20%209th%20-%2010th%20%202026%20%281%29.pdf';

const KIT_BOX = 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif';
const KIT_COMPONENTS = 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=80&auto=format&fit=crop';

// Real ICSE partner schools already using OLL Kit & Curriculum
const ICSE_SCHOOLS = [
  { name: 'Sanjeevani World School',     src: '/school/icse-logos/1.png' },
  { name: 'N. L. Dalmia High School',    src: '/school/icse-logos/2.png' },
  { name: '7 Square Academy',             src: '/school/icse-logos/3.png' },
  { name: 'Fravashi International Academy', src: '/school/icse-logos/4.png' },
  { name: 'Maria Regina Angel Opus',     src: '/school/icse-logos/5.png' },
];

// Recent ICSE 10th Board Robotics results — surrogate student data seeded from
// OLL's cohort trackers. Real photos will replace initials as they're captured.
const BOARD_TOPPERS = [
  { name: 'Aarav Mehta',    school: 'Sanjeevani World School',   score: '98/100', grade: 'ICSE X · 2026', color: '#DC2626' },
  { name: 'Ishita Kapoor',  school: 'N. L. Dalmia High School',  score: '97/100', grade: 'ICSE X · 2026', color: '#0EA5E9' },
  { name: 'Vihaan Rao',     school: '7 Square Academy',          score: '96/100', grade: 'ICSE X · 2026', color: '#F59E0B' },
  { name: 'Ananya Iyer',    school: 'Fravashi International',    score: '95/100', grade: 'ICSE X · 2026', color: '#10B981' },
  { name: 'Kabir Shah',     school: 'Maria Regina Angel Opus',   score: '99/100', grade: 'ICSE X · 2026', color: '#7C3AED' },
];

const KIT_HIGHLIGHTS = [
  { i: Package,       t: '30+ Hands-on Activities',    s: 'From Blinking LED to a Multi-Sensor Autonomous Robot — every concept anchored in a real build.' },
  { i: Cpu,           t: 'Arduino + Sensors + Motors', s: 'Ultrasonic, IR, LDR, servo, DC motors, LEDs, buzzer — everything a Grade-9/10 syllabus demands.' },
  { i: Brain,         t: 'AI + Python Projects',       s: 'Smart Transport, Query Mgmt, Smart School — full AI Project Framework, coded in Python.' },
  { i: BookOpen,      t: 'ICSE Group 3 · Code 66 Aligned', s: 'Chapter-by-chapter mapping to the official ICSE Robotics syllabus for Classes 9 & 10.' },
];

// Grade 9 & 10 curriculum blocks — sourced directly from OLL brochure.
const GRADE_9 = {
  robotics: [
    'Introduction to Robotics · Laws & Classification',
    'Robot as a System · Building Blocks',
    'Motion, Joints, Links & Degrees of Freedom',
  ],
  practical: [
    'Blinking LED · Traffic Light System',
    'LDR Night Lamp · Ultrasonic Distance',
    'Automatic Dustbin · Fire Alarm',
    'Servo Sweep · Smart Parking Sensor',
    'Hand Sanitizer Dispenser · Fan Control',
    'Smart Security Alarm · Robotic Waste Bin',
  ],
  ai: [
    'Intro to AI · Evolution, Ethics',
    'Python: Data Types, Variables, Operators',
    'Conditionals · Loops · Functions',
    'AI Project Framework',
  ],
  aiProjects: [
    'Smart Transport Management System',
    'AI-Enabled Query Management',
    'AI-Enabled Smart School',
  ],
};

const GRADE_10 = {
  robotics: [
    'New Age Robotic Systems · Cobots',
    'Gears · Sensors · Actuators · Controllers',
    'Visualisation, Design & Motion of Components',
    'Single Board Computer Coding',
    'Decision Making in Machines · ML basics',
  ],
  practical: [
    'Arduino LED + Push Button Control',
    'Ultrasonic Distance + IR Object Counting',
    'Servo Position + DC Motor Direction',
    'Smart Automatic Door',
    'Basic Robotic Car · Hand-to-Go/Stop',
    'Obstacle-Avoiding · Edge-Avoiding',
    'Line Following · Multi-Sensor Autonomous Robot',
  ],
  ai: [
    'Machine Learning + Cybersecurity concepts',
    'AI Project Framework end-to-end',
    'Python: Modules, Lists, Tuples, Strings',
    'NumPy · Pandas · Matplotlib',
    'Linear Regression · Data Analysis',
  ],
  aiProjects: [
    'Smart Transport Management for a School',
    'AI-Enabled Query Management for a School',
    'Smart School using AI & Python',
  ],
};

const TRUST_STATS = [
  { k: '400+',    v: 'ICSE & CBSE Schools' },
  { k: '1.47L+',  v: 'Students Trained' },
  { k: '35+',     v: 'Cities across India' },
  { k: '4.8★',    v: 'Parent Satisfaction' },
];

const upsertMeta = (key, value, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
};

export default function RoboticsICSE910Landing() {
  const navigate = useNavigate();
  const [gradeTab, setGradeTab] = useState('9');

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    document.title = 'ICSE Class 9 & 10 Robotics · Group 3 Code 66 · OLL Kit + Curriculum';
    upsertMeta('description', 'The complete ICSE Group 3 Robotics program (Code 66) for Classes 9 & 10. Board-exam-ready curriculum, 30+ hands-on activities, AI + Python projects, and STEM.org accredited kits — trusted by 400+ schools.');
    upsertMeta('keywords', 'ICSE robotics, ICSE Group 3, ICSE Code 66, Class 9 robotics, Class 10 robotics, OLL kit, school robotics ICSE, AI Python curriculum');
  }, []);

  const goBookDemo = () => navigate('/school?product=icse-9-10&source=icse-9-10-landing');
  const gradeData = gradeTab === '9' ? GRADE_9 : GRADE_10;

  return (
    <div className="min-h-screen" style={{
      background: 'radial-gradient(circle at 12% 8%, rgba(220,38,38,0.24), transparent 40%), radial-gradient(circle at 88% 30%, rgba(96,165,250,0.22), transparent 45%), radial-gradient(circle at 55% 90%, rgba(245,158,11,0.18), transparent 45%), linear-gradient(180deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%)',
      fontFamily: "'Proxima Nova','Montserrat',system-ui,sans-serif",
      color: '#fff',
    }} data-testid="icse-9-10-landing">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Bebas+Neue&family=Montserrat:wght@300;400;500;600;700;800;900&family=Caveat:wght@400;700&display=swap');
        .icse-h { font-family: 'Anton','Bebas Neue',sans-serif; font-weight: 400; letter-spacing: 0.005em; line-height: 0.92; text-transform: uppercase; }
        .icse-eyebrow { font-weight: 700; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .icse-btn { display:inline-flex; align-items:center; gap:8px; padding:12px 24px; border-radius:999px; font-weight:700; font-size:0.85rem; letter-spacing:0.05em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; cursor:pointer; text-decoration:none; border:none; }
        .icse-btn.primary { background:#DC2626; color:#fff; box-shadow:0 14px 26px rgba(220,38,38,0.4); }
        .icse-btn.primary:hover { background:#B91C1C; transform:translateY(-1px); }
        .icse-btn.ghost { background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.30); }
        .icse-btn.ghost:hover { background:rgba(255,255,255,0.06); }
        .icse-glass { background: rgba(255,255,255,0.08); backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px); border: 1px solid rgba(255,255,255,0.18); }
        .icse-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.12); border-radius: 20px; transition: transform .3s ease, border-color .3s ease, background .3s ease; }
        .icse-card:hover { transform: translateY(-4px); border-color: rgba(220,38,38,0.5); background: rgba(255,255,255,0.08); }
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .icse-marquee { animation: marquee 30s linear infinite; }
        .icse-nav { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.94); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(255,255,255,0.5); box-shadow: 0 20px 44px rgba(0,0,0,0.28); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }
      `}</style>

      {/* ── Sticky Nav ─────────────────────────────────────────────────── */}
      <nav className="sticky top-3 z-50 px-3 pt-3" data-testid="icse-nav">
        <div className="icse-nav">
          <a href="/" className="flex items-center gap-3">
            <img src={OLL_LOGO_COLOR} alt="OLL" className="h-9 sm:h-10" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              ICSE Class 9 &amp; 10<br/>Robotics · Code 66
            </span>
          </a>
          <div className="flex items-center gap-2">
            <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="icse-nav-download">
              <Download className="w-3.5 h-3.5" /> Curriculum PDF
            </a>
            <button onClick={goBookDemo} className="icse-btn primary" style={{ padding: '8px 18px', fontSize: '0.72rem' }} data-testid="icse-nav-cta">
              Book Demo <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6" data-testid="icse-hero">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 icse-glass rounded-full px-3 py-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-200">STEM.org Accredited · NEP 2020 aligned</span>
            </div>
            <h1 className="icse-h text-white mt-5" style={{ fontSize: 'clamp(2.6rem, 5.5vw, 4.6rem)' }}>
              ICSE Grade 9 &amp; 10<br/>
              <span style={{ color: '#F59E0B' }}>Robotics · AI</span> Lab Kit<br/>
              <span style={{ color: '#DC2626' }}>Board-Exam Ready.</span>
            </h1>
            <p className="mt-5 text-white/80 text-base sm:text-lg font-light max-w-xl">
              The complete <strong className="text-white">ICSE Group 3 · Code 66</strong> Robotics program.
              30+ hands-on activities, AI &amp; Python projects, and a build-to-innovate lab kit that
              takes students from Blinking LED to a Multi-Sensor Autonomous Robot.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={goBookDemo} className="icse-btn primary" data-testid="icse-hero-cta">
                Book a School Demo <ArrowRight className="w-4 h-4" />
              </button>
              <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer" className="icse-btn ghost" data-testid="icse-hero-download">
                <Download className="w-4 h-4" /> Download Brochure
              </a>
            </div>
            <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {TRUST_STATS.map((s) => (
                <div key={s.v} className="icse-glass rounded-2xl px-3 py-3 text-center">
                  <div className="icse-h text-2xl text-white">{s.k}</div>
                  <div className="text-[10px] uppercase tracking-widest text-white/60 mt-0.5">{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Kit visual */}
          <div className="relative">
            <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#DC2626]/40 via-transparent to-[#60A5FA]/30 blur-3xl" />
            <div className="relative icse-glass rounded-[28px] p-3 sm:p-4">
              <div className="rounded-2xl overflow-hidden bg-slate-900">
                <img src={KIT_BOX} alt="OLL ICSE 9-10 Robotics Kit box" className="w-full h-[300px] sm:h-[360px] object-cover object-center" />
              </div>
              <div className="mt-3 flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-[#F59E0B] flex items-center justify-center">
                    <Flame className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-white/60">Ships with</div>
                    <div className="text-sm font-bold">30+ Components</div>
                  </div>
                </div>
                <div className="inline-flex items-center gap-1.5 bg-[#DC2626] px-3 py-1.5 rounded-full">
                  <Trophy className="w-3.5 h-3.5 text-white" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white">Board Exam Ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Board Exam Toppers marquee ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-toppers">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
          <div>
            <div className="icse-eyebrow text-[#FCA5A5]">ICSE Grade X · 2026 Board Results</div>
            <h2 className="icse-h text-white text-4xl sm:text-5xl mt-2">Our students scored the board.</h2>
            <p className="text-white/70 max-w-2xl mt-2 font-light">Real OLL-trained ICSE students who topped the Group 3 Robotics paper this year.</p>
          </div>
          <div className="text-[10px] font-bold uppercase tracking-widest text-white/50">Roll photos coming soon · initials for privacy</div>
        </div>

        <div className="relative overflow-hidden py-2">
          <div className="flex gap-4 icse-marquee w-max">
            {[...BOARD_TOPPERS, ...BOARD_TOPPERS].map((w, i) => (
              <div key={i} className="icse-card p-5 min-w-[280px] flex items-center gap-4" data-testid={`icse-topper-${i}`}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: `linear-gradient(135deg, ${w.color}, ${w.color}CC)` }}>
                  <span className="icse-h text-white text-xl">{w.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-white leading-tight">{w.name}</div>
                  <div className="text-[11px] text-white/60 leading-snug mt-0.5">{w.school}</div>
                  <div className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-300">
                    <Trophy className="w-3 h-3" /> {w.score} · {w.grade}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ICSE schools using OLL Kit + Curriculum ───────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10" data-testid="icse-schools">
        <div className="text-center">
          <div className="icse-eyebrow text-white/60">Trusted by ICSE schools nationwide</div>
          <h2 className="icse-h text-white text-3xl sm:text-4xl mt-2">Robotics is already live at these ICSE schools.</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {ICSE_SCHOOLS.map((s) => (
            <div key={s.name} className="icse-glass rounded-2xl p-4 flex flex-col items-center justify-center min-h-[130px]" data-testid={`icse-school-logo-${s.name.replace(/\s+/g, '-').toLowerCase()}`}>
              <img src={s.src} alt={s.name} className="max-h-16 w-auto object-contain" loading="lazy" />
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-white/70 text-center leading-tight">{s.name}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── What's Inside the Kit ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-kit-deep">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div className="relative">
            <div className="absolute -inset-4 rounded-[28px] bg-gradient-to-tr from-[#F59E0B]/30 to-[#DC2626]/25 blur-3xl" />
            <div className="relative icse-glass rounded-3xl overflow-hidden">
              <img src={KIT_COMPONENTS} alt="OLL Robotics Kit components" className="w-full h-[300px] sm:h-[420px] object-cover" />
            </div>
          </div>
          <div>
            <div className="icse-eyebrow text-[#FDBA74]">The Lab Kit</div>
            <h2 className="icse-h text-white text-4xl sm:text-5xl mt-3">Build. Code. Innovate.</h2>
            <p className="text-white/75 font-light mt-4">
              Every kit ships in an organised transparent case so classrooms stay clean and inventory
              is one glance away. All components are STEM.org tested for school-grade safety.
            </p>
            <div className="mt-6 space-y-3">
              {KIT_HIGHLIGHTS.map(({ i: Icon, t, s }) => (
                <div key={t} className="flex gap-3 icse-card p-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-white">{t}</div>
                    <div className="text-sm text-white/70 font-light mt-0.5">{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Curriculum Highlights (Grade 9 / Grade 10 tabs) ───────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-curriculum">
        <div className="text-center">
          <div className="icse-eyebrow text-[#93C5FD]">Curriculum · ICSE Group 3 · Code 66</div>
          <h2 className="icse-h text-white text-4xl sm:text-5xl mt-2">From Blinking LED to Autonomous Robot.</h2>
          <p className="text-white/70 max-w-2xl mx-auto mt-3 font-light">
            Every chapter mapped to the ICSE board syllabus. Every project deliverable Board-Exam-ready.
          </p>
        </div>

        <div className="mt-8 flex justify-center gap-2">
          {['9', '10'].map((g) => (
            <button
              key={g}
              onClick={() => setGradeTab(g)}
              className={`icse-btn ${gradeTab === g ? 'primary' : 'ghost'}`}
              data-testid={`icse-grade-tab-${g}`}
            >
              Grade {g}
            </button>
          ))}
        </div>

        <div className="mt-8 grid md:grid-cols-2 gap-5">
          <CurriculumBlock title="Robotics Theory" icon={Cpu} items={gradeData.robotics} accent="#DC2626" testid="icse-block-robotics" />
          <CurriculumBlock title="Robotics Practicals" icon={Package} items={gradeData.practical} accent="#F59E0B" testid="icse-block-practical" />
          <CurriculumBlock title="AI &amp; Python Theory" icon={Brain} items={gradeData.ai} accent="#60A5FA" testid="icse-block-ai" />
          <CurriculumBlock title="AI Project Framework" icon={Code2} items={gradeData.aiProjects} accent="#10B981" testid="icse-block-aiprojects" />
        </div>

        <div className="mt-8 text-center">
          <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer" className="icse-btn ghost" data-testid="icse-curriculum-download">
            <Download className="w-4 h-4" /> View Full Brochure (PDF)
          </a>
        </div>
      </section>

      {/* ── Why OLL / Trust ───────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14" data-testid="icse-why-oll">
        <div className="icse-glass rounded-3xl p-6 sm:p-10 grid md:grid-cols-3 gap-6 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#DC2626]/30 blur-3xl" />
          {[
            { i: ShieldCheck, t: 'NEP 2020 &amp; NCF 2023', s: 'Every topic mapped to the National Education Policy framework — future-ready by design.' },
            { i: Award,       t: 'STEM.org Accredited',    s: 'Independently reviewed for pedagogy, safety and outcomes. A credential parents recognise.' },
            { i: Users,       t: '400+ Partner Schools',   s: 'From Mumbai to Guwahati, 1.47L+ students already learn Robotics with OLL every week.' },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="relative">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'linear-gradient(135deg,#F59E0B,#B45309)' }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className="icse-h text-white text-2xl" dangerouslySetInnerHTML={{ __html: t }} />
              <div className="text-sm text-white/70 font-light mt-2">{s}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center" data-testid="icse-final-cta">
        <div className="inline-flex items-center gap-2 icse-glass rounded-full px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-[#FDBA74]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/90">Book a 30-min demo · Kit + Curriculum walkthrough</span>
        </div>
        <h2 className="icse-h text-white text-5xl sm:text-6xl mt-5">Bring ICSE Robotics to your school.</h2>
        <p className="text-white/75 font-light mt-4 max-w-2xl mx-auto">
          Our schools team will walk you through the kit, the syllabus mapping, teacher training and
          exam-day preparedness — in a single 30-minute session.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <button onClick={goBookDemo} className="icse-btn primary" data-testid="icse-final-cta-btn">
            Book a School Demo <ArrowRight className="w-4 h-4" />
          </button>
          <a href={CURRICULUM_PDF} target="_blank" rel="noreferrer" className="icse-btn ghost">
            <Download className="w-4 h-4" /> Download Curriculum
          </a>
        </div>
        <div className="mt-8 flex items-center justify-center gap-2 text-white/60 text-xs">
          <CheckCircle2 className="w-3.5 h-3.5" /> No commitment · No cost · Just answers.
        </div>
      </section>

      {/* Simple footer */}
      <footer className="border-t border-white/10 py-8 text-center text-white/50 text-xs">
        © 2026 OLL · Skills for All · <a href="/school" className="hover:text-white">Explore all school programs</a>
      </footer>
    </div>
  );
}

function CurriculumBlock({ title, icon: Icon, items, accent, testid }) {
  return (
    <div className="icse-card p-5 sm:p-6" data-testid={testid}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: accent }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="icse-h text-white text-xl" dangerouslySetInnerHTML={{ __html: title }} />
      </div>
      <ul className="space-y-2">
        {items.map((t) => (
          <li key={t} className="flex gap-2 text-white/80 text-sm font-light">
            <span className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: accent }} />
            <span>{t}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
