import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Flag, Zap, Cpu, Users, MapPin, Calendar, ShieldCheck,
  ArrowRight, Sparkles, Target, CircleDot, Layers, ChevronDown,
} from 'lucide-react';

const TECHFEST_LOGO = 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/techfest_logo.png';
const SUMO_HERO   = '/techfest/1.png';
const SUMO_BOX    = '/techfest/2.png';
const RACER_HERO  = '/techfest/5.png';
const RACER_TRACK = '/techfest/6.png';

const TRACKS = [
  {
    key: 'sumo',
    label: 'RoboSumo',
    tag: 'Battle · 1v1',
    icon: CircleDot,
    color: '#DC2626',
    tagline: 'Push. Grip. Dominate.',
    short: 'A head-to-head pushing contest between two bots inside a circular ring. Testing structural design, traction, and pushing power — rules adapted from the Technoxian World Robotics Championship.',
    long: 'RoboSumo turns mechanical design and control programming into a head-to-head duel. Teams build a fully autonomous, wireless bot and send it into the arena to push the opponent clean over the edge. No weapons, no flipping — just raw traction, weight distribution, and sharp control strategy going toe-to-toe.',
    hero: SUMO_HERO,
    stats: [
      { k: 'Arena', v: '150 cm circular' },
      { k: 'Bot Size', v: '25 × 25 × 25 cm' },
      { k: 'Max Weight', v: '3 kg' },
      { k: 'Match', v: '2 min · Knockout' },
    ],
    rules: [
      '1v1 face-off with bots placed at opposite starting points.',
      'First bot pushed out of the ring loses; matches capped at 2 minutes.',
      '2 restart / sudden-death rounds if no elimination; referee decides on control & dominance if still tied.',
      'No weapons, sharp mechanisms, flipping mechanisms, or projectiles.',
      'Bot must be the team\u2019s own original design — ready-made kits are not permitted.',
      'A 2-minute grace period is allowed to fix a non-functional bot; otherwise both teams are disqualified.',
    ],
    productSlug: 'robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a',
  },
  {
    key: 'racer',
    label: 'RoboRacer',
    tag: 'Race · 1v1',
    icon: Zap,
    color: '#1E3A5F',
    tagline: 'Build. Code. Race. Win.',
    short: 'A head-to-head speed contest between two RC bots on a shared track. Drivetrain design, agility and race-line strategy decide the winner.',
    long: 'RoboRacer puts drivetrain design and nerve to the test. Teams build RC bots and race them head-to-head down a shared track, from a standing start to the finish line. Whether built for raw top speed or tight control, every bot lives or dies by its traction, steering, and the driver\u2019s reflexes.',
    hero: RACER_HERO,
    stats: [
      { k: 'Track', v: '10–12 m · 2 lanes' },
      { k: 'Bot Size', v: '20 × 15 × 15 cm' },
      { k: 'Max Weight', v: '1.5 kg' },
      { k: 'Heat', v: '2 min · Knockout' },
    ],
    rules: [
      '1v1 heat between two bots in adjacent lanes, launched on the referee\u2019s signal.',
      'First bot to fully cross the finish line wins the heat.',
      'Dead heat or photo finish → immediate re-race between the same two bots.',
      'Fully wireless RC control only — one frequency/channel per team.',
      'Chassis, drivetrain, and control logic must be the team\u2019s own build. Ready-made RC toy cars are not allowed.',
      'No obstruction, blocking, sharp parts, or projectiles.',
    ],
    productSlug: 'robo-racer-kit-specially-made-for-iit-bombay-8bf545dc',
  },
  {
    key: 'ric',
    label: 'Robotics Innovation Challenge',
    tag: 'Ideate · Prototype · Pitch',
    icon: Sparkles,
    color: '#DC2626',
    tagline: 'Spot a real problem. Build a real solution.',
    short: 'Research-and-presentation track. Students identify a real-world problem, build an original prototype, and pitch it to a judging panel — with its own two-round online-to-onsite structure.',
    long: 'This track steps away from head-to-head combat. Students spot a real-world problem and design an original robotic prototype, automation system, or STEM concept to solve it, then defend it before a judging panel. Two rounds: online submission → live prototype presentation at IIT Bombay.',
    hero: null,
    stats: [
      { k: 'Junior', v: 'Grades 4–7' },
      { k: 'Senior', v: 'Grades 8–12' },
      { k: 'Round 1', v: 'Online submission' },
      { k: 'Round 2', v: 'Live at IIT Bombay' },
    ],
    rules: [
      'Junior theme: Smart Solutions for Everyday Life (waste, water, safety, plant care, home help, energy).',
      'Senior theme: Robotics & Automation for a Smart, Sustainable Future (agriculture, disaster, health, energy, mobility, environment).',
      'Round 1 submission: 1-page problem write-up, 500-800 word technical abstract, design diagram, 1–3 min demo video.',
      'Round 2 at IIT Bombay: 10 min live demo + 5 min judge Q&A.',
      'Round 1 shortlists; final rankings are decided only in Round 2.',
    ],
  },
];

