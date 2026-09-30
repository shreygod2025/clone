import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Trophy, Flag, Zap, Cpu, Users, MapPin, ShieldCheck,
  ArrowRight, Sparkles, Target, CircleDot, Layers, ChevronDown, Play, Upload,
} from 'lucide-react';
import Footer from '../components/Footer';

/**
 * Click-to-play YouTube embed. Renders a thumbnail with a red play button until
 * the user clicks, then swaps in the actual iframe (keeps the initial page-load
 * lightweight and avoids showing the ugly "Video unavailable" state before interaction).
 */
function TfVideoEmbed({ videoId, title, testid, className = '', aspect = '56.25%' }) {
  const [playing, setPlaying] = useState(false);
  if (!videoId) return null;
  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-xl ${className}`}
      style={{ paddingTop: aspect }}
      data-testid={testid}
    >
      {playing ? (
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={title || 'IIT Bombay Techfest video'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 group cursor-pointer"
          aria-label={`Play ${title || 'video'}`}
        >
          <img
            src={`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`}
            onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`; }}
            alt={title || 'Video preview'}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-2xl transition-transform duration-300 group-hover:scale-110">
              <Play className="w-7 h-7 sm:w-9 sm:h-9 text-[#DC2626] ml-1" fill="#DC2626" />
            </div>
          </div>
        </button>
      )}
    </div>
  );
}

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
    videoId: 'D5ngdbvLMC4',
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
      'A 2-minute grace period is allowed to fix a non-functional bot.',
    ],
    productSlug: 'robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a',
  },
  {
    key: 'racer', label: 'RoboRacer', tag: 'Race · 1v1', icon: Zap, color: '#1E3A5F',
    tagline: 'Build. Code. Race. Win.',
    videoId: '5Egq4njczf4',
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
    videoId: 'Px1kNkio0oY',
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
          'Winners advance directly to the Grand Finale at IIT Bombay · 17 Dec 2026.',
        ],
      },
      {
        n: 3, tag: 'Grand Finale · IIT Bombay', dot: '#10B981', icon: Trophy,
        title: 'Grand Finale · IIT Bombay · 17 Dec 2026',
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
        lead: 'No regionals for this track — shortlisted teams head straight to the flagship stage at IIT Bombay, 17 Dec 2026.',
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
  { q: 'How do I register?', a: 'Click any "Register Now" button on this page and pick one of three flows — Individual (redirects to techfest.org/competitions/oll), Educator/Mentor (we\u2019ll get in touch to help you enter your students), or School (we\u2019ll onboard your school for group participation).' },
  { q: 'Is there a registration fee?', a: 'No. The OLL Robotics Championship is completely FREE across all rounds — Online submission, Regional Qualifier and the Grand Finale at IIT Bombay. Only the official OLL kits (for RoboSumo & RoboRacer) are sold separately and are strongly recommended for those tracks.' },
  { q: 'Can I participate in more than one competition/track?', a: 'No. A student can pick only one competition from RoboSumo, RoboRacer or the Robotics Innovation Challenge. Choose the track that best matches your interest and register for that one only.' },
  { q: 'Do I need to buy the OLL kit?', a: 'The OLL Robo Sumo and Robo Racer kits are officially designed for the competition. They give you the exact metal body, motors, wheels, controller and arena/track needed to compete. Innovation Challenge teams may build with any hardware.' },
  { q: 'What are the rounds for each track?', a: 'RoboSumo and RoboRacer follow a 3-round path — R1 online submission, R2 live Regional Qualifier in your city (East · IIT Kanpur · 24 Oct · South · RVU College Bangalore · 26 Nov · West · IIT Bombay · 17 Dec · North & Central dates TBA), R3 Grand Finale at IIT Bombay (17 Dec 2026). The Robotics Innovation Challenge follows a 2-round path — R1 online prototype submission, R2 Direct Grand Finale at IIT Bombay (no regional qualifier).' },
  { q: 'Which cities host the Regional Qualifiers?', a: 'Regional Qualifiers run across 5 zones — West: IIT Bombay (17 Dec) · East: IIT Kanpur (24 Oct) · South: RVU College, Bangalore (26 Nov) · North: Delhi (dates TBA) · Central: Indore (dates TBA).' },
  { q: 'Can I participate as an individual or do I need a team?', a: 'RoboSumo and RoboRacer must be entered as a team of 3–5 students. The Robotics Innovation Challenge accepts teams of 1–5 (a solo entry is allowed).' },
  { q: 'How is the Innovation Challenge judged?', a: 'A weighted rubric — Originality & Idea Quality (20%), Technical Design & Engineering (25%), Working Prototype & Demonstration (25%), Real-World Impact & Feasibility (15%), Presentation & Q&A (15%). See the full rubric in the Pick your Battle section above.' },
  { q: 'What are the prizes?', a: 'A prize pool of upto ₹1,50,000 is awarded across the top three teams of each track. Payouts are made via NEFT after winners submit their bank details in the on-site form, with final payment by May 2027.' },
  { q: 'What do participants receive?', a: 'Every participant with an accepted entry gets a Certificate of Participation. Grand Finale competitors additionally receive a Certificate of Finalist Recognition.' },
  { q: 'Where is the Grand Finale?', a: 'IIT Bombay, 17 December 2026 — the flagship Techfest campus edition.' },
  { q: 'What if my school wants to send multiple teams?', a: 'Use the "Register as a School" option and we\u2019ll onboard your institution with a dedicated coordinator, bulk kit pricing and a school-level dashboard to manage all your teams.' },
  { q: 'Are there travel & stay arrangements for the Grand Finale?', a: 'Travel and accommodation are the responsibility of the participating team/school. Techfest publishes on-campus and partner-hotel options closer to the event; OLL will circulate a curated list once available.' },
];

