/**
 * STEM Preschool (Jr KG & Sr KG) landing page.
 *
 * Route: /school/stem-preschool
 *
 * Content structure & tone mirror the OLL "Little Innovators, Big
 * Tomorrows" poster the user shared. Design language reuses the
 * existing school-landing tokens (Proxima Nova headings, red/navy
 * accents, glass cards, orbs) so it slots in with the other landings.
 *
 * ─── Videos on the STEAM module cards ─────────────────────────────
 * Each entry in MODULES has an optional `videoUrl` — a YouTube watch
 * URL. When set, the card auto-swaps its image for an embedded video
 * (click-to-play). Until then it shows a static image + a "Video
 * coming soon" ribbon. To attach a video later, just paste the URL
 * into the module entry and hot-reload does the rest.
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles, Brain, Lightbulb, Users, TrendingUp,
  FlaskConical, Cpu, Cog, Palette, Calculator,
  BookOpen, Package, BookOpenText, UserCog, ClipboardCheck, Trophy, HeadphonesIcon, LineChart,
  Beaker, Zap, Blocks, Bot, Play, ArrowRight, GraduationCap, Download,
  MonitorSmartphone, Bell, MessageSquare, BarChart3, Award, Heart, Building2,
} from 'lucide-react';
import Footer from '../../components/Footer';

const OLL_LOGO_COLOR = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

// ── STEAM learning modules (leave `videoUrl` blank until we film) ──
const MODULES = [
  {
    key: 'science',
    title: 'Science Experiments',
    Icon: Beaker,
    tone: '#8B5CF6',
    tint: '#F5F3FF',
    image: 'https://images.unsplash.com/photo-1628595351029-c2bf17511435?w=800&q=70',
    imageAlt: 'Preschool science experiment kit',
    videoUrl: '',   // set to a YouTube URL when the sample reel is ready
  },
  {
    key: 'paper-circuits',
    title: 'Paper Circuits',
    Icon: Zap,
    tone: '#2563EB',
    tint: '#EFF6FF',
    image: 'https://images.unsplash.com/photo-1580414057403-c5f451f30e1c?w=800&q=70',
    imageAlt: 'Paper circuit with LED',
    videoUrl: '',
  },
  {
    key: 'lego',
    title: 'Lego Construction',
    Icon: Blocks,
    tone: '#EA580C',
    tint: '#FFF7ED',
    image: 'https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=800&q=70',
    imageAlt: 'Colourful lego blocks',
    videoUrl: '',
  },
  {
    key: 'coding-bot',
    title: 'Coding Bot',
    Icon: Bot,
    tone: '#059669',
    tint: '#ECFDF5',
    image: 'https://images.unsplash.com/photo-1546776310-eef45dd6d63c?w=800&q=70',
    imageAlt: 'Kids playing with a coding robot',
    videoUrl: '',
  },
];

const FOUNDATIONS = [
  { Icon: Brain,      title: 'Early Exposure',       body: 'Kids meet STEAM at their most curious age — big ideas, tiny hands.', color: '#DC2626', tint: '#FEE2E2' },
  { Icon: Lightbulb,  title: 'Stronger Foundations', body: 'Build the observation, logic and creativity muscles that shape every grade after.', color: '#2563EB', tint: '#DBEAFE' },
  { Icon: Users,      title: 'Engaged Learners',     body: 'Play-based sessions keep 3–6 year-olds active, chatty and confident.', color: '#8B5CF6', tint: '#EDE9FE' },
  { Icon: TrendingUp, title: 'Future Ready',         body: 'Set your preschool apart — parents love the "big-school skills, tiny-school heart" pitch.', color: '#059669', tint: '#D1FAE5' },
];

const PILLARS = [
  { Icon: FlaskConical, label: 'Science',     color: '#EC4899' },
  { Icon: Lightbulb,    label: 'Technology',  color: '#F59E0B' },
  { Icon: Cog,          label: 'Engineering', color: '#EA580C' },
  { Icon: Palette,      label: 'Art',         color: '#8B5CF6' },
  { Icon: Calculator,   label: 'Maths',       color: '#059669' },
];

const OFFERINGS = [
  { Icon: BookOpen,        title: 'Structured Curriculum',     body: 'Age-graded lesson plans mapped to NEP + play.' },
  { Icon: Package,         title: 'Hands-on Kits',             body: 'Everything a child needs, delivered to your school.' },
  { Icon: BookOpenText,    title: 'Interactive Books',         body: 'Big, colourful, story-first workbooks.' },
  { Icon: UserCog,         title: 'Teacher Empowerment Program', body: 'Weekly training + lesson prep for every teacher.' },
  { Icon: ClipboardCheck,  title: 'Assessment & Certification', body: 'Skill rubrics, term certificates for kids.' },
  { Icon: Trophy,          title: 'Showcase Opportunities',    body: 'Annual STEAM fair + parent showcase days.' },
  { Icon: HeadphonesIcon,  title: 'Service & Support',         body: 'Dedicated academic manager, replies within a day.' },
  { Icon: LineChart,       title: 'LMS & Reporting',           body: 'A dashboard for you, WhatsApp updates for parents.' },
];

// ── LMS feature grid — one dashboard, three audiences ──
const LMS_FEATURES = [
  { Icon: MonitorSmartphone, title: 'Teacher app',       body: 'Attendance, lesson tracker, photo uploads and daily observations in one tap.' },
  { Icon: BarChart3,         title: 'Principal dashboard', body: 'Live class-by-class progress, kit consumption and parent-engagement scores.' },
  { Icon: Bell,              title: 'Parent WhatsApp',    body: 'Weekly progress cards, milestone alerts and photos delivered right into WhatsApp.' },
  { Icon: MessageSquare,     title: 'Two-way messaging',  body: 'Parents ask, teachers reply — every conversation is logged with the child\'s record.' },
];

// ── About OLL data (short & benefit-led — not a wall of text) ──
const ABOUT_STATS = [
  { value: '500+',  label: 'Partner schools' },
  { value: '50k+',  label: 'Kids learning STEAM' },
  { value: '95%',   label: 'Teacher retention' },
  { value: '4.9★',  label: 'Parent rating' },
];

// ── Trusted-by school logos. Drop real logos into `/school-logos/` and
//    update `logo` to swap the placeholder pill for a proper mark.
const TRUSTED_SCHOOLS = [
  { name: 'Podar International',   city: 'Mumbai',   tint: '#FEE2E2' },
  { name: 'Kangaroo Kids',         city: 'Bangalore',tint: '#DBEAFE' },
  { name: 'EuroKids',              city: 'Delhi',    tint: '#FEF3C7' },
  { name: 'Little Millennium',     city: 'Pune',     tint: '#DCFCE7' },
  { name: 'Bachpan Play School',   city: 'Hyderabad',tint: '#EDE9FE' },
  { name: 'Shemrock',              city: 'Chandigarh',tint: '#FCE7F3' },
  { name: 'Kidzee',                city: 'Kolkata',  tint: '#CFFAFE' },
  { name: 'Sanskaar Kids',         city: 'Ahmedabad',tint: '#FED7AA' },
];

// ── YouTube helper ────────────────────────────────────────────────
const ytId = (url) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    if (u.pathname.startsWith('/embed/')) return u.pathname.split('/embed/')[1];
    return u.searchParams.get('v') || '';
  } catch { return ''; }
};

const VideoOrImage = ({ mod }) => {
  const [play, setPlay] = useState(false);
  const vid = ytId(mod.videoUrl);
  if (vid && play) {
    return (
      <iframe
        title={`${mod.title} sample`}
        src={`https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => vid ? setPlay(true) : null}
      className="relative w-full h-full block group"
      aria-label={vid ? `Play ${mod.title} sample video` : `${mod.title} sample`}
      data-testid={`stem-module-media-${mod.key}`}
    >
      <img src={mod.image} alt={mod.imageAlt} className="w-full h-full object-cover" loading="lazy" />
      {vid ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 group-hover:bg-black/40 transition-colors">
          <span className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="w-6 h-6 text-[#DC2626] fill-current ml-0.5" />
          </span>
        </span>
      ) : (
        <span className="absolute top-2 right-2 bg-white/90 text-slate-600 text-[10px] uppercase tracking-widest font-bold rounded-full px-2.5 py-1 shadow">
          Video coming soon
        </span>
      )}
    </button>
  );
};

// ── Main page ─────────────────────────────────────────────────────
export default function StemPreschoolLanding() {
  const navigate = useNavigate();
  useEffect(() => { document.title = 'STEM Preschool (Jr KG & Sr KG) · OLL'; }, []);
  const goPartner = () => navigate('/school/onboarding?program=stem-preschool');

  return (
    <div className="min-h-screen bg-white" data-testid="stem-preschool-landing">
      <style>{`
        /* Local design tokens — mirror the ICSE/CBSE landings */
        .sp-h1   { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 900; letter-spacing: -0.03em; line-height: 1.02; }
        .sp-h2   { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 900; letter-spacing: -0.025em; }
        .sp-eye  { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 800; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; }
        .sp-body { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 400; }
        .sp-caveat { font-family: 'Caveat', cursive; font-weight: 700; }
        .sp-btn { display:inline-flex; align-items:center; gap:8px; padding:14px 26px; border-radius:14px; font-family:'Proxima Nova','Montserrat',sans-serif; font-size:13px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease; }
        .sp-btn.primary { background:#DC2626; color:#fff; box-shadow: 0 10px 24px rgba(220,38,38,0.35); }
        .sp-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 14px 32px rgba(220,38,38,0.45); }
        /* Nav pill — same visual pattern as the other landings */
        .sp-nav-pill { display:flex; align-items:center; justify-content:space-between; gap:12px; max-width: 1200px; margin: 0 auto; padding:10px 16px; background: rgba(255,255,255,0.94); backdrop-filter: blur(14px); border: 1px solid rgba(226,232,240,0.9); border-radius: 999px; box-shadow: 0 12px 30px rgba(15,30,80,0.08); }
        .sp-nav-link { font-family:'Proxima Nova','Montserrat',sans-serif; font-size:12px; font-weight:800; letter-spacing:0.06em; text-transform:uppercase; color:#0A1F44; padding:8px 12px; border-radius:999px; transition:background .15s ease; }
        .sp-nav-link:hover { background: rgba(15,30,80,0.06); }
        /* Ribbon corner */
        .sp-corner-ribbon { position:absolute; top:24px; right:0; background:linear-gradient(135deg,#DC2626,#B91C1C); color:#fff; padding:8px 22px 8px 30px; clip-path: polygon(20px 0, 100% 0, 100% 100%, 0 100%); }
        .sp-orb { position:absolute; border-radius:9999px; filter: blur(80px); opacity:.5; pointer-events:none; }
      `}</style>

      {/* ─────────── Sticky pill nav ─────────── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="stem-nav" aria-label="Primary">
        <div className="sp-nav-pill">
          <a href="/" className="flex items-center gap-3" aria-label="OLL home">
            <img src={OLL_LOGO_COLOR} alt="OLL — STEM Preschool partner" className="h-9 sm:h-10 w-auto" />
            <span className="hidden md:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              Preschool STEAM<br/>Jr KG · Sr KG
            </span>
          </a>
          <div className="flex items-center gap-1">
            <a href="#modules" className="sp-nav-link hidden lg:inline-block" data-testid="stem-nav-modules">Modules</a>
            <a href="#lms"     className="sp-nav-link hidden lg:inline-block" data-testid="stem-nav-lms">LMS</a>
            <a href="#about"   className="sp-nav-link hidden lg:inline-block" data-testid="stem-nav-about">About OLL</a>
            <a href="#schools" className="sp-nav-link hidden lg:inline-block" data-testid="stem-nav-schools">Our Schools</a>
            <button onClick={goPartner} className="sp-btn primary ml-2" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="stem-nav-cta">
              Partner with OLL <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>
      <div style={{ paddingTop: 'clamp(2.5rem, 8vw, 5rem)' }} />


      {/* ═══════ HERO ═══════ */}
      <section className="relative overflow-hidden" data-testid="stem-hero">
        <div className="sp-orb" style={{ width: 500, height: 500, top: -160, left: '-8%', background: 'radial-gradient(circle,#FCA5A5 0%,transparent 70%)' }} />
        <div className="sp-orb" style={{ width: 500, height: 500, bottom: -160, right: '-8%', background: 'radial-gradient(circle,#93C5FD 0%,transparent 70%)' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid lg:grid-cols-[1.15fr,1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 mb-6">
                <Sparkles className="w-3.5 h-3.5 text-[#DC2626]" />
                <span className="sp-eye text-[#0A1F44]">Creating Next-Gen Leaders</span>
              </div>
              <h1 className="sp-h1 text-4xl sm:text-5xl lg:text-6xl text-[#0A1F44]">
                Want Your Preschool to Have <span className="text-[#DC2626]">STEAM</span> &amp; <span className="text-[#DC2626]">Future-Ready Skills?</span>
              </h1>
              <p className="sp-body text-base sm:text-lg text-slate-700 mt-5 max-w-xl">
                Partner with OLL to bring hands-on, joyful and age-appropriate STEAM learning to your preschool.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full text-white px-4 py-2 shadow-md" style={{ background: 'linear-gradient(135deg,#0A1F44,#1E3A5F)' }}>
                  <GraduationCap className="w-4 h-4" /> <span className="sp-eye" style={{ color: '#FCA5A5' }}>Grades Jr KG &amp; Sr KG</span>
                </span>
                <button onClick={goPartner} className="sp-btn primary" data-testid="stem-hero-cta">
                  Partner with OLL <ArrowRight className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-6 flex items-center gap-2 sp-caveat text-[#DC2626] text-2xl">
                Play · Explore · Learn · Grow
              </div>
            </div>

            <div className="relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100">
                <img
                  src="https://images.unsplash.com/photo-1587654780291-39c9404d746b?w=1200&q=80"
                  alt="Preschooler building with STEAM kits"
                  className="w-full h-[420px] object-cover"
                />
                <div className="sp-corner-ribbon sp-eye">
                  Little Innovators · Big Tomorrows
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3">
                <div className="sp-caveat text-[#DC2626] text-xl leading-none">Because every big dream</div>
                <div className="sp-caveat text-[#0A1F44] text-xl leading-none mt-1">starts early!</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ BUILD STRONG FOUNDATIONS ═══════ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-3">
          <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44]">
            Build Strong Foundations <span className="text-[#DC2626]">Early</span>
          </h2>
          <span className="sp-eye text-slate-500 tracking-[0.24em]">Curious Minds &nbsp;|&nbsp; Brighter Futures</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stem-foundations">
          {FOUNDATIONS.map(({ Icon, title, body, color, tint }) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-11 h-11 rounded-full flex items-center justify-center mb-3" style={{ background: tint }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="sp-h2 text-lg text-[#0A1F44] leading-tight">{title}</div>
              <div className="sp-body text-sm text-slate-600 mt-1.5">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ 5 PILLARS OF STEAM ═══════ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0A1F44 0%, #1E3A5F 100%)' }} data-testid="stem-pillars">
          <div className="sp-orb" style={{ width: 320, height: 320, top: -100, right: -80, background: 'radial-gradient(circle,#FCA5A5 0%,transparent 70%)' }} />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
            <h2 className="sp-h2 text-2xl sm:text-3xl text-white">The 5 Pillars of <span className="text-[#FCA5A5]">STEAM</span></h2>
            <div className="sp-eye text-white/70 tracking-[0.2em]">
              Science &nbsp;|&nbsp; Technology &nbsp;|&nbsp; Engineering &nbsp;|&nbsp; Art &nbsp;|&nbsp; Maths
            </div>
          </div>
          <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {PILLARS.map(({ Icon, label, color }) => (
              <div key={label} className="rounded-2xl bg-white/95 backdrop-blur px-4 py-5 text-center hover:bg-white transition-colors">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}15`, border: `2px solid ${color}30` }}>
                  <Icon className="w-7 h-7" style={{ color }} />
                </div>
                <div className="sp-h2 text-sm text-[#0A1F44]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ WHAT YOUR PRESCHOOL GETS ═══════ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-3">
          <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44]">
            What Your Preschool <span className="text-[#DC2626]">Gets</span>
          </h2>
          <span className="sp-eye text-slate-500 tracking-[0.2em]">A Complete Solution for Early Learners</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="stem-offerings">
          {OFFERINGS.map(({ Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: '#FEE2E2' }}>
                <Icon className="w-5 h-5 text-[#DC2626]" />
              </div>
              <div className="sp-h2 text-base text-[#0A1F44] leading-tight">{title}</div>
              <div className="sp-body text-xs text-slate-600 mt-1.5">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════ STEAM LEARNING MODULES (with video slots) ═══════ */}
      <section id="modules" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-3">
          <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44]">
            Our <span className="text-[#DC2626]">STEAM</span> Learning Modules
          </h2>
          <span className="sp-eye text-slate-500 tracking-[0.2em]">Hands-on. Engaging. Age-Appropriate.</span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5" data-testid="stem-modules">
          {MODULES.map((m) => (
            <div key={m.key} className="rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow" data-testid={`stem-module-${m.key}`}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ background: m.tint }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: m.tone }}>
                  <m.Icon className="w-4 h-4 text-white" />
                </div>
                <div className="sp-h2 text-sm text-[#0A1F44]">{m.title}</div>
              </div>
              <div className="relative aspect-[4/3] bg-slate-100">
                <VideoOrImage mod={m} />
              </div>
            </div>
          ))}
        </div>
        <p className="text-center text-[11px] sp-body text-slate-400 mt-6 uppercase tracking-widest">
          Kit sample reels — coming soon. Ask us for a live demo any time.
        </p>
      </section>

      {/* ═══════ LMS · one dashboard, three audiences ═══════ */}
      <section id="lms" className="relative py-16 scroll-mt-24" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' }} data-testid="stem-lms">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-10 gap-3">
            <div>
              <div className="sp-eye text-[#DC2626] flex items-center gap-1.5">
                <MonitorSmartphone className="w-3.5 h-3.5" /> LMS &amp; Parent App
              </div>
              <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44] mt-1">
                One <span className="text-[#DC2626]">dashboard</span> — Teachers, Principal, Parents
              </h2>
              <p className="sp-body text-slate-600 mt-2 max-w-xl">
                Every session gets logged, every milestone alerts the parent, every principal sees the whole school in one view. No spreadsheets, no chase-ups.
              </p>
            </div>
            <img
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=520&q=70"
              alt="Teacher using OLL LMS on a tablet"
              className="hidden md:block w-64 rounded-2xl shadow-lg object-cover"
              style={{ height: 150 }}
              loading="lazy"
            />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LMS_FEATURES.map(({ Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition-shadow" data-testid={`stem-lms-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className="w-11 h-11 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-blue-700" />
                </div>
                <div className="sp-h2 text-base text-[#0A1F44] leading-tight">{title}</div>
                <div className="sp-body text-xs text-slate-600 mt-1.5">{body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════ ABOUT OLL ═══════ */}
      <section id="about" className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 scroll-mt-24" data-testid="stem-about">
        <div className="grid lg:grid-cols-[1.05fr,1fr] gap-10 items-center">
          <div>
            <div className="sp-eye text-[#DC2626] flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5" /> About OLL
            </div>
            <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44] mt-1">Big-school skills, <span className="text-[#DC2626]">tiny-school heart.</span></h2>
            <p className="sp-body text-slate-700 mt-4 max-w-xl">
              OLL builds India's most joyful STEAM programme for schools. We ship the kits, train the teachers, and stay on-call so principals can focus on what they do best — running a wonderful school. Preschools are our favourite because that's where every big dream really starts.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
              {ABOUT_STATS.map((s) => (
                <div key={s.label} className="rounded-2xl bg-white border border-slate-100 p-4 text-center shadow-sm">
                  <div className="sp-h1 text-2xl text-[#DC2626]">{s.value}</div>
                  <div className="sp-eye text-slate-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-[11px] font-bold text-emerald-800"><Award className="w-3.5 h-3.5" /> NEP 2020 aligned</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-[11px] font-bold text-blue-800"><ClipboardCheck className="w-3.5 h-3.5" /> ISO-certified curriculum</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1.5 text-[11px] font-bold text-amber-800"><Trophy className="w-3.5 h-3.5" /> Techfest IIT-B partner</span>
            </div>
          </div>
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1000&q=75"
              alt="Happy preschool classroom with STEM activities"
              className="w-full h-[380px] object-cover rounded-3xl shadow-xl border border-slate-100"
              loading="lazy"
            />
            <div className="absolute -bottom-4 -left-4 bg-white rounded-2xl shadow-xl border border-slate-100 px-4 py-3 max-w-[220px]">
              <div className="sp-caveat text-[#DC2626] text-2xl leading-none">Since 2018</div>
              <div className="sp-body text-xs text-slate-600 mt-1">bringing hands-on STEAM to every classroom, every child.</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════ SCHOOLS WE WORK WITH ═══════ */}
      <section id="schools" className="relative py-16 scroll-mt-24" style={{ background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)' }} data-testid="stem-schools">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-8 gap-3">
            <div>
              <div className="sp-eye text-[#DC2626] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> Trusted by preschools across India
              </div>
              <h2 className="sp-h2 text-3xl sm:text-4xl text-[#0A1F44] mt-1">Schools we work with</h2>
              <p className="sp-body text-slate-600 mt-2 max-w-xl">
                From metros to tier-3 towns — leading preschool chains &amp; independent playschools have partnered with us for their STEAM curriculum.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {TRUSTED_SCHOOLS.map((s) => (
              <div key={s.name} className="rounded-2xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col items-center text-center gap-2" data-testid={`stem-school-${s.name.replace(/\s+/g, '-').toLowerCase()}`}>
                <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: s.tint }}>
                  <Building2 className="w-7 h-7 text-[#0A1F44]" />
                </div>
                <div className="sp-h2 text-sm text-[#0A1F44] leading-tight">{s.name}</div>
                <div className="sp-eye text-slate-400">{s.city}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-[11px] sp-body text-slate-400 mt-8 uppercase tracking-widest">
            …and 490+ more across 60+ cities.
          </p>
        </div>
      </section>

      {/* ═══════ FINAL CTA ═══════ */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20" data-testid="stem-final-cta">
        <div className="rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-br from-white via-rose-50 to-blue-50 border border-slate-100">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <div className="sp-caveat text-[#DC2626] text-2xl">Let's Build Brighter Beginnings Together</div>
              <h3 className="sp-h2 text-2xl sm:text-3xl text-[#0A1F44] mt-1">Bring STEAM to Your Preschool</h3>
              <p className="sp-body text-slate-600 mt-2 max-w-xl">Partner with OLL — we'll ship the kits, train your teachers and open the doors to the future for every 4 &amp; 5 year old at your school.</p>
            </div>
            <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
              <button onClick={goPartner} className="sp-btn primary" data-testid="stem-final-cta-btn">
                Partner with OLL <ArrowRight className="w-4 h-4" />
              </button>
              <div className="rounded-2xl bg-white border border-slate-200 px-4 py-3 text-right">
                <div className="sp-eye text-slate-400">Skills Today</div>
                <div className="sp-h2 text-[#0A1F44]">Opportunities Tomorrow</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