const TIMELINE = [
  { label: 'Registration Opens', value: 'On techfest.org', icon: Users, tone: 'live' },
  { label: 'Round 1 Submission', value: 'TBA · via Techfest portal', icon: Layers, tone: 'upcoming' },
  { label: 'Round 1 Results', value: 'TBA', icon: Flag, tone: 'upcoming' },
  { label: 'OLL Regional Qualifiers', value: 'Dates live on /techfest', icon: MapPin, tone: 'live' },
  { label: 'Grand Finale · IIT Bombay', value: '16–18 December 2026', icon: Trophy, tone: 'headline' },
];

const FAQS = [
  { q: 'Who can participate?', a: 'RoboSumo and RoboRacer are open to all school students in teams of 3–5. The Robotics Innovation Challenge has Junior (Grades 4–7) and Senior (Grades 8–12) categories.' },
  { q: 'Do I need to buy the OLL kit?', a: 'The OLL Robo Sumo and Robo Racer kits are officially designed for the competition. They give you the exact metal body, motors, wheels, controller and arena/track needed to compete.' },
  { q: 'What is the OLL Regional Qualifier bypass?', a: 'Teams that qualify through the OLL Regional Qualifiers advance straight to the Grand Finale for RoboSumo and RoboRacer. This bypass does not apply to the Robotics Innovation Challenge — it uses its own two-round structure.' },
  { q: 'What are the prizes?', a: 'Prize money is awarded to the top three teams of each track. Payouts are made via NEFT after winners submit their bank details in the on-site form, with final payment by May 2027.' },
  { q: 'What do participants receive?', a: 'Every participant with an accepted entry gets a Certificate of Participation. Grand Finale competitors additionally receive a Certificate of Finalist recognition.' },
  { q: 'Where is the Grand Finale?', a: 'IIT Bombay, 16–18 December 2026 — the flagship Techfest campus edition.' },
];

// ─── Imperative SEO tags (react-helmet-async unreliable here) ────────────────
const upsertMeta = (key, value, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
};