const ZONES = [
  { name: 'West Zone',    accent: '#DC2626', cities: ['Mumbai'],    venue: 'IIT Bombay',            date: '17 Dec 2026' },
  { name: 'East Zone',    accent: '#8B5CF6', cities: ['Kanpur'],    venue: 'IIT Kanpur',            date: '24 Oct 2026' },
  { name: 'North Zone',   accent: '#F59E0B', cities: ['Delhi'],     venue: 'Venue TBA',             date: 'Date TBA'    },
  { name: 'South Zone',   accent: '#10B981', cities: ['Bangalore'], venue: 'RVU College, Bangalore', date: '26 Nov 2026' },
  { name: 'Central Zone', accent: '#0EA5E9', cities: ['Indore'],    venue: 'Venue TBA',             date: 'Date TBA'    },
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
  const kitsRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refSlug = searchParams.get('ref') || '';

  const track = useMemo(() => TRACKS.find((t) => t.key === activeTrack) || TRACKS[0], [activeTrack]);

  const scrollToKits = (e) => {
    e?.preventDefault?.();
    kitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openRegister = (e) => {
    e?.preventDefault?.();
    navigate(refSlug ? `/techfest/register?ref=${encodeURIComponent(refSlug)}` : '/techfest/register');
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    const CANONICAL = 'https://oll.co/techfest';
    const TITLE = 'OLL Robotics Championship · Techfest IIT Bombay 2026 | India\u2019s Biggest School Tech Fest';
    const DESC = 'Compete in RoboSumo, RoboRacer and the Robotics Innovation Challenge at the OLL Robotics Championship, powered by Techfest IIT Bombay 2026. Regional qualifiers across India, Grand Finale at IIT Bombay 17 December 2026. Prize money for top 3 teams of each track.';
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
        "startDate": "2026-12-17", "endDate": "2026-12-17",
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
            <button
              onClick={() => navigate('/techfest/submit')}
              className="tf-btn ghost-dark"
              data-testid="techfest-nav-submit"
            >
              <Upload className="w-3.5 h-3.5" /> Submit<span className="tf-hide-sm"> Project</span>
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
              <h1 className="tf-h1 text-[3.25rem] sm:text-6xl md:text-7xl lg:text-[6rem] leading-[0.95] break-words">
                OLL <span className="text-[#FCA5A5]">Robotics</span> Championship
              </h1>
              <p className="tf-body text-base md:text-lg text-white/85 mt-6 max-w-xl leading-relaxed">
                India&apos;s biggest school tech fest. Compete across three flagship robotics tracks at Techfest 2026-27, powered by OLL. Regional qualifiers across India. Grand Finale live at IIT Bombay <strong style={{ fontWeight: 700, color: '#fff' }}>17 December 2026</strong>.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button onClick={openRegister} className="tf-btn primary" data-testid="techfest-register-btn">
                  Register Now <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/techfest/submit')}
                  className="tf-btn ghost-light"
                  data-testid="techfest-submit-project-btn"
                >
                  <Upload className="w-4 h-4" /> Submit Project
                </button>
                <button onClick={scrollToKits} className="tf-btn ghost-light" data-testid="techfest-shop-btn">
                  Get the Kits
                </button>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-6 text-xs text-white/70 font-semibold" style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif" }}>
                <span className="inline-flex items-center gap-1.5"><Trophy className="w-4 h-4 text-[#FCA5A5]" /> Prize Money upto ₹1,50,000</span>
                <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4 text-[#FCA5A5]" /> Teams of 3–5</span>
              </div>
            </div>
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-40 h-40 rounded-full blur-3xl bg-[#DC2626] opacity-40" />
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-2 border-white/10 aspect-video bg-[#0A1F44]" data-testid="techfest-hero-video">
                <HeroSumoAnimation />
                <video
                  src={HERO_VIDEO}
                  className="absolute inset-0 w-full h-full object-cover block opacity-0 transition-opacity duration-500"
                  onPlaying={(e) => { e.currentTarget.style.opacity = '1'; }}
                  onCanPlay={(e) => { e.currentTarget.style.opacity = '1'; }}
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

          {/* Big vertically-expanded track headers instead of pills */}
          <div className="grid gap-3 md:grid-cols-3 mb-10" data-testid="techfest-track-tabs">
            {TRACKS.map((t) => {
              const active = t.key === activeTrack;
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTrack(t.key)}
                  data-testid={`techfest-tab-${t.key}`}
                  aria-pressed={active}
                  className="group text-left rounded-3xl overflow-hidden border-2 transition-all"
                  style={{
                    background: active
                      ? 'linear-gradient(135deg, #DC2626 0%, #7f1d1d 100%)'
                      : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                    color: active ? '#ffffff' : '#0A1F44',
                    borderColor: active ? '#DC2626' : '#e2e8f0',
                    boxShadow: active
                      ? '0 20px 40px rgba(220,38,38,0.35), 0 4px 10px rgba(0,0,0,0.12)'
                      : '0 6px 14px rgba(15,23,42,0.06)',
                    padding: '22px 22px 26px',
                    minHeight: '150px',
                    transform: active ? 'translateY(-4px)' : 'none',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: active ? 'rgba(255,255,255,0.18)' : 'rgba(220,38,38,0.10)' }}
                    >
                      <Icon className="w-5 h-5" style={{ color: active ? '#ffffff' : '#DC2626' }} />
                    </div>
                    <span
                      className="tf-eyebrow"
                      style={{ color: active ? 'rgba(255,255,255,0.75)' : '#94a3b8', fontSize: '0.6rem' }}
                    >
                      Track {TRACKS.indexOf(t) + 1} / {TRACKS.length}
                    </span>
                  </div>
                  <div
                    className="tf-h1 mt-5 text-2xl sm:text-3xl lg:text-[1.85rem] leading-[0.98]"
                    style={{ color: active ? '#ffffff' : '#0A1F44' }}
                  >
                    {t.label}
                  </div>
                  <div
                    className="tf-section-title mt-1 text-xs sm:text-sm"
                    style={{ color: active ? 'rgba(255,255,255,0.85)' : '#64748b', textTransform: 'none', letterSpacing: '0' }}
                  >
                    {t.tag}
                  </div>
                  <div
                    className="mt-4 inline-flex items-center gap-1 text-[0.7rem] font-bold uppercase tracking-widest"
                    style={{ color: active ? '#ffffff' : '#DC2626' }}
                  >
                    {active ? 'Selected' : 'View details'}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Track detail — full width, no kit image column */}
          <div key={track.key} className="max-w-4xl mx-auto" data-testid={`techfest-track-detail-${track.key}`}>
            <div className="tf-eyebrow text-[#DC2626] flex items-center gap-2">
              <track.icon className="w-4 h-4" /> {track.tag}
            </div>
            <h3 className="tf-h1 text-4xl md:text-5xl mt-2 text-[#0A1F44]">{track.label}.</h3>
            <div className="tf-section-title text-lg md:text-xl text-slate-500 mt-1">{track.tagline}</div>
            <p className="tf-body text-slate-700 mt-5 leading-relaxed">{track.long}</p>

            {track.videoId && (
              <div className="mt-6">
                <TfVideoEmbed
                  videoId={track.videoId}
                  title={`${track.label} — IIT Bombay Techfest highlight video`}
                  testid={`techfest-track-video-${track.key}`}
                />
              </div>
            )}

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
              {track.stats.map((s) => (
                <div key={s.k} className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="tf-eyebrow text-slate-500">{s.k}</div>
                  <div className="tf-h1 text-xl md:text-2xl mt-1 text-[#0A1F44]">{s.v}</div>
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
              <a
                href="/techfest/problem-statement.pdf"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[#DC2626] hover:text-[#7f1d1d]"
                data-testid={`techfest-problem-statement-${track.key}`}
              >
                Read the full Problem Statement <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <p className="tf-body text-[11px] text-slate-500 mt-1">Detailed rules, bot spec, submission format &amp; judging criteria — IIT Bombay OLL Championship 2026-27 PDF.</p>
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

            {track.productSlug ? (
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={scrollToKits} className="tf-btn primary" data-testid={`techfest-cta-kit-${track.key}`}>
                  Get the Official {track.label} Kit <ArrowRight className="w-4 h-4" />
                </button>
                {track.key === 'sumo' && (
                  <Link
                    to="/blogs/how-to-build-robosumo-robot-iit-bombay-techfest"
                    className="tf-btn ghost-dark"
                    data-testid={`techfest-cta-build-guide-${track.key}`}
                  >
                    <Cpu className="w-4 h-4" /> Build Guide
                  </Link>
                )}
                <button onClick={openRegister} className="tf-btn ghost-dark" data-testid={`techfest-track-register-${track.key}`}>
                  Register Now
                </button>
              </div>
            ) : (
              <div className="mt-8 flex flex-wrap gap-3">
                <button onClick={openRegister} className="tf-btn primary" data-testid={`techfest-track-register-${track.key}`}>
                  Register Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
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
              Every team earns their spot on the Grand Finale stage at IIT Bombay, 17 December 2026. Follow the path for your track below.
            </p>
          </div>

          {/* Full-width intro video showing what the finale looks like */}
          <div className="max-w-3xl mx-auto mb-12">
            <TfVideoEmbed
              videoId="M1Ids29kHRs"
              title="OLL Robotics Championship · IIT Bombay Techfest — Competition Rounds highlight"
              testid="techfest-rounds-video"
            />
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
                            {path.key === 'sumo-racer' && r.n === 2 && (
                              <div className="mt-5 rounded-2xl border border-white/15 overflow-hidden" data-testid="techfest-r2-zone-table">
                                <div className="grid grid-cols-[90px,1fr,1fr] text-[11px] uppercase tracking-widest text-white/60 bg-white/[0.04] px-4 py-2 font-bold">
                                  <div>Zone</div>
                                  <div>Venue</div>
                                  <div className="text-right">Date</div>
                                </div>
                                {ZONES.map((z, i) => (
                                  <div
                                    key={z.name}
                                    className={`grid grid-cols-[90px,1fr,1fr] items-center px-4 py-2.5 tf-body text-sm ${i > 0 ? 'border-t border-white/10' : ''}`}
                                  >
                                    <div className="flex items-center gap-2 text-white font-bold" style={{ fontWeight: 700 }}>
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: z.accent }} />
                                      {z.name.replace(' Zone', '')}
                                    </div>
                                    <div className="text-white/90">{z.venue}</div>
                                    <div className="text-white/90 text-right font-semibold">{z.date}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })}
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
            slug="robo-sumo-kit-specially-for-techfest-iit-bombay-22b5228a"
            buildGuideHref="/blogs/how-to-build-robosumo-robot-iit-bombay-techfest" />
          <KitCard testId="techfest-kit-racer" title="Robo Racer Car Kit" tagline="Build. Code. Race. Win." image={RACER_TRACK}
            highlights={['Complete RC Chassis', '2 Motors + 4 Wheels', 'Modular Racing Track (240 × 120 cm)', 'Batteries + Switch', 'User Manual & Stickers']}
            slug="robo-racer-kit-specially-made-for-iit-bombay-8bf545dc" />
        </div>
      </section>

      {/* ── PRIZES / CERTS ─────────────────────────────────── */}
      <section className="py-16 lg:py-24" data-testid="techfest-prizes-section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <div className="tf-eyebrow text-[#FCA5A5]">what winners take home</div>
            <h2 className="tf-section-title text-4xl md:text-5xl lg:text-6xl mt-2 text-white">Prizes &amp; Certificates.</h2>
            <p className="tf-body text-white/75 mt-3 max-w-2xl mx-auto">
              A ₹1,50,000 prize pool, certificates for every participant and a spot on the biggest robotics stage in India.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 relative overflow-hidden rounded-3xl p-8 lg:p-10 text-white" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #7f1d1d 100%)' }}>
            <Trophy className="absolute -right-6 -bottom-6 w-40 h-40 text-white/10" />
            <div className="tf-eyebrow text-white/80">Prize Money</div>
            <h2 className="tf-h1 text-4xl md:text-5xl mt-2">Upto ₹1,50,000.</h2>
            <p className="tf-body text-white/85 mt-4 max-w-xl">
              Prize pool of upto ₹1,50,000 awarded across the top three teams of each track. Winners submit bank details via the on-site form after the finale; payouts via NEFT by May 2027.
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
            <Link
              to="/blogs/how-to-build-robosumo-robot-iit-bombay-techfest"
              className="tf-btn ghost-light"
              data-testid="techfest-final-build-guide"
            >
              How to Make a RoboSumo Robot <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-10 text-xs text-white/60 tf-body">
            Official communication · <a href="mailto:siddhi@techfest.org" className="underline">siddhi@techfest.org</a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

const KitCard = ({ testId, title, tagline, image, highlights, slug, buildGuideHref }) => (
  <div className="group relative rounded-3xl overflow-hidden bg-white border border-slate-200 shadow-lg hover:shadow-2xl transition-shadow" data-testid={testId}>
    <Link to={`/shop/product/${slug}`} className="block">
      <div className="aspect-[16/10] overflow-hidden bg-slate-50">
        <img src={image} alt={title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" width={1400} height={880} loading="lazy" />
      </div>
    </Link>
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
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
        <Link
          to={`/shop/product/${slug}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-[#DC2626] uppercase tracking-widest hover:gap-3 transition-all"
          data-testid={`${testId}-get`}
        >
          Get the Kit <ArrowRight className="w-4 h-4" />
        </Link>
        {buildGuideHref && (
          <Link
            to={buildGuideHref}
            className="inline-flex items-center gap-2 text-sm font-bold text-[#0A1F44] uppercase tracking-widest hover:text-[#DC2626] transition-colors"
            data-testid={`${testId}-build-guide`}
          >
            <Cpu className="w-4 h-4" /> Build Guide
          </Link>
        )}
      </div>
    </div>
  </div>
);




// CSS-only Sumo-bot loading animation shown until the hero video buffers ─
const HeroSumoAnimation = () => (
  <div className="absolute inset-0 flex items-center justify-center overflow-hidden" data-testid="techfest-hero-loader" aria-hidden="true">
    <style>{`
      @keyframes tf-bot-charge-left  { 0%,100% { transform: translateX(-38%) rotate(-2deg); } 50% { transform: translateX(-8%) rotate(2deg); } }
      @keyframes tf-bot-charge-right { 0%,100% { transform: translateX(38%) rotate(2deg) scaleX(-1); } 50% { transform: translateX(8%) rotate(-2deg) scaleX(-1); } }
      @keyframes tf-spark-pulse { 0%,100% { transform: scale(0.6); opacity: 0.35; } 50% { transform: scale(1.15); opacity: 1; } }
      @keyframes tf-dust { 0% { transform: translateY(0) scale(1); opacity: 0.55; } 100% { transform: translateY(-14px) scale(1.6); opacity: 0; } }
      @keyframes tf-arena-pulse { 0%,100% { box-shadow: inset 0 0 60px rgba(220,38,38,0.55); } 50% { box-shadow: inset 0 0 100px rgba(220,38,38,0.85); } }
      .tf-arena { position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 62%, #1E3A5F 0%, #0A1F44 60%); animation: tf-arena-pulse 1.6s ease-in-out infinite; }
      .tf-arena::before { content:""; position:absolute; inset: 16% 8%; border-radius: 999px; border: 2px dashed rgba(255,255,255,0.15); }
      .tf-bot { position: absolute; bottom: 22%; width: 26%; max-width: 210px; aspect-ratio: 1.4/1; will-change: transform; }
      .tf-bot.left  { left: 24%; animation: tf-bot-charge-left 1.4s cubic-bezier(.6,.05,.4,.95) infinite; }
      .tf-bot.right { right: 24%; animation: tf-bot-charge-right 1.4s cubic-bezier(.6,.05,.4,.95) infinite; }
      .tf-bot .body { position:absolute; inset:14% 6% 22% 6%; background: linear-gradient(180deg,#e2e8f0 0%,#94a3b8 60%,#475569 100%); border-radius: 10px 10px 4px 4px; box-shadow: inset 0 -6px 0 rgba(0,0,0,0.25), 0 6px 14px rgba(0,0,0,0.35); }
      .tf-bot .plow { position:absolute; right:-4%; top:34%; width: 30%; height: 42%; background: linear-gradient(135deg,#DC2626,#7f1d1d); clip-path: polygon(0 0, 100% 42%, 100% 58%, 0 100%); box-shadow: 0 4px 10px rgba(220,38,38,0.55); }
      .tf-bot .eye { position:absolute; top: 26%; left: 22%; width: 14%; height: 14%; border-radius: 50%; background: #FCA5A5; box-shadow: 0 0 12px #DC2626; }
      .tf-bot .eye.two { left: 60%; }
      .tf-bot .track { position:absolute; bottom: 6%; left: 4%; right: 4%; height: 20%; background: repeating-linear-gradient(90deg, #1f2937 0 8px, #0f172a 8px 12px); border-radius: 6px; }
      .tf-spark { position:absolute; left: 50%; bottom: 34%; transform: translateX(-50%); width: 30%; height: 30%; }
      .tf-spark svg { width: 100%; height: 100%; animation: tf-spark-pulse 0.6s ease-in-out infinite; filter: drop-shadow(0 0 12px #F59E0B); }
      .tf-dust { position:absolute; bottom: 22%; width: 6px; height: 6px; border-radius: 50%; background: rgba(255,255,255,0.4); animation: tf-dust 0.7s ease-out infinite; }
      .tf-loader-cap { position:absolute; left:0; right:0; bottom: 4%; text-align: center; font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 800; letter-spacing: 0.35em; text-transform: uppercase; color: rgba(255,255,255,0.7); font-size: 0.65rem; }
      .tf-loader-cap .dots::after { content: "..."; animation: tf-dots 1.4s steps(4,end) infinite; }
      @keyframes tf-dots { 0%,20% { content:"."; } 40% { content:".."; } 60%,100% { content:"..."; } }
    `}</style>
    <div className="tf-arena" />
    <div className="tf-bot left">
      <div className="body">
        <div className="eye" />
        <div className="eye two" />
      </div>
      <div className="plow" />
      <div className="track" />
    </div>
    <div className="tf-bot right">
      <div className="body">
        <div className="eye" />
        <div className="eye two" />
      </div>
      <div className="plow" />
      <div className="track" />
    </div>
    <div className="tf-spark">
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <polygon points="50,4 60,38 96,42 68,62 78,96 50,76 22,96 32,62 4,42 40,38" fill="#F59E0B" />
        <polygon points="50,18 57,42 78,45 60,58 66,80 50,68 34,80 40,58 22,45 43,42" fill="#FCD34D" />
      </svg>
    </div>
    <span className="tf-dust" style={{ left: '30%', animationDelay: '0s' }} />
    <span className="tf-dust" style={{ left: '38%', animationDelay: '0.2s' }} />
    <span className="tf-dust" style={{ left: '58%', animationDelay: '0.1s' }} />
    <span className="tf-dust" style={{ left: '66%', animationDelay: '0.3s' }} />
    <div className="tf-loader-cap"><span className="dots">Loading championship reel</span></div>
  </div>
);
