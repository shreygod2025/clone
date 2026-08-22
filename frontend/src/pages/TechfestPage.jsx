import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Flag, Zap, Cpu, Users, MapPin, ShieldCheck,
  ArrowRight, Sparkles, Target, CircleDot, Layers, ChevronDown,
  X, User, GraduationCap, Building2, CheckCircle2, Loader2,
} from 'lucide-react';
import Footer from '../components/Footer';

const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const TECHFEST_LOGO = '/techfest/techfest-iitb-logo.webp';

const SUMO_HERO   = '/techfest/1.webp';
const SUMO_BOX    = '/techfest/2.webp';
const RACER_HERO  = '/techfest/5.webp';
const RACER_TRACK = '/techfest/6.webp';

const TRACKS = [
  {
    key: 'sumo', label: 'RoboSumo', tag: 'Battle · 1v1', icon: CircleDot, color: '#DC2626',
    tagline: 'Push. Grip. Dominate.',
    long: 'RoboSumo turns mechanical design and control programming into a head-to-head duel. Teams build a fully autonomous, wireless bot and send it into the arena to push the opponent clean over the edge. No weapons, no flipping — just raw traction, weight distribution, and sharp control strategy going toe-to-toe.',
    hero: SUMO_HERO,
    stats: [
      { k: 'Arena',     v: '150 cm circular' },
      { k: 'Bot Size',  v: '25 × 25 × 25 cm' },
      { k: 'Max Weight',v: '3 kg' },
      { k: 'Match',     v: '2 min · Knockout' },
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
    key: 'racer', label: 'RoboRacer', tag: 'Race · 1v1', icon: Zap, color: '#1E3A5F',
    tagline: 'Build. Code. Race. Win.',
    long: 'RoboRacer puts drivetrain design and nerve to the test. Teams build RC bots and race them head-to-head down a shared track, from a standing start to the finish line. Whether built for raw top speed or tight control, every bot lives or dies by its traction, steering, and the driver\u2019s reflexes.',
    hero: RACER_HERO,
    stats: [
      { k: 'Track',      v: '10–12 m · 2 lanes' },
      { k: 'Bot Size',   v: '20 × 15 × 15 cm' },
      { k: 'Max Weight', v: '1.5 kg' },
      { k: 'Heat',       v: '2 min · Knockout' },
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
    key: 'ric', label: 'Robotics Innovation Challenge', tag: 'Ideate · Prototype · Pitch', icon: Sparkles, color: '#DC2626',
    tagline: 'Spot a real problem. Build a real solution.',
    long: 'This track steps away from head-to-head combat. Students spot a real-world problem and design an original robotic prototype, automation system, or STEM concept to solve it, then defend it before a judging panel. Two rounds: online submission → direct Grand Finale at IIT Bombay (no regional qualifier).',
    hero: null,
    stats: [
      { k: 'Junior',  v: 'Grades 4–7' },
      { k: 'Senior',  v: 'Grades 8–12' },
      { k: 'Round 1', v: 'Online submission' },
      { k: 'Round 2', v: 'Direct Grand Finale' },
    ],
    rules: [
      'Junior theme: Smart Solutions for Everyday Life (waste, water, safety, plant care, home help, energy).',
      'Senior theme: Robotics & Automation for a Smart, Sustainable Future (agriculture, disaster, health, energy, mobility, environment).',
      'Round 1 submission: 1-page problem write-up, 500-800 word technical abstract, design diagram, 1–3 min demo video.',
      'Round 2 at IIT Bombay: 10 min live demo + 5 min judge Q&A.',
      'Round 1 shortlists; final rankings decided only in Round 2.',
    ],
    rubric: [
      { k: 'Originality & Idea Quality', v: '20%', d: 'How novel and thoughtful is the problem statement and its framing?' },
      { k: 'Technical Design & Engineering', v: '25%', d: 'Soundness of the robotic/automation architecture, component choice and build quality.' },
      { k: 'Working Prototype & Demonstration', v: '25%', d: 'Does it actually work? Live demo reliability and hands-on execution.' },
      { k: 'Real-World Impact & Feasibility', v: '15%', d: 'Scalability, affordability and social/environmental impact of the solution.' },
      { k: 'Presentation & Q&A', v: '15%', d: 'Clarity of pitch, teamwork on stage and defence of design choices.' },
    ],
  },
];

const ROUND_PATHS = [
  {
    key: 'sumo-racer',
    tracks: 'RoboSumo · RoboRacer',
    accent: '#DC2626',
    icon: CircleDot,
    rounds: [
      {
        n: 1, tag: 'Online Submission', dot: '#F59E0B', icon: Layers,
        title: 'Online Registration & Design Submission',
        lead: 'Enter your team on techfest.org and submit a design brief + a 1–3 min bot demo video.',
        bullets: [
          'Register on techfest.org and pick your track (RoboSumo or RoboRacer).',
          'Upload a design write-up, chassis diagram and a 1–3 min bot demo video.',
          'Panels shortlist teams based on originality, engineering rigour and control strategy.',
        ],
      },
      {
        n: 2, tag: 'Regional Qualifier', dot: '#DC2626', icon: MapPin,
        title: 'OLL Regional Qualifier · Live Arena',
        lead: 'Shortlisted teams battle it out city-by-city in a live knockout arena. Winners fast-track to the Grand Finale at IIT Bombay.',
        bullets: [
          'Multi-city qualifiers — Mumbai, Delhi, Bengaluru, Hyderabad, Kolkata, Pune, Chennai, Ahmedabad and more.',
          'Live 1v1 knockout brackets on the OLL arena stage — top teams get the golden ticket.',
          'Certificate of Regional Qualifier awarded to every participating team.',
          'Winners advance directly to the Grand Finale at IIT Bombay · 16–18 Dec 2026.',
        ],
      },
      {
        n: 3, tag: 'Grand Finale · IIT Bombay', dot: '#10B981', icon: Trophy,
        title: 'Grand Finale · IIT Bombay · 16–18 Dec 2026',
        lead: 'Three days on the iconic IIT Bombay campus. Battles. Races. Winners crowned live on the Techfest arena.',
        bullets: [
          'RoboSumo and RoboRacer knockout brackets on Techfest\u2019s live arena stage.',
          'Prize money for the top 3 teams of each track.',
          'Certificate of Finalist Recognition for every finalist.',
          'Networking with STEM pioneers, engineers and Techfest alumni across three days.',
        ],
      },
    ],
  },
  {
    key: 'ric',
    tracks: 'Robotics Innovation Challenge',
    accent: '#10B981',
    icon: Sparkles,
    rounds: [
      {
        n: 1, tag: 'Online Submission', dot: '#F59E0B', icon: Layers,
        title: 'Online Prototype Submission',
        lead: 'Junior (Grades 4–7) or Senior (Grades 8–12). Spot a real-world problem, submit your prototype online.',
        bullets: [
          '1-page problem write-up + 500–800 word technical abstract + design diagram.',
          '1–3 min demo video of your working prototype or simulation.',
          'Judged on originality, engineering rigour and real-world impact.',
        ],
      },
      {
        n: 2, tag: 'Direct Grand Finale', dot: '#10B981', icon: Trophy,
        title: 'Direct Grand Finale · IIT Bombay',
        lead: 'No regionals for this track — shortlisted teams head straight to the flagship stage at IIT Bombay, 16–18 Dec 2026.',
        bullets: [
          '10-min live prototype demo + 5-min judge Q&A on the Techfest stage.',
          'Category winners (Junior & Senior) crowned live at IIT Bombay.',
          'Prize money for top 3 teams · Certificate of Finalist Recognition for every finalist.',
        ],
      },
    ],
  },
];

const FAQS = [
  { q: 'Who can participate?', a: 'RoboSumo and RoboRacer are open to all school students in teams of 3–5. The Robotics Innovation Challenge has Junior (Grades 4–7) and Senior (Grades 8–12) categories.' },
  { q: 'How do I register?', a: 'Click any "Register Now" button on this page and pick one of three flows — Individual (redirects to techfest.org), Educator/Mentor (we\u2019ll get in touch to help you enter your students), or School (we\u2019ll onboard your school for group participation).' },
  { q: 'Is there a registration fee?', a: 'No fee for the online rounds. Regional Qualifier and Grand Finale participation has an entry fee announced closer to the event; the OLL kits are sold separately and are strongly recommended for RoboSumo and RoboRacer.' },
  { q: 'Do I need to buy the OLL kit?', a: 'The OLL Robo Sumo and Robo Racer kits are officially designed for the competition. They give you the exact metal body, motors, wheels, controller and arena/track needed to compete. Innovation Challenge teams may build with any hardware.' },
  { q: 'What are the rounds for each track?', a: 'RoboSumo and RoboRacer follow a 3-round path — R1 online submission, R2 live Regional Qualifier in your city, R3 Grand Finale at IIT Bombay (16–18 Dec 2026). The Robotics Innovation Challenge follows a 2-round path — R1 online prototype submission, R2 Direct Grand Finale at IIT Bombay (no regional qualifier).' },
  { q: 'Which cities host the Regional Qualifiers?', a: 'Regional Qualifiers run across 5 zones — North (Delhi, Chandigarh, Jaipur, Lucknow, Noida), South (Bengaluru, Chennai, Hyderabad, Kochi, Coimbatore), East (Kolkata, Bhubaneswar, Guwahati, Patna, Ranchi), West (Mumbai, Pune, Ahmedabad, Surat, Nagpur) and Central (Bhopal, Indore, Raipur, Bilaspur, Jabalpur). Exact venue dates go live on this page as they open.' },
  { q: 'Can I participate as an individual or do I need a team?', a: 'RoboSumo and RoboRacer must be entered as a team of 3–5 students. The Robotics Innovation Challenge accepts teams of 1–5 (a solo entry is allowed).' },
  { q: 'How is the Innovation Challenge judged?', a: 'A weighted rubric — Originality & Idea Quality (20%), Technical Design & Engineering (25%), Working Prototype & Demonstration (25%), Real-World Impact & Feasibility (15%), Presentation & Q&A (15%). See the full rubric in the Pick your Battle section above.' },
  { q: 'What are the prizes?', a: 'Prize money is awarded to the top three teams of each track. Payouts are made via NEFT after winners submit their bank details in the on-site form, with final payment by May 2027.' },
  { q: 'What do participants receive?', a: 'Every participant with an accepted entry gets a Certificate of Participation. Grand Finale competitors additionally receive a Certificate of Finalist Recognition.' },
  { q: 'Where is the Grand Finale?', a: 'IIT Bombay, 16–18 December 2026 — the flagship Techfest campus edition.' },
  { q: 'What if my school wants to send multiple teams?', a: 'Use the "Register as a School" option and we\u2019ll onboard your institution with a dedicated coordinator, bulk kit pricing and a school-level dashboard to manage all your teams.' },
  { q: 'Are there travel & stay arrangements for the Grand Finale?', a: 'Travel and accommodation are the responsibility of the participating team/school. Techfest publishes on-campus and partner-hotel options closer to the event; OLL will circulate a curated list once available.' },
];

const ZONES = [
  { name: 'North Zone',   accent: '#F59E0B', cities: ['Delhi', 'Chandigarh', 'Jaipur', 'Lucknow', 'Noida'] },
  { name: 'South Zone',   accent: '#10B981', cities: ['Bengaluru', 'Chennai', 'Hyderabad', 'Kochi', 'Coimbatore'] },
  { name: 'East Zone',    accent: '#8B5CF6', cities: ['Kolkata', 'Bhubaneswar', 'Guwahati', 'Patna', 'Ranchi'] },
  { name: 'West Zone',    accent: '#DC2626', cities: ['Mumbai', 'Pune', 'Ahmedabad', 'Surat', 'Nagpur'] },
  { name: 'Central Zone', accent: '#0EA5E9', cities: ['Bhopal', 'Indore', 'Raipur', 'Bilaspur', 'Jabalpur'] },
];

const HERO_VIDEO = '/techfest/hero-video.mp4';
const API_BASE = process.env.REACT_APP_BACKEND_URL || '';

const upsertMeta = (key, value, attr = 'name') => {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.setAttribute('content', value);
};

export default function TechfestPage() {
  const [activeTrack, setActiveTrack] = useState('sumo');
  const [openFaq, setOpenFaq] = useState(0);
  const [registerOpen, setRegisterOpen] = useState(false);
  const kitsRef = useRef(null);

  const track = useMemo(() => TRACKS.find((t) => t.key === activeTrack) || TRACKS[0], [activeTrack]);

  const scrollToKits = (e) => {
    e?.preventDefault?.();
    kitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openRegister = (e) => {
    e?.preventDefault?.();
    setRegisterOpen(true);
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const CANONICAL = 'https://oll.co/techfest';
    const TITLE = 'OLL Robotics Championship · Techfest IIT Bombay 2026 | India\u2019s Biggest School Tech Fest';
    const DESC = 'Compete in RoboSumo, RoboRacer and the Robotics Innovation Challenge at the OLL Robotics Championship, powered by Techfest IIT Bombay 2026. Regional qualifiers across India, Grand Finale at IIT Bombay 16–18 December 2026. Prize money for top 3 teams of each track.';
    document.title = TITLE;
    upsertMeta('description', DESC);
    upsertMeta('keywords', 'OLL Robotics Championship, techfest, IIT Bombay, robotics competition, RoboSumo, RoboRacer, robotics innovation challenge, school robotics competition India, robotics championship India');
    upsertMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', CANONICAL, 'property');
    upsertMeta('og:title', TITLE, 'property');
    upsertMeta('og:description', DESC, 'property');
    upsertMeta('og:image', 'https://oll.co/techfest/1.webp', 'property');
    upsertMeta('og:site_name', 'OLL', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:title', TITLE);
    upsertMeta('twitter:description', DESC);
    upsertMeta('twitter:image', 'https://oll.co/techfest/1.webp');
    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = CANONICAL;

    const schemas = [
      {
        "@context": "https://schema.org", "@type": "Event",
        "name": "OLL Robotics Championship · Techfest IIT Bombay 2026",
        "description": DESC,
        "startDate": "2026-12-16", "endDate": "2026-12-18",
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
        "location": { "@type": "Place", "name": "IIT Bombay", "address": "Powai, Mumbai, Maharashtra 400076" },
        "organizer": { "@type": "Organization", "name": "OLL", "url": "https://oll.co" },
        "url": CANONICAL,
        "offers": { "@type": "Offer", "url": "https://techfest.org", "price": "0", "priceCurrency": "INR", "availability": "https://schema.org/InStock" }
      },
      { "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": FAQS.map((f) => ({ "@type": "Question", "name": f.q, "acceptedAnswer": { "@type": "Answer", "text": f.a } })) },
      { "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/" },
          { "@type": "ListItem", "position": 2, "name": "OLL Robotics Championship", "item": CANONICAL }
        ] }
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
    <div className="tf-page" data-testid="techfest-page">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');

        /* ── Fonts ───────────────────────────────────────────── */
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400; font-style: normal; font-display: swap;
        }

        /* Page-wide gradient — flows behind the sticky nav too */
        .tf-page {
          min-height: 100vh; color: #ffffff; overflow-x: clip;
          font-family: 'Proxima Nova', 'Montserrat', system-ui, sans-serif;
          background:
            radial-gradient(circle at 15% 8%, rgba(220,38,38,0.30), transparent 40%),
            radial-gradient(circle at 85% 30%, rgba(96,165,250,0.22), transparent 50%),
            linear-gradient(180deg, #0A1F44 0%, #1E3A5F 45%, #0A1F44 100%);
          background-attachment: fixed;
        }
        /* Kill browser default body margin above the gradient */
        body:has(.tf-page) { margin: 0; background: #0A1F44; }
        /* iOS + mobile: fixed background is janky/unsupported — fall back to scroll */
        @media (max-width: 820px), (hover: none) and (pointer: coarse) {
          .tf-page { background-attachment: scroll; }
        }

        /* ── Type system ─────────────────────────────────────── */
        .tf-h1 { font-family: 'Zing Rust', 'Bebas Neue', 'Anton', sans-serif; font-weight: 400; letter-spacing: 0.005em; line-height: 0.92; text-transform: uppercase; }
        .tf-section-title { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 300; letter-spacing: -0.005em; line-height: 1.05; text-transform: none; }
        .tf-eyebrow { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.28em; text-transform: uppercase; }
        .tf-body { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 300; }

        /* Content bands (light backgrounds inside the flowing gradient) */
        .tf-band-light { background: rgba(255,255,255,0.98); color: #0A1F44; }
        .tf-band-glass { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.08); }

        /* ── Sticky rounded nav (matches OLL pill) ───────────── */
        .tf-pillnav { position: sticky; top: 12px; z-index: 60; margin: 0 auto; padding: 12px 12px 0; }
        .tf-pillnav-inner {
          max-width: 1220px; margin: 0 auto;
          background: rgba(255,255,255,0.94);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          backdrop-filter: saturate(180%) blur(14px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 20px 44px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px 8px 18px;
        }
        .tf-pillnav-brands { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .tf-pillnav-brands .divider { width: 1px; height: 36px; background: rgba(10,31,68,0.15); }
        .tf-pillnav-brands img { display: block; height: 42px; width: auto; }
        .tf-pillnav-brands img.tf-mark { height: 46px; }
        .tf-pillnav-ctas { display: flex; align-items: center; gap: 8px; }
        .tf-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 999px;
          font-family: 'Proxima Nova', 'Montserrat', sans-serif;
          font-weight: 700; font-size: 0.8rem; letter-spacing: 0.04em; text-transform: uppercase;
          transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          cursor: pointer; text-decoration: none;
        }
        .tf-btn.primary { background: #DC2626; color: #fff; box-shadow: 0 12px 22px rgba(220,38,38,0.35); }
        .tf-btn.primary:hover { background: #B91C1C; transform: translateY(-1px); }
        .tf-btn.ghost-dark { background: transparent; color: #0A1F44; border: 1.5px solid rgba(10,31,68,0.30); }
        .tf-btn.ghost-dark:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
        .tf-btn.ghost-light { background: rgba(255,255,255,0.10); color: #fff; border: 1.5px solid rgba(255,255,255,0.28); }
        .tf-btn.ghost-light:hover { background: rgba(255,255,255,0.20); }
        .tf-btn.solid-white { background: #fff; color: #DC2626; box-shadow: 0 12px 24px rgba(0,0,0,0.28); }
        .tf-btn.tiny { padding: 8px 14px; font-size: 0.7rem; }
        @media (max-width: 640px) {
          .tf-pillnav { top: 8px; padding: 8px 8px 0; }
          .tf-pillnav-inner { padding: 6px 6px 6px 10px; }
          .tf-pillnav-brands { gap: 8px; }
          .tf-pillnav-brands img { height: 28px; }
          .tf-pillnav-brands img.tf-mark { height: 32px; }
          .tf-pillnav-brands .divider { height: 26px; }
          .tf-pillnav-ctas { gap: 6px; }
          .tf-btn { padding: 8px 10px; font-size: 0.65rem; letter-spacing: 0.03em; gap: 4px; }
          .tf-btn .tf-hide-sm { display: none; }
        }
        @media (max-width: 420px) {
          .tf-pillnav-brands { gap: 6px; }
          .tf-pillnav-brands img { height: 24px; }
          .tf-pillnav-brands img.tf-mark { height: 28px; }
          .tf-pillnav-brands .divider { height: 22px; }
          .tf-btn { padding: 7px 9px; font-size: 0.6rem; }
        }

        /* Racing stripe animation */
        @keyframes tf-track-move { 0% { background-position: 0 0; } 100% { background-position: 200% 0; } }

        /* Grain overlay */
        @keyframes tf-grain { 0%,100%{ transform: translate(0,0); } 25%{ transform: translate(-2%,-3%); } 50%{ transform: translate(3%,-1%); } 75%{ transform: translate(-1%,2%); } }
        .tf-grain::before { content:''; position:absolute; inset:-50%; background: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E"); mix-blend-mode: overlay; opacity:.08; pointer-events:none; animation: tf-grain 22s steps(2) infinite; }
      `}</style>

      {/* ── Sticky pill nav (on the gradient) ───────────────── */}
      <nav className="tf-pillnav" aria-label="Techfest primary navigation" data-testid="techfest-pillnav">
        <div className="tf-pillnav-inner">
          <div className="tf-pillnav-brands">
            <Link to="/" data-testid="techfest-nav-oll-logo" aria-label="OLL Home">
              <img src={OLL_LOGO} alt="OLL" />
            </Link>
            <span className="divider" aria-hidden="true" />
            <a href="https://techfest.org" target="_blank" rel="noreferrer" data-testid="techfest-nav-techfest-logo" aria-label="Techfest IIT Bombay">
              <img className="tf-mark" src={TECHFEST_LOGO} alt="Techfest IIT Bombay" />
            </a>
          </div>
          <div className="tf-pillnav-ctas">
            <button onClick={scrollToKits} className="tf-btn ghost-dark" data-testid="techfest-nav-buy-kits">
              <ShieldCheck className="w-3.5 h-3.5" /> <span className="tf-hide-sm">Buy </span>Kits
            </button>
            <button onClick={openRegister} className="tf-btn primary" data-testid="techfest-nav-register">
              <Flag className="w-3.5 h-3.5" /> Register<span className="tf-hide-sm"> Now</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden tf-grain">
        {/* Racing stripe at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-2" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #DC2626 0 40px, #FFFFFF 40px 80px)', animation: 'tf-track-move 12s linear infinite', backgroundSize: '200% 100%' }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24 lg:pt-16 lg:pb-32">
          <div className="grid lg:grid-cols-[1.15fr,1fr] gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full tf-band-glass mb-6" data-testid="techfest-hero-badge">
                <span className="tf-eyebrow text-white/85">OLL × Techfest IIT Bombay</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#DC2626] animate-pulse" />
              </div>
              <h1 className="tf-h1 text-4xl sm:text-6xl md:text-7xl lg:text-[6rem] leading-[0.95] break-words">
                OLL <span className="text-[#FCA5A5]">Robotics</span> Championship
              </h1>
              <p className="tf-body text-base md:text-lg text-white/85 mt-6 max-w-xl leading-relaxed">
                India&apos;s biggest school tech fest. Compete across three flagship robotics tracks at Techfest 2026-27, powered by OLL. Regional qualifiers across India. Grand Finale live at IIT Bombay <strong style={{ fontWeight: 700, color: '#fff' }}>16–18 December 2026</strong>.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button onClick={openRegister} className="tf-btn primary" data-testid="techfest-register-btn">
                  Register Now <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={scrollToKits} className="tf-btn ghost-light" data-testid="techfest-shop-btn">
                  Get the Kits
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-white/70 font-semibold" style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif" }}>
                <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-[#FCA5A5]" /> Prize Money · Top 3 per track</span>
                <span className="inline-flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-[#60A5FA]" /> STEM.org-Aligned Curriculum</span>
                <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-[#FCA5A5]" /> Teams of 3–5</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-40 h-40 rounded-full blur-3xl bg-[#DC2626] opacity-40" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 aspect-video bg-[#0A1F44]" data-testid="techfest-hero-video">
                <video
                  src={HERO_VIDEO}
                  poster={SUMO_HERO}
                  className="w-full h-full object-cover block"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="OLL Robotics Championship highlight reel"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRACK TABS ─────────────────────────────────────── */}
      <section className="relative py-16 lg:py-24 tf-band-light" data-testid="techfest-tracks-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="tf-eyebrow text-[#DC2626]">three tracks · one championship</div>
            <h2 className="tf-section-title text-4xl md:text-5xl lg:text-6xl mt-2">Pick your Battle.</h2>
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
                  className={`tf-btn ${active ? 'primary' : 'ghost-dark'}`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-[1.1fr,1fr] gap-8 items-start" key={track.key}>
            <div className="order-2 lg:order-1">
              <div className="tf-eyebrow text-[#DC2626] flex items-center gap-2">
                <track.icon className="w-4 h-4" /> {track.tag}
              </div>
              <h3 className="tf-h1 text-4xl md:text-5xl mt-2 text-[#0A1F44]">{track.label}.</h3>
              <div className="tf-section-title text-lg md:text-xl text-slate-500 mt-1">{track.tagline}</div>
              <p className="tf-body text-slate-700 mt-5 leading-relaxed">{track.long}</p>

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
                <ul className="space-y-2 tf-body text-sm text-slate-700 leading-relaxed">
                  {track.rules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#DC2626] flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {track.rubric && (
                <div className="mt-8" data-testid={`techfest-rubric-${track.key}`}>
                  <div className="tf-eyebrow text-[#DC2626] mb-3">Judging Rubric · {track.label}</div>
                  <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                    {track.rubric.map((row, i) => (
                      <div key={row.k} className={`grid grid-cols-[1fr,auto] gap-3 items-start px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}>
                        <div className="min-w-0">
                          <div className="tf-body font-bold text-[#0A1F44] text-sm md:text-base" style={{ fontWeight: 700 }}>{row.k}</div>
                          <div className="tf-body text-xs md:text-sm text-slate-600 leading-relaxed mt-0.5">{row.d}</div>
                        </div>
                        <div className="tf-h1 text-2xl md:text-3xl text-[#DC2626] tabular-nums leading-none pt-0.5">{row.v}</div>
                      </div>
                    ))}
                    <div className="grid grid-cols-[1fr,auto] gap-3 items-center px-4 py-3 border-t-2 border-slate-200 bg-slate-50">
                      <div className="tf-eyebrow text-slate-600">Total weightage</div>
                      <div className="tf-h1 text-2xl md:text-3xl text-[#0A1F44]">100%</div>
                    </div>
                  </div>
                  <p className="tf-body text-xs text-slate-500 mt-2">Rubric applied identically in Round 1 (online) and Round 2 (Grand Finale). Final rankings decided only in Round 2 live at IIT Bombay.</p>
                </div>
              )}

              {track.productSlug && (
                <div className="mt-8 flex flex-wrap gap-3">
                  <button onClick={scrollToKits} className="tf-btn primary" data-testid={`techfest-cta-kit-${track.key}`}>
                    Get the Official {track.label} Kit <ArrowRight className="w-4 h-4" />
                  </button>
                  <button onClick={openRegister} className="tf-btn ghost-dark" data-testid={`techfest-track-register-${track.key}`}>
                    Register Now
                  </button>
                </div>
              )}
            </div>

            <div className="order-1 lg:order-2">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-200 bg-slate-50">
                {track.hero ? (
                  <img src={track.hero} alt={`${track.label} kit`} className="w-full block" width={1400} height={790} loading="lazy" />
                ) : (
                  <div className="p-10 lg:p-14" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)' }}>
                    <Sparkles className="w-14 h-14 text-[#FCA5A5]" />
                    <div className="tf-section-title text-2xl text-white mt-4">Real problems.</div>
                    <div className="tf-h1 text-5xl md:text-6xl text-white mt-1">Real Prototypes.</div>
                    <p className="tf-body text-white/80 mt-4 leading-relaxed">
                      Junior &amp; Senior categories · online Round 1 → live prototype demo at IIT Bombay for Round 2 · originality, technical execution and real-world relevance judged live by the Techfest panel.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPETITION ROUNDS (below Pick your Battle) ─────── */}
      <section className="relative py-16 lg:py-24" data-testid="techfest-rounds-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="tf-eyebrow text-[#FCA5A5]">the road to iit bombay</div>
            <h2 className="tf-section-title text-4xl md:text-5xl lg:text-6xl mt-2 text-white">Competition Rounds.</h2>
            <p className="tf-body text-white/75 mt-4 max-w-2xl mx-auto text-base md:text-lg">
              Every team earns their spot on the Grand Finale stage at IIT Bombay, 16–18 December 2026. Follow the path for your track below.
            </p>
          </div>

          <div className="space-y-10">
            {ROUND_PATHS.map((path) => {
              const PathIcon = path.icon;
              return (
                <div key={path.key} data-testid={`techfest-round-path-${path.key}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: path.accent }}>
                      <PathIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="tf-eyebrow" style={{ color: path.accent }}>Track path</div>
                      <div className="tf-h1 text-2xl md:text-3xl text-white leading-tight">{path.tracks}</div>
                    </div>
                  </div>

                  <ol className={`grid gap-5 ${path.rounds.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
                    {path.rounds.map((r) => {
                      const Icon = r.icon;
                      return (
                        <li key={r.n} className="relative rounded-3xl tf-band-glass p-6 md:p-7 backdrop-blur-sm" data-testid={`techfest-round-${path.key}-${r.n}`}>
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: r.dot }}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="tf-eyebrow" style={{ color: r.dot }}>Round {r.n}</div>
                              <div className="tf-h1 text-2xl md:text-3xl text-white mt-1">{r.tag}</div>
                            </div>
                          </div>
                          <div className="mt-4">
                            <div className="tf-section-title text-lg md:text-xl text-white">{r.title}</div>
                            <div className="tf-body text-white/80 mt-2 text-sm md:text-base">{r.lead}</div>
                            <ul className="mt-4 space-y-2 tf-body font-light text-white/85 text-sm">
                              {r.bullets.map((b, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: r.dot }} />
                                  <span>{b}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
          </div>

          {/* Zone × City breakdown — applies to RoboSumo & RoboRacer regional qualifiers */}
          <div className="mt-12" data-testid="techfest-regional-zones">
            <div className="text-center mb-8">
              <div className="tf-eyebrow text-[#FCA5A5]">RoboSumo · RoboRacer · Regional Qualifiers</div>
              <div className="tf-section-title text-2xl md:text-3xl text-white mt-1">5 Zones · 25 Cities across India.</div>
              <p className="tf-body text-white/70 mt-2 text-sm md:text-base max-w-2xl mx-auto">
                Live 1v1 knockout arenas moving city-to-city through 2026. Winners fast-track to the Grand Finale at IIT Bombay. Exact venue dates go live as they open.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {ZONES.map((z) => (
                <div
                  key={z.name}
                  className="rounded-2xl tf-band-glass p-5 backdrop-blur-sm border-l-4"
                  style={{ borderLeftColor: z.accent }}
                  data-testid={`techfest-zone-${z.name.split(' ')[0].toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" style={{ color: z.accent }} />
                    <div className="tf-h1 text-xl md:text-2xl text-white leading-tight">{z.name}</div>
                  </div>
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {z.cities.map((c) => (
                      <li
                        key={c}
                        className="tf-body text-xs md:text-sm text-white/90 px-2.5 py-1 rounded-full border"
                        style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)' }}
                      >
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="text-center mt-6">
              <button onClick={openRegister} className="tf-btn primary" data-testid="techfest-rounds-cta">
                Find Nearest Qualifier <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── OLL KITS ────────────────────────────────────────── */}
      <section ref={kitsRef} id="kits" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24" data-testid="techfest-kits-section">
        <div className="text-center mb-10">
          <div className="tf-eyebrow text-[#FCA5A5]">official gear</div>
          <h2 className="tf-section-title text-4xl md:text-5xl lg:text-6xl mt-2 text-white">The Techfest-Ready Kits.</h2>
          <p className="tf-body text-white/75 mt-3 max-w-2xl mx-auto">
            Every part in the arena has been engineered for the competition rulebook — the OLL Techfest kits ship with the exact metal body, motors, wheels, controllers and arenas you need to compete.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <KitCard testId="techfest-kit-sumo" title="Robo Sumo Kit" tagline="Build. Battle. Win." image={SUMO_BOX}
            highlights={['Full Metal Body', '4 Powerful Motors', 'High-Grip Wheels', 'Wired Controller', 'Sumo Arena Mat (150 × 150 cm)']}
            slug="robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a" />
          <KitCard testId="techfest-kit-racer" title="Robo Racer Car Kit" tagline="Build. Code. Race. Win." image={RACER_TRACK}
            highlights={['Complete RC Chassis', '2 Motors + 4 Wheels', 'Modular Racing Track (240 × 120 cm)', 'Batteries + Switch', 'User Manual & Stickers']}
            slug="robo-racer-kit-specially-made-for-iit-bombay-8bf545dc" />
        </div>
      </section>

      {/* ── PRIZES / CERTS ─────────────────────────────────── */}
      <section className="py-16 lg:py-24" data-testid="techfest-prizes-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-8 lg:p-10 text-white" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #7f1d1d 100%)' }}>
            <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10" />
            <div className="tf-eyebrow text-white/80">Prize Money</div>
            <h2 className="tf-h1 text-4xl md:text-5xl mt-2">Top 3 per Track.</h2>
            <p className="tf-body text-white/85 mt-4 max-w-xl">
              Prize money awarded to the top three teams of each track. Winners submit bank details via the on-site form after the finale; payouts via NEFT by May 2027.
            </p>
          </div>
          <div className="rounded-3xl p-8 lg:p-10 tf-band-glass text-white">
            <ShieldCheck className="w-8 h-8 text-[#FCA5A5]" />
            <div className="tf-eyebrow text-white/70 mt-4">Certificates</div>
            <div className="tf-section-title text-2xl mt-1">Recognition for every team.</div>
            <ul className="mt-4 space-y-2 tf-body text-sm text-white/85">
              <li className="flex items-start gap-2"><Target className="w-4 h-4 text-[#FCA5A5] mt-0.5" /> <span><strong style={{ fontWeight: 700 }}>Certificate of Participation</strong> for every accepted entry.</span></li>
              <li className="flex items-start gap-2"><Trophy className="w-4 h-4 text-[#FCA5A5] mt-0.5" /> <span><strong style={{ fontWeight: 700 }}>Certificate of Finalist Recognition</strong> for Grand Finale competitors.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="tf-band-light py-16 lg:py-24" data-testid="techfest-faq-section">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="tf-eyebrow text-[#DC2626]">need answers?</div>
            <h2 className="tf-section-title text-4xl md:text-5xl lg:text-6xl mt-2">Frequently Asked.</h2>
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
                    <span className="flex-1 tf-body font-bold text-[#0A1F44]" style={{ fontWeight: 700 }}>{f.q}</span>
                  </button>
                  {open && (
                    <div className="px-5 pb-5 pl-12 tf-body text-slate-600 leading-relaxed text-sm">{f.a}</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <section className="relative overflow-hidden text-white tf-grain" style={{ background: 'linear-gradient(135deg, #0A1F44 0%, #DC2626 100%)' }}>
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <div className="tf-eyebrow text-[#FCA5A5]">the arena is ready</div>
          <h2 className="tf-h1 text-5xl md:text-6xl lg:text-7xl mt-2">Are You?</h2>
          <p className="tf-body text-white/85 mt-5 max-w-xl mx-auto">
            Grab the kit, gather your team, register on techfest.org and start the road to IIT Bombay. Regional qualifiers open across India through 2026.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button onClick={openRegister} className="tf-btn solid-white" data-testid="techfest-final-register">
              Register Now <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={scrollToKits} className="tf-btn ghost-light" data-testid="techfest-final-shop">
              Shop the Kits
            </button>
          </div>
          <div className="mt-10 text-xs text-white/60 tf-body">
            Official communication · <a href="mailto:siddhi@techfest.org" className="underline">siddhi@techfest.org</a>
          </div>
        </div>
      </section>

      <RegisterModal open={registerOpen} onClose={() => setRegisterOpen(false)} />
      <Footer />
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
      <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" width={1400} height={880} loading="lazy" />
    </div>
    <div className="p-5 lg:p-6">
      <div className="tf-section-title text-lg text-[#DC2626]" style={{ fontWeight: 300 }}>{tagline}</div>
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


// ─────────────────────────────────────────────────────────────
// Register Modal — 3 flows (Individual / Educator / School)
// ─────────────────────────────────────────────────────────────
const RegisterModal = ({ open, onClose }) => {
  const [flow, setFlow] = useState(null); // null | 'educator' | 'school'
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!open) {
      // Reset on close
      setTimeout(() => { setFlow(null); setDone(false); setError(''); setForm({}); setSubmitting(false); }, 200);
    } else {
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const setField = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

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
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(10,31,68,0.72)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
      data-testid="techfest-register-modal"
    >
      <style>{`
        .tf-reg-input {
          width: 100%; padding: 12px 14px; border-radius: 12px;
          border: 1.5px solid #e2e8f0; background: #ffffff;
          font-family: 'Proxima Nova', 'Montserrat', sans-serif;
          font-size: 0.95rem; color: #0A1F44;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .tf-reg-input:focus { outline: none; border-color: #DC2626; box-shadow: 0 0 0 3px rgba(220,38,38,0.15); }
        .tf-reg-label { font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: #64748b; margin-bottom: 6px; display: block; }
      `}</style>
      <div
        className="relative bg-white w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 z-10"
          aria-label="Close register modal"
          data-testid="techfest-register-close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-6 sm:px-8 pt-8 pb-4">
          <div className="tf-eyebrow text-[#DC2626]" style={{ letterSpacing: '0.24em', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>OLL × Techfest IIT Bombay 2026</div>
          <h3 className="tf-h1 text-3xl sm:text-4xl mt-2 text-[#0A1F44]">Register for the Championship.</h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-8">
          {done ? (
            <div className="py-8 text-center" data-testid="techfest-register-success">
              <div className="w-16 h-16 rounded-full bg-emerald-100 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-600" />
              </div>
              <div className="tf-h1 text-3xl mt-4 text-[#0A1F44]">You&apos;re in.</div>
              <p className="tf-body text-slate-600 mt-2 max-w-md mx-auto">
                Thanks for registering. The OLL team will reach out on your phone and email within 24 hours with the next steps for {flow === 'school' ? 'your school' : 'your team'}.
              </p>
              <button
                onClick={onClose}
                className="mt-6 tf-btn primary"
                style={{ padding: '10px 22px' }}
                data-testid="techfest-register-done-btn"
              >
                Close
              </button>
            </div>
          ) : !flow ? (
            <div className="py-4">
              <p className="tf-body text-slate-600 text-sm sm:text-base mb-6">
                Pick how you&apos;d like to register. Every path leads to the same Grand Finale at IIT Bombay, 16–18 Dec 2026.
              </p>
              <div className="grid gap-3">
                <a
                  href="https://techfest.org"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                  data-testid="techfest-register-option-individual"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0A1F44,#1E3A5F)' }}>
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="tf-h1 text-xl text-[#0A1F44]">Register as an Individual</div>
                    <div className="tf-body text-sm text-slate-600 mt-1">Redirects to techfest.org where you can enter your team and pick your track directly.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                </a>

                <button
                  onClick={() => setFlow('educator')}
                  className="group text-left flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                  data-testid="techfest-register-option-educator"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#DC2626,#7f1d1d)' }}>
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="tf-h1 text-xl text-[#0A1F44]">Register as an Educator / Mentor</div>
                    <div className="tf-body text-sm text-slate-600 mt-1">You&apos;ll be mentoring one or more student teams. We&apos;ll get in touch to help you onboard.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={() => setFlow('school')}
                  className="group text-left flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-[#DC2626] hover:bg-red-50/40 transition-colors"
                  data-testid="techfest-register-option-school"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg,#0EA5E9,#0369a1)' }}>
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="tf-h1 text-xl text-[#0A1F44]">Register as a School</div>
                    <div className="tf-body text-sm text-slate-600 mt-1">Enter your entire institution with a dedicated coordinator, bulk kit pricing and a school-level dashboard.</div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-3 group-hover:text-[#DC2626] group-hover:translate-x-1 transition" />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="py-2" data-testid={`techfest-register-form-${flow}`}>
              <button
                type="button"
                onClick={() => { setFlow(null); setError(''); }}
                className="tf-body text-sm text-slate-500 hover:text-[#DC2626] mb-4 inline-flex items-center gap-1"
              >
                <ArrowRight className="w-3.5 h-3.5 rotate-180" /> Back to options
              </button>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="tf-reg-label">Full Name*</label>
                  <input required minLength={2} className="tf-reg-input" value={form.name || ''} onChange={setField('name')} data-testid="techfest-reg-field-name" />
                </div>
                <div>
                  <label className="tf-reg-label">Email*</label>
                  <input required type="email" className="tf-reg-input" value={form.email || ''} onChange={setField('email')} data-testid="techfest-reg-field-email" />
                </div>
                <div>
                  <label className="tf-reg-label">Phone (WhatsApp)*</label>
                  <input required type="tel" className="tf-reg-input" value={form.phone || ''} onChange={setField('phone')} data-testid="techfest-reg-field-phone" />
                </div>
                <div>
                  <label className="tf-reg-label">City*</label>
                  <input required className="tf-reg-input" value={form.city || ''} onChange={setField('city')} data-testid="techfest-reg-field-city" />
                </div>

                {flow === 'educator' ? (
                  <>
                    <div>
                      <label className="tf-reg-label">School / Institute you mentor</label>
                      <input className="tf-reg-input" value={form.school_or_institute || ''} onChange={setField('school_or_institute')} data-testid="techfest-reg-field-school-or-institute" />
                    </div>
                    <div>
                      <label className="tf-reg-label">Grade you teach</label>
                      <select className="tf-reg-input" value={form.grade_taught || ''} onChange={setField('grade_taught')} data-testid="techfest-reg-field-grade">
                        <option value="">Select</option>
                        <option>Grades 4–7 (Junior)</option>
                        <option>Grades 8–12 (Senior)</option>
                        <option>Both</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="tf-reg-label">Years of mentoring experience</label>
                      <select className="tf-reg-input" value={form.experience || ''} onChange={setField('experience')} data-testid="techfest-reg-field-experience">
                        <option value="">Select</option>
                        <option>0–1 years</option>
                        <option>2–4 years</option>
                        <option>5+ years</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="tf-reg-label">School Name*</label>
                      <input required className="tf-reg-input" value={form.school_name || ''} onChange={setField('school_name')} data-testid="techfest-reg-field-school-name" />
                    </div>
                    <div>
                      <label className="tf-reg-label">Your Role / Designation*</label>
                      <input required className="tf-reg-input" placeholder="e.g. Principal, Coordinator" value={form.role_designation || ''} onChange={setField('role_designation')} data-testid="techfest-reg-field-role" />
                    </div>
                    <div>
                      <label className="tf-reg-label">Number of Students likely to participate</label>
                      <select className="tf-reg-input" value={form.student_count || ''} onChange={setField('student_count')} data-testid="techfest-reg-field-student-count">
                        <option value="">Select</option>
                        <option>1–20</option>
                        <option>21–50</option>
                        <option>51–100</option>
                        <option>100+</option>
                      </select>
                    </div>
                    <div>
                      <label className="tf-reg-label">Tracks of interest</label>
                      <select className="tf-reg-input" value={(form.tracks || [])[0] || ''} onChange={(e) => setForm((f) => ({ ...f, tracks: e.target.value ? [e.target.value] : [] }))} data-testid="techfest-reg-field-tracks">
                        <option value="">Select</option>
                        <option>RoboSumo</option>
                        <option>RoboRacer</option>
                        <option>Robotics Innovation Challenge</option>
                        <option>All three tracks</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="sm:col-span-2">
                  <label className="tf-reg-label">Anything else you&apos;d like us to know?</label>
                  <textarea className="tf-reg-input" rows={3} value={form.message || ''} onChange={setField('message')} data-testid="techfest-reg-field-message" />
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2" data-testid="techfest-register-error">{error}</div>
              )}

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="tf-btn primary disabled:opacity-70"
                  style={{ padding: '12px 26px' }}
                  data-testid="techfest-register-submit"
                >
                  {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</> : <>Submit Registration <ArrowRight className="w-4 h-4" /></>}
                </button>
                <span className="tf-body text-xs text-slate-500">By submitting, you agree to be contacted by the OLL team about the Championship.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