export default function TechfestPage() {
  const [activeTrack, setActiveTrack] = useState('sumo');
  const [openFaq, setOpenFaq] = useState(0);

  const track = useMemo(() => TRACKS.find((t) => t.key === activeTrack) || TRACKS[0], [activeTrack]);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const CANONICAL = 'https://oll.co/techfest';
    const TITLE = 'OLL × Techfest IIT Bombay 2026 — RoboSumo, RoboRacer & Robotics Innovation Challenge';
    const DESC = 'Compete in RoboSumo, RoboRacer and the Robotics Innovation Challenge at Techfest IIT Bombay 2026. Grade-wise categories, OLL regional qualifiers and a Grand Finale at IIT Bombay from 16–18 December 2026. Prize money for top 3 teams of each track.';
    document.title = TITLE;
    upsertMeta('description', DESC);
    upsertMeta('keywords', 'techfest, IIT Bombay, robotics competition, RoboSumo, RoboRacer, robotics innovation challenge, OLL Techfest, school robotics competition, robotics championship India');
    upsertMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', CANONICAL, 'property');
    upsertMeta('og:title', TITLE, 'property');
    upsertMeta('og:description', DESC, 'property');
    upsertMeta('og:image', 'https://oll.co/techfest/1.png', 'property');
    upsertMeta('og:site_name', 'OLL', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', TITLE);
    upsertMeta('twitter:description', DESC);
    upsertMeta('twitter:image', 'https://oll.co/techfest/1.png');
    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = CANONICAL;

    const schemas = [
      {
        "@context": "https://schema.org", "@type": "Event",
        "name": "Techfest IIT Bombay 2026 · Robotics Championships",
        "description": DESC,
        "startDate": "2026-12-16", "endDate": "2026-12-18",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": { "@type": "Place", "name": "IIT Bombay", "address": "Powai, Mumbai, Maharashtra 400076" },
        "organizer": { "@type": "Organization", "name": "OLL", "url": "https://oll.co" },
        "url": CANONICAL,
        "offers": { "@type": "Offer", "url": "https://techfest.org", "price": "0", "priceCurrency": "INR", "availability": "https://schema.org/InStock" }
      },
      {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": FAQS.map((f) => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } }))
      },
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/" },
          { "@type": "ListItem", "position": 2, "name": "Techfest 2026", "item": CANONICAL }
        ]
      }
    ];
    const addedIds = [];
    schemas.forEach((obj, i) => {
      const id = `tf-jsonld-${i}`;
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
      el.textContent = JSON.stringify(obj);
      addedIds.push(id);
    });
    return () => { addedIds.forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); }); };
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#0A1F44]" data-testid="techfest-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@700&family=Montserrat:wght@300;600;800;900&display=swap');
        .tf-body { font-family: 'Montserrat', system-ui, sans-serif; }
        .tf-h1 { font-family: 'Bebas Neue', 'Anton', sans-serif; letter-spacing: 0.01em; line-height: 0.92; }
        .tf-script { font-family: 'Caveat', cursive; }
        .tf-eyebrow { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .tf-fadeup { opacity: 0; transform: translateY(24px); transition: opacity .7s ease, transform .7s ease; }
        .tf-fadeup.on { opacity: 1; transform: none; }
        @keyframes tf-grain { 0%,100% { transform: translate(0,0); } 25% { transform: translate(-2%,-3%); } 50% { transform: translate(3%,-1%); } 75% { transform: translate(-1%,2%); } }
        .tf-grain::before { content:''; position: absolute; inset:-50%; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E"); mix-blend-mode: overlay; opacity:.10; pointer-events:none; animation: tf-grain 22s steps(2) infinite; }
        @keyframes tf-track-move { 0% { background-position: 0 0; } 100% { background-position: 200% 0; } }
      `}</style>

      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden tf-grain" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 30%, rgba(220,38,38,0.35), transparent 55%), radial-gradient(circle at 85% 70%, rgba(96,165,250,0.25), transparent 60%)' }} />
        {/* Racing-stripe accent */}
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #DC2626 0 40px, #FFFFFF 40px 80px)', animation: 'tf-track-move 12s linear infinite', backgroundSize: '200% 100%' }} />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-24 lg:pt-24 lg:pb-32">
          <div className="grid lg:grid-cols-[1.15fr,1fr] gap-10 items-center">
            <div className="text-white">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-white/10 backdrop-blur border border-white/20 mb-6" data-testid="techfest-hero-badge">
                <span className="tf-eyebrow text-white/80">OLL × Techfest IIT Bombay</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
              </div>
              <div className="tf-script text-3xl md:text-4xl mb-2 text-[#FCA5A5]">India&apos;s biggest college tech fest.</div>
              <h1 className="tf-h1 text-5xl sm:text-6xl md:text-7xl lg:text-[5.75rem] font-black">
                Build. Battle. <span className="text-[#DC2626]">Race.</span> Win.
              </h1>
              <p className="tf-body font-light text-base md:text-lg text-white/85 mt-6 max-w-xl leading-relaxed">
                Compete across three flagship robotics tracks at Techfest 2026-27 — the biggest science &amp; tech festival in Asia. Regional qualifiers powered by OLL. Grand Finale live at IIT Bombay <strong className="font-bold text-white">16–18 December 2026</strong>.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <a
                  href="https://techfest.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-sm uppercase tracking-widest shadow-lg shadow-red-900/30 transition"
                  data-testid="techfest-register-btn"
                >
                  Register on Techfest.org <ArrowRight className="w-4 h-4" />
                </a>
                <Link
                  to="/shop"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 text-white font-bold text-sm uppercase tracking-widest transition"
                  data-testid="techfest-shop-btn"
                >
                  Get the Kits
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-white/70 font-semibold">
                <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-[#FCA5A5]" /> Prize Money · Top 3 per track</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#60A5FA]" /> STEM.org-Aligned Curriculum</span>
                <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-[#FCA5A5]" /> Teams of 3–5</span>
              </div>
            </div>
            {/* Hero card stack */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-40 h-40 rounded-full blur-3xl bg-[#DC2626] opacity-40" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 rotate-1">
                <img src={SUMO_HERO} alt="OLL Robo Sumo Kit for Techfest IIT Bombay" className="w-full block" loading="lazy" />
              </div>
              <div className="mt-4 relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 -rotate-1 hidden md:block">
                <img src={RACER_HERO} alt="OLL Robo Racer Kit for Techfest IIT Bombay" className="w-full block" loading="lazy" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRACK TABS ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" data-testid="techfest-tracks-section">
        <div className="text-center mb-10">
          <div className="tf-script text-3xl text-[#DC2626]">three tracks. one championship.</div>
          <h2 className="tf-h1 text-4xl md:text-5xl mt-1">Pick your Battle.</h2>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {TRACKS.map((t) => {
            const active = t.key === activeTrack;
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTrack(t.key)}
                data-testid={`techfest-tab-${t.key}`}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all ${
                  active
                    ? 'bg-[#0A1F44] text-white shadow-lg'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-[1.1fr,1fr] gap-8 items-start" key={track.key}>
          <div className="tf-fadeup on order-2 lg:order-1">
            <div className="tf-eyebrow text-[#DC2626] flex items-center gap-2">
              <track.icon className="w-4 h-4" /> {track.tag}
            </div>
            <h3 className="tf-h1 text-4xl md:text-5xl mt-2">{track.label}.</h3>
            <div className="tf-script text-2xl text-[#0A1F44]/70 mt-1">{track.tagline}</div>
            <p className="tf-body font-light text-slate-700 mt-5 leading-relaxed">{track.long}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {track.stats.map((s) => (
                <div key={s.k} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="tf-eyebrow text-slate-500">{s.k}</div>
                  <div className="tf-h1 text-2xl mt-1 text-[#0A1F44]">{s.v}</div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="tf-eyebrow text-slate-500 mb-3">Rules &amp; Arena</div>
              <ul className="space-y-2 tf-body font-light text-sm text-slate-700 leading-relaxed">
                {track.rules.map((r, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#DC2626] flex-shrink-0" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {track.productSlug && (
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to={`/shop/product/${track.productSlug}`}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white font-bold text-xs uppercase tracking-widest shadow-lg shadow-red-900/30"
                  data-testid={`techfest-cta-kit-${track.key}`}
                >
                  Get the Official {track.label} Kit <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href="https://techfest.org"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white border-2 border-[#0A1F44] text-[#0A1F44] font-bold text-xs uppercase tracking-widest hover:bg-[#0A1F44] hover:text-white transition"
                >
                  Register on Techfest.org
                </a>
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-50">
              {track.hero ? (
                <img src={track.hero} alt={`${track.label} kit`} className="w-full block" loading="lazy" />
              ) : (
                <div className="p-10 lg:p-14" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)' }}>
                  <Sparkles className="w-14 h-14 text-[#FCA5A5]" />
                  <div className="tf-script text-4xl text-[#FCA5A5] mt-4">real problems.</div>
                  <div className="tf-h1 text-5xl md:text-6xl text-white mt-1">Real Prototypes.</div>
                  <p className="tf-body font-light text-white/80 mt-4 leading-relaxed">
                    Junior &amp; Senior categories · online Round 1 → live prototype demo at IIT Bombay for Round 2 · originality, technical execution and real-world relevance judged live by the Techfest panel.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TIMELINE ─────────────────────────────────────────────── */}
      <section className="bg-[#0A1F44] py-16 lg:py-24 relative overflow-hidden" data-testid="techfest-timeline-section">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 80% 20%, rgba(220,38,38,0.25), transparent 55%)' }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 text-white">
            <div className="tf-script text-3xl text-[#FCA5A5]">the road to iit bombay.</div>
            <h2 className="tf-h1 text-4xl md:text-5xl mt-1">Timeline.</h2>
          </div>
          <div className="grid md:grid-cols-5 gap-3">
            {TIMELINE.map((t, i) => {
              const Icon = t.icon;
              const isHead = t.tone === 'headline';
              return (
                <div
                  key={i}
                  className={`relative rounded-2xl p-5 border ${isHead ? 'bg-[#DC2626] border-[#DC2626] text-white' : 'bg-white/5 border-white/10 text-white'}`}
                  data-testid={`techfest-timeline-${i}`}
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${isHead ? 'bg-white text-[#DC2626]' : 'bg-white/10 text-white'} mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="tf-eyebrow text-white/60">{t.label}</div>
                  <div className="tf-h1 text-xl mt-1">{t.value}</div>
                </div>
              );
            })}
          </div>
          <div className="text-center text-white/60 text-xs mt-6 tf-body">
            Exact submission and result dates published on <a href="https://techfest.org" target="_blank" rel="noreferrer" className="text-[#FCA5A5] underline">techfest.org</a>. Regional qualifier dates live on this page.
          </div>
        </div>
      </section>

      {/* ─── OLL KITS ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" data-testid="techfest-kits-section">
        <div className="text-center mb-10">
          <div className="tf-script text-3xl text-[#DC2626]">official gear.</div>
          <h2 className="tf-h1 text-4xl md:text-5xl mt-1">The Techfest-Ready Kits.</h2>
          <p className="tf-body font-light text-slate-600 mt-3 max-w-2xl mx-auto">
            Every part in the arena has been engineered for the competition rulebook — the OLL Techfest kits ship with the exact metal body, motors, wheels, controllers and arenas you need to compete.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <KitCard
            testId="techfest-kit-sumo"
            title="Robo Sumo Kit"
            tagline="Build. Battle. Win."
            image={SUMO_BOX}
            highlights={['Full Metal Body', '4 Powerful Motors', 'High-Grip Wheels', 'Wired Controller', 'Sumo Arena Mat (150 × 150 cm)']}
            slug="robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a"
          />
          <KitCard
            testId="techfest-kit-racer"
            title="Robo Racer Car Kit"
            tagline="Build. Code. Race. Win."
            image={RACER_TRACK}
            highlights={['Complete RC Chassis', '2 Motors + 4 Wheels', 'Modular Racing Track (240 × 120 cm)', 'Batteries + Switch', 'User Manual & Stickers']}
            slug="robo-racer-kit-specially-made-for-iit-bombay-8bf545dc"
          />
        </div>
      </section>

      {/* ─── PRIZES & CERTS ──────────────────────────────────────── */}
      <section className="bg-slate-50 py-16 lg:py-24" data-testid="techfest-prizes-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-8 lg:p-10 text-white" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #7f1d1d 100%)' }}>
            <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10" />
            <div className="tf-eyebrow text-white/70">Prize Money</div>
            <h2 className="tf-h1 text-4xl md:text-5xl mt-2">Top 3 per Track.</h2>
            <p className="tf-body font-light text-white/85 mt-4 max-w-xl">
              Prize money is awarded to the top three teams of each track. Winners submit bank details via the on-site form after the finale; payouts via NEFT by May 2027.
            </p>
          </div>
          <div className="rounded-3xl p-8 lg:p-10 bg-white border border-slate-200">
            <ShieldCheck className="w-8 h-8 text-[#0A1F44]" />
            <div className="tf-eyebrow text-slate-500 mt-4">Certificates</div>
            <div className="tf-h1 text-2xl mt-1 text-[#0A1F44]">Recognition for every team.</div>
            <ul className="mt-4 space-y-2 tf-body text-sm text-slate-700 font-light">
              <li className="flex items-start gap-2"><Target className="w-4 h-4 text-[#DC2626] mt-0.5" /> <span><strong>Certificate of Participation</strong> for every accepted entry.</span></li>
              <li className="flex items-start gap-2"><Trophy className="w-4 h-4 text-[#DC2626] mt-0.5" /> <span><strong>Certificate of Finalist Recognition</strong> for Grand Finale competitors.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" data-testid="techfest-faq-section">
        <div className="text-center mb-10">
          <div className="tf-script text-3xl text-[#DC2626]">need answers?</div>
          <h2 className="tf-h1 text-4xl md:text-5xl mt-1">Frequently Asked.</h2>
        </div>
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i}>
                <button
                  className="w-full flex items-start gap-3 text-left px-5 py-4 hover:bg-slate-50"
                  onClick={() => setOpenFaq(open ? -1 : i)}
                  data-testid={`techfest-faq-${i}`}
                  aria-expanded={open}
                >
                  <ChevronDown className={`w-4 h-4 mt-1 text-[#DC2626] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
                  <span className="flex-1 tf-body font-bold text-[#0A1F44]">{f.q}</span>
                </button>
                {open && (
                  <div className="px-5 pb-5 pl-12 tf-body font-light text-slate-600 leading-relaxed text-sm">{f.a}</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── FINAL CTA ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white tf-grain" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #DC2626 100%)' }}>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="tf-script text-3xl md:text-4xl text-[#FCA5A5]">the arena is ready.</div>
          <h2 className="tf-h1 text-5xl md:text-6xl lg:text-7xl mt-2">Are You?</h2>
          <p className="tf-body font-light text-white/85 mt-5 max-w-xl mx-auto">
            Grab the kit, gather your team, register on techfest.org and start the road to IIT Bombay. Regional qualifiers open across India through 2026.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a
              href="https://techfest.org"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#DC2626] font-bold text-sm uppercase tracking-widest shadow-2xl"
              data-testid="techfest-final-register"
            >
              Register Now <ArrowRight className="w-4 h-4" />
            </a>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white/10 border-2 border-white/40 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/20"
              data-testid="techfest-final-shop"
            >
              Shop the Kits
            </Link>
          </div>
          <div className="mt-10 text-xs text-white/60 tf-body">
            Official communication · <a href="mailto:siddhi@techfest.org" className="underline">siddhi@techfest.org</a>
          </div>
        </div>
      </section>
    </div>
  );
}

const KitCard = ({ testId, title, tagline, image, highlights, slug }) => (
  <Link
    to={`/shop/product/${slug}`}
    className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-2xl transition-shadow"
    data-testid={testId}
  >
    <div className="aspect-[16/10] overflow-hidden bg-slate-50">
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" />
    </div>
    <div className="p-5 lg:p-6">
      <div className="tf-script text-2xl text-[#DC2626]">{tagline}</div>
      <div className="tf-h1 text-3xl mt-1 text-[#0A1F44]">{title}</div>
      <ul className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {highlights.map((h) => (
          <li key={h} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-50 border border-slate-200">
            <Cpu className="w-3 h-3 text-[#DC2626]" /> {h}
          </li>
        ))}
      </ul>
      <div className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] uppercase tracking-widest">
        Get the Kit <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </div>
  </Link>
);
