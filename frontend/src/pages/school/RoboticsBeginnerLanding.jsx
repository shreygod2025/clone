/**
 * OLL Robotics Beginner — Full-page Future-Skills pitch for schools.
 * Structure (per brief):
 *   1)  Hero — "Turn your school into a Future-Skills powerhouse" + winner-student slider
 *   2)  IIT Bombay Techfest — "Put your school on the big stage"
 *   3)  STEM.org Certification — "Recognition that goes beyond the classroom"
 *   4)  Parents Satisfaction — build → demonstrate → watch → photograph → share
 *   5)  Future Skills bouquet — horizontal slider of 9 disciplines
 *   6)  What the school gets — features grid
 *   7)  What your school gets — 3 pillars
 *   8)  About OLL — Shark Tank / KBC + trust stats (4.8/5 · 98% renewal · 500+ schools)
 *   9)  Growth path — Foundation → Intermediate → Advanced
 *   10) Final CTA — Book a School Demo (→ /school SchoolFunnel flow)
 *
 * Design: Anton headlines, Libre Baskerville quotes, Caveat accents, Inter body.
 * Palette: navy #0A1F44, red #DC2626, light blue #60A5FA. Red/blue/light-blue
 * blur orbs and glass panels throughout, matching OLL Brand Guidelines PDF.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Phone, Download, ChevronLeft, ChevronRight, Trophy,
  School, GraduationCap, MapPin, Cpu, Code2, Brain, Boxes, Lightbulb,
  FlaskConical, Rocket, Plane, Radio, BookOpen, Package, ClipboardCheck,
  Award, LifeBuoy, Heart, Sparkles, PlayCircle, Quote, Star, CheckCircle2,
  Camera, Share2, Eye, Hammer, Users, Cog, Zap, TerminalSquare, Wifi,
  Calculator, Palette,
} from 'lucide-react';

const CURRICULUM_PDF =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/qorbag8g_OLL%20-%20Beginner%20Curriculum%202026-27%20%282%29.pdf';

const ROBOTICS_GIF =
  'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif';

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const TECHFEST_LOGO =
  'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/cj9em2vn_image.png';

const OLL_LOGO_WHITE =
  'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';

const KBC_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';

const SKILLS_LIST = 'Robotics • Coding • AI • 3D Design • STEM • Space • Drones';

const WINNERS = [
  { name: 'Aarav Mehta',       grade: 7, ach: 'National Robotics Challenge 2026', school: 'XYZ International School',   initials: 'XYZ', color: '#DC2626' },
  { name: 'Diya Kapoor',       grade: 6, ach: 'IIT Bombay Techfest — 1st Place',   school: 'D. G. Khetan International', initials: 'DGK', color: '#1E3A8A' },
  { name: 'Vihaan Sharma',     grade: 8, ach: 'STEM Innovator Award 2026',        school: 'Ryan International',         initials: 'RIS', color: '#60A5FA' },
  { name: 'Ananya Iyer',       grade: 5, ach: 'Junior Maker Championship',        school: 'Bombay Scottish',            initials: 'BSS', color: '#DC2626' },
  { name: 'Kabir Rao',         grade: 7, ach: 'Robo-Race Nationals — Finalist',   school: 'Podar International',        initials: 'PDR', color: '#1E3A8A' },
];

const SKILLS = [
  { l: 'Robotics',         src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif' },
  { l: 'Coding',           src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/8i8zob06_Pyhton%20.gif' },
  { l: 'AI',               src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/je1umfoj_AI%20TOOl.gif' },
  { l: '3D Design',        src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/xj8dva2y_3D%20Design.gif' },
  { l: 'Design Thinking',  src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=800&fit=crop' },
  { l: 'DIY Science',      src: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=600&h=800&fit=crop' },
  { l: 'Space Technology', src: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=800&fit=crop' },
  { l: 'Aeromodelling',    src: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&h=800&fit=crop' },
  { l: 'Drones',           src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&h=800&fit=crop' },
];

const SCHOOL_GETS = [
  { i: BookOpen,        t: 'Structured Curriculum',       s: 'Grade-wise progression designed for beginner learners.' },
  { i: Package,         t: 'Hands-on Kits',               s: 'Students learn by building, experimenting and creating.' },
  { i: BookOpen,        t: 'Interactive Books',           s: 'Engaging student books mapped to every lesson.' },
  { i: Hammer,          t: 'Easy-to-Teach Program',       s: 'Structured to make classroom implementation simple.' },
  { i: ClipboardCheck,  t: 'Assessment & Certification',  s: 'Track practical & conceptual learning. Certify every child.' },
  { i: Trophy,          t: 'Showcase Opportunities',      s: 'Exhibitions and competitions to demonstrate what they built.' },
  { i: LifeBuoy,        t: 'Service & Support',           s: 'Onboarding, refreshers and a dedicated success partner.' },
];

const PILLARS = [
  { i: Rocket,  t: 'A Future-Ready Identity', s: 'Become known as a modern school preparing students for tomorrow.', color: '#DC2626' },
  { i: Trophy,  t: 'A Culture of Achievement', s: 'Give students pathways to projects, competitions and recognition.', color: '#1E3A8A' },
  { i: Heart,   t: 'Prouder Parents',          s: 'Give families something tangible to see, experience and celebrate.', color: '#60A5FA' },
];

const BOOKS = [
  { grade: 'Grade 1', theme: 'Be a Creator',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9qs738wd_A3%20Book%20Chart.png',       spine: '#7C3AED', flip: 'https://heyzine.com/flip-book/b88e40c849.html' },
  { grade: 'Grade 2', theme: "Let's Explore",   src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4y6z7vtw_A3%20Book%20Chart%20%281%29.png', spine: '#0EA5E9', flip: 'https://heyzine.com/flip-book/5e35827f8b.html' },
  { grade: 'Grade 3', theme: 'Storm Rescue',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/mzm4izo2_A3%20Book%20Chart%20%284%29.png', spine: '#1E3A8A', flip: 'https://heyzine.com/flip-book/6302e4b924.html' },
  { grade: 'Grade 4', theme: 'Cyber Lab',       src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/fd8swouq_A3%20Book%20Chart%20%282%29.png', spine: '#059669', flip: 'https://heyzine.com/flip-book/b65650ada0.html' },
  { grade: 'Grade 5', theme: 'Maze Mission',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h26jsi3o_A3%20Book%20Chart%20%283%29.png', spine: '#EA580C', flip: 'https://heyzine.com/flip-book/044922eea3.html' },
  { grade: 'Grade 6', theme: 'Robot Academy',   src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/v97f8iit_A3%20Book%20Chart%20%285%29.png', spine: '#0891B2', flip: 'https://heyzine.com/flip-book/93d70c702f.html' },
  { grade: 'Grade 7', theme: 'AI Matrix',       src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h4cauczc_A3%20Book%20Chart%20%286%29.png', spine: '#111827', flip: 'https://heyzine.com/flip-book/a26a34f273.html' },
  { grade: 'Grade 8', theme: 'Human + Machine', src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/el5uo7fb_A3%20Book%20Chart%20%287%29.png', spine: '#0284C7', flip: 'https://heyzine.com/flip-book/32be158b45.html' },
];

const PARENT_JOURNEY = [
  { i: Hammer,  t: 'Student builds',        s: 'Kits, code, imagination' },
  { i: Users,   t: 'Student demonstrates',  s: 'Classroom showcase' },
  { i: Eye,     t: 'Parent watches',        s: 'Exhibitions & open days' },
  { i: Camera,  t: 'Parent photographs',    s: 'Proud family moments' },
  { i: Share2,  t: 'Parent shares',         s: 'The whole community sees' },
];

const PARENT_QUOTES = [
  'My child couldn\u2019t stop talking about what they built.',
  'It\u2019s amazing to see them actually create something.',
  'Every week she comes home with a new project — and a bigger smile.',
];

const TRUST_STATS = [
  { k: '4.8/5', l: 'School Rating',   i: Star,           color: '#DC2626' },
  { k: '98%',   l: 'Renewal Rate',    i: Heart,          color: '#1E3A8A' },
  { k: '500+',  l: 'Schools',         i: School,         color: '#60A5FA' },
  { k: '35',    l: 'Cities Reached',  i: MapPin,         color: '#DC2626' },
];

const GROWTH_PATH = [
  { level: 'Foundation',   verb: 'Explore',           s: 'Beginner Robotics · Grades 1–4', color: '#60A5FA' },
  { level: 'Intermediate', verb: 'Build & Compete',   s: 'Sensors, coding, teamwork · Grades 5–7', color: '#1E3A8A' },
  { level: 'Advanced',     verb: 'Innovate',          s: 'IoT, automation, showcase · Grades 8–10', color: '#DC2626' },
];

export default function RoboticsBeginnerLanding() {
  const navigate = useNavigate();
  const [winIdx, setWinIdx] = useState(0);
  const [parentIdx, setParentIdx] = useState(0);
  const [curtainProgress, setCurtainProgress] = useState(0);
  const bookDemo = () => navigate('/school');

  useEffect(() => {
    const w = setInterval(() => setWinIdx((i) => (i + 1) % WINNERS.length), 5000);
    const p = setInterval(() => setParentIdx((i) => (i + 1) % PARENT_QUOTES.length), 4500);
    // Curtains open progressively with scroll — tied to stage element position in viewport
    const onScroll = () => {
      const el = document.querySelector('[data-testid="rb-stage"]');
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when stage top is at bottom of viewport, 1 when stage top has scrolled 70% up
      const raw = (vh - rect.top) / (vh * 0.85);
      const clamped = Math.max(0, Math.min(1, raw));
      setCurtainProgress(clamped);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { clearInterval(w); clearInterval(p); window.removeEventListener('scroll', onScroll); };
  }, []);

  const goWin = (i) => setWinIdx((i + WINNERS.length) % WINNERS.length);
  const currentWinner = WINNERS[winIdx];

  return (
    <div className="rb-page">
      <Toaster position="top-right" richColors />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Caveat:wght@400;700&family=Montserrat:wght@300;400;500;600;700&display=swap');

        /* Hero display face — provided by user */
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }

        .rb-page { min-height: 100vh; background: #FFFFFF; font-family: 'Inter', system-ui, sans-serif; color: #0A1F44; overflow-x: hidden; }

        /* Hero only — Zing Rust display face */
        .rb-hero-title { font-family: 'Zing Rust', 'Anton', 'Inter', sans-serif; letter-spacing: 0.005em; text-transform: uppercase; font-weight: 400; }

        /* All other section titles — Proxima Nova Light (Montserrat 300 as free fallback) */
        .rb-h1, .rb-h2, .rb-h3, .rb-h4 { font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; font-weight: 300; letter-spacing: -0.01em; text-transform: none; }
        .rb-h1 { font-weight: 400; }
        .rb-h4 { font-weight: 500; letter-spacing: 0.02em; text-transform: uppercase; }

        /* Numbers keep a strong condensed feel */
        .rb-num { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 700; letter-spacing: -0.02em; }

        .rb-serif { font-family: 'Libre Baskerville', Georgia, serif; }
        .rb-hand  { font-family: 'Caveat', cursive; }
        .rb-stroke { background-image: linear-gradient(90deg, #DC2626, #1E3A8A); -webkit-background-clip: text; background-clip: text; color: transparent; }

        .rb-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.95rem 1.75rem; border-radius: 999px; font-weight: 700; font-size: 0.95rem; text-decoration: none; cursor: pointer; border: none; transition: transform .2s ease, box-shadow .2s ease, filter .2s ease; font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; }
        .rb-btn-primary { background: linear-gradient(90deg, #DC2626 0%, #1E3A8A 100%); color: #fff; box-shadow: 0 16px 34px rgba(220,38,38,0.35); }
        .rb-btn-primary:hover { transform: translateY(-2px); filter: brightness(1.06); box-shadow: 0 22px 46px rgba(220,38,38,0.45); }
        .rb-btn-outline { background: transparent; color: #0A1F44; border: 2px solid #0A1F44; }
        .rb-btn-outline:hover { background: #0A1F44; color: #fff; }
        .rb-btn-ghost-white { background: rgba(255,255,255,0.08); color: #fff; border: 1px solid rgba(255,255,255,0.35); backdrop-filter: blur(8px); }
        .rb-btn-ghost-white:hover { background: rgba(255,255,255,0.16); }

        .rb-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .rb-orb-red   { background: rgba(220,38,38,0.5); }
        .rb-orb-blue  { background: rgba(30,58,138,0.5); }
        .rb-orb-light { background: rgba(96,165,250,0.5); }

        /* Wide centered pill nav — spans hero content width */
        .rb-topbar {
          position: fixed;
          top: 22px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 0.55rem 0.65rem 0.55rem 1.5rem;
          width: min(1180px, calc(100vw - 48px));
          background: linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(224,242,254,0.88) 100%);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.75);
          border-radius: 999px;
          box-shadow: 0 20px 48px rgba(10,31,68,0.28), 0 0 0 1px rgba(15,30,80,0.04) inset;
          white-space: nowrap;
        }
        .rb-topbar .rb-btn-outline-dark { background: transparent; color: #0A1F44; border: 1.5px solid rgba(10,31,68,0.35); padding: 0.55rem 1.15rem; border-radius: 999px; font-weight: 700; font-size: 0.88rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.4rem; transition: all .2s ease; cursor: pointer; font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; white-space: nowrap; }
        .rb-topbar .rb-btn-outline-dark:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
        .rb-topbar .rb-btn { white-space: nowrap; }

        /* Book pedestal cards — compact 8-in-a-row layout with 3D back-cover shadow */
        .rb-book-pad {
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F3FF 100%);
          border-radius: 18px;
          padding: 22px 12px 16px 14px;
          box-shadow: 0 8px 20px rgba(15,30,80,0.06), 0 1px 2px rgba(15,30,80,0.05);
          transition: box-shadow .4s ease, transform .4s ease;
        }
        .rb-book-pad:hover { box-shadow: 0 20px 44px rgba(124,58,237,0.18), 0 4px 10px rgba(15,30,80,0.08); transform: translateY(-3px); }
        .rb-book { perspective: 1400px; position: relative; }
        .rb-book-inner {
          position: relative;
          transform-style: preserve-3d;
          transform-origin: left center;
          transition: transform .55s cubic-bezier(.2,.8,.2,1), box-shadow .4s ease;
          border-radius: 3px 5px 5px 3px;
          /* Layered 3D shadow: solid back-cover offset + soft ambient + deep drop */
          box-shadow:
            2px 3px 0 rgba(30, 20, 60, 0.18),
            5px 7px 0 rgba(30, 20, 60, 0.10),
            8px 12px 22px rgba(30, 20, 60, 0.18),
            0 30px 48px -14px rgba(30, 20, 60, 0.30);
        }
        .rb-book:hover .rb-book-inner {
          transform: rotateY(-22deg) translateZ(14px);
          box-shadow:
            3px 4px 0 rgba(30, 20, 60, 0.22),
            7px 9px 0 rgba(30, 20, 60, 0.12),
            14px 18px 30px rgba(30, 20, 60, 0.24),
            0 36px 60px -14px rgba(220, 38, 38, 0.28);
        }
        .rb-book-cover { display: block; width: 100%; border-radius: 3px 5px 5px 3px; backface-visibility: hidden; }
        .rb-book-inner::after {
          content: ''; position: absolute; top: -2px; left: 2px; right: -1px; height: 2px;
          background: linear-gradient(180deg, #FEFEFE 0%, #E2E8F0 100%);
          border-radius: 2px 2px 0 0;
        }
        /* Hover reveal — CTA appears BELOW the card */
        .rb-book-pad { position: relative; }
        .rb-book-cta {
          margin-top: 0.55rem;
          text-align: center;
          font-family: 'Proxima Nova', 'Montserrat', sans-serif;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #DC2626;
          opacity: 0;
          transform: translateY(-4px);
          transition: opacity .25s ease, transform .25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.3rem;
        }
        .rb-book-pad:hover .rb-book-cta { opacity: 1; transform: translateY(0); }
        .rb-book-link { display: block; text-decoration: none; color: inherit; cursor: pointer; }

        /* 8-book row */
        .rb-books-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 0.85rem; align-items: end; }
        @media (max-width: 1180px) { .rb-books-grid { grid-template-columns: repeat(4, 1fr); } }
        @media (max-width: 640px)  { .rb-books-grid { grid-template-columns: repeat(2, 1fr); } }

        /* Curtains — scroll-linked (transform set via inline style) */
        .rb-curtain { will-change: transform; transition: transform .12s linear; }

        .rb-glass { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.18); backdrop-filter: blur(14px); }

        .rb-marquee-wrap { overflow: hidden; }
        .rb-marquee { display: flex; gap: 1.25rem; animation: rb-scroll 42s linear infinite; width: max-content; }
        @keyframes rb-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        /* Skills auto-scrolling marquee — no visible scrollbar, uneven heights */
        .rb-skills-wrap {
          overflow: hidden;
          padding: 30px 0 40px;
          -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
                  mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
        }
        .rb-skills-track {
          display: flex;
          gap: 1rem;
          width: max-content;
          animation: rb-skills-scroll 42s linear infinite;
        }
        .rb-skills-wrap:hover .rb-skills-track { animation-play-state: paused; }
        @keyframes rb-skills-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .rb-skill-card {
          position: relative;
          flex: 0 0 240px;
          border-radius: 22px;
          overflow: hidden;
          box-shadow: 0 22px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset;
          transition: transform .4s ease, box-shadow .4s ease;
          background: rgba(255,255,255,0.05);
        }
        .rb-skill-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(220,38,38,0.28), 0 0 0 1px rgba(255,255,255,0.1) inset; }
        .rb-skill-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
        .rb-skill-card::after {
          content: '';
          position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
          background: linear-gradient(180deg, transparent 0%, rgba(10,15,40,0.9) 100%);
          pointer-events: none;
        }
        .rb-skill-label {
          position: absolute; left: 18px; right: 18px; bottom: 18px;
          color: #fff;
          font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700;
          font-size: 1.15rem; letter-spacing: -0.005em;
          z-index: 2;
        }
        .rb-skill-card:nth-child(5n+1) { height: 340px; margin-top: 40px; }
        .rb-skill-card:nth-child(5n+2) { height: 420px; margin-top: 0px; }
        .rb-skill-card:nth-child(5n+3) { height: 360px; margin-top: 60px; }
        .rb-skill-card:nth-child(5n+4) { height: 400px; margin-top: 10px; }
        .rb-skill-card:nth-child(5n+5) { height: 340px; margin-top: 50px; }

        .rb-fade-in { animation: rb-fade .55s ease both; }
        @keyframes rb-fade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }

        @media (max-width: 900px) {
          .rb-2col { grid-template-columns: 1fr !important; }
          .rb-hide-mobile { display: none !important; }
        }
      `}</style>

      {/* ─────────── FLOATING GLACIAL-BLUE PILL NAV ─────────── */}
      <div className="rb-topbar" data-testid="rb-topbar">
        <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={OLL_LOGO_COLOR} alt="OLL" style={{ height: 44 }} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '0.75rem' }}>
          <a href={CURRICULUM_PDF} download="OLL-Robotics-Beginner-Curriculum-2026-27.pdf" target="_blank" rel="noreferrer" data-testid="rb-nav-download" className="rb-btn-outline-dark">
            <Download size={14} /> <span className="rb-hide-mobile">Download Curriculum</span>
          </a>
          <button onClick={bookDemo} data-testid="rb-top-cta" className="rb-btn rb-btn-primary" style={{ padding: '0.55rem 1.15rem', fontSize: '0.88rem' }}>
            Book a Demo <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ═══════════ 01 — HERO ═══════════ */}
      <section data-testid="rb-hero" style={{ position: 'relative', background: '#0A1F44', color: '#fff', paddingTop: '7rem', paddingBottom: '4rem', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -140, left: -120 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 520, height: 520, bottom: -180, right: -140 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, top: '35%', right: '30%' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '56px 56px', pointerEvents: 'none' }} />

        <div className="rb-2col" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 1fr)', gap: '3rem', alignItems: 'center', zIndex: 1 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', padding: '0.4rem 0.9rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 700 }}>
              <Rocket size={14} style={{ color: '#FCA5A5' }} />
              <span style={{ color: '#FCA5A5', letterSpacing: '0.12em', textTransform: 'uppercase' }}>For Schools · Robotics Beginner</span>
            </div>
            <h1 className="rb-hero-title" style={{ fontSize: 'clamp(2.6rem, 6vw, 4.8rem)', lineHeight: 0.96, marginTop: '1.1rem', marginBottom: '1.1rem' }}>
              Turn your school into a<br />
              <span className="rb-stroke" style={{ backgroundImage: 'linear-gradient(90deg, #FCA5A5, #60A5FA)' }}>future-skills powerhouse.</span>
            </h1>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', 'Inter', sans-serif", fontWeight: 300, fontSize: '1.1rem', lineHeight: 1.55, color: 'rgba(255,255,255,0.85)', maxWidth: 560, letterSpacing: '0.005em' }}>
              Curriculum for {SKILLS_LIST}.
            </p>
          </div>

          {/* Winners slider */}
          <div style={{ position: 'relative' }} data-testid="rb-winners">
            <div className="rb-hand" style={{ position: 'absolute', top: -30, left: 4, color: '#FCA5A5', fontSize: '1.4rem', transform: 'rotate(-4deg)', zIndex: 2 }}>real winners · real proof</div>
            <div className="rb-glass rb-fade-in" key={winIdx} style={{ borderRadius: '1.5rem', padding: '1.2rem', position: 'relative' }}>
              {/* Photo area — colored panel with initials (placeholder for real student photo) */}
              <div style={{ position: 'relative', height: 320, borderRadius: '1rem', overflow: 'hidden', background: `linear-gradient(135deg, ${currentWinner.color}, #0A1F44 120%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* subtle grid */}
                <div style={{ position: 'absolute', inset: 0, opacity: 0.14, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
                <div className="rb-h1" style={{ fontSize: '5.5rem', color: 'rgba(255,255,255,0.16)', letterSpacing: '0.02em' }}>{currentWinner.name.split(' ').map(n => n[0]).join('')}</div>
                {/* achievement badge */}
                <div style={{ position: 'absolute', top: 16, left: 16, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', padding: '0.35rem 0.8rem', borderRadius: 999, fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 800, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Trophy size={12} /> Winner
                </div>
              </div>
              {/* Meta block */}
              <div style={{ marginTop: '1rem', padding: '0.25rem 0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div className="rb-h3" style={{ fontSize: '1.35rem', color: '#fff' }}>{currentWinner.name}</div>
                  <div style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>Grade {currentWinner.grade}</div>
                  <div style={{ fontSize: '0.9rem', color: '#FCA5A5', marginTop: '0.35rem', fontWeight: 600 }}>{currentWinner.ach}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flexShrink: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>{currentWinner.initials}</div>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', textAlign: 'right', lineHeight: 1.2 }}>{currentWinner.school}</div>
                </div>
              </div>
            </div>
            {/* Controls */}
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {WINNERS.map((_, i) => (
                  <button key={i} onClick={() => goWin(i)} data-testid={`rb-winner-dot-${i}`} aria-label={`Winner ${i + 1}`}
                    style={{ width: i === winIdx ? 22 : 8, height: 8, borderRadius: 999, border: 'none', cursor: 'pointer', background: i === winIdx ? '#FCA5A5' : 'rgba(255,255,255,0.3)', transition: 'width .3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button onClick={() => goWin(winIdx - 1)} data-testid="rb-winner-prev" aria-label="Previous winner" style={{ width: 36, height: 36, borderRadius: 999, border: '1px solid rgba(255,255,255,0.3)', background: 'transparent', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronLeft size={18} />
                </button>
                <button onClick={() => goWin(winIdx + 1)} data-testid="rb-winner-next" aria-label="Next winner" style={{ width: 36, height: 36, borderRadius: 999, border: 'none', background: '#DC2626', color: '#fff', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 02 — IIT BOMBAY (Theatrical Stage) ═══════════ */}
      <section data-testid="rb-iit" style={{ position: 'relative', padding: '3rem 1.25rem 0', background: '#0A1F44', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 400, height: 400, top: -120, left: -80, opacity: 0.3 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 400, height: 400, bottom: 200, right: -80, opacity: 0.3 }} />

        {/* Section intro */}
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto 3rem', textAlign: 'center', zIndex: 2 }}>
          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>the big stage</div>
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff', marginTop: '0.35rem' }}>
            Put your school on a <span style={{ color: '#FCA5A5' }}>national stage.</span>
          </h2>
          <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.05rem', color: 'rgba(255,255,255,0.75)', marginTop: '0.9rem', maxWidth: 640, margin: '0.9rem auto 0', lineHeight: 1.6 }}>
            Give your students the opportunity to showcase what they&apos;ve built — at one of India&apos;s largest technology festivals.
          </p>
        </div>

        {/* THE STAGE */}
        <div data-testid="rb-stage" style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', paddingBottom: '2rem', zIndex: 2 }}>
          {/* Curtain top valance (fixed) */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(180deg, #7A1616 0%, #4A0E0E 100%)', borderBottom: '3px solid #DC2626', boxShadow: '0 6px 20px rgba(220,38,38,0.35)', zIndex: 5 }} />

          {/* LEFT CURTAIN — slides left with scroll progress */}
          <div className="rb-curtain" style={{ position: 'absolute', top: 40, left: 0, bottom: 120, width: '50%', background: 'linear-gradient(90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%)', boxShadow: 'inset -30px 0 60px rgba(0,0,0,0.5)', zIndex: 4, borderRight: '2px solid rgba(0,0,0,0.3)', backgroundImage: 'linear-gradient(90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 24px)', backgroundBlendMode: 'overlay', transform: `translateX(${-curtainProgress * 96}%)` }} />

          {/* RIGHT CURTAIN — slides right with scroll progress */}
          <div className="rb-curtain" style={{ position: 'absolute', top: 40, right: 0, bottom: 120, width: '50%', background: 'linear-gradient(-90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%)', boxShadow: 'inset 30px 0 60px rgba(0,0,0,0.5)', zIndex: 4, borderLeft: '2px solid rgba(0,0,0,0.3)', backgroundImage: 'linear-gradient(-90deg, #4A0E0E 0%, #7A1616 55%, #A11A1A 90%, #B91C1C 100%), repeating-linear-gradient(90deg, rgba(0,0,0,0.15) 0 2px, transparent 2px 24px)', backgroundBlendMode: 'overlay', transform: `translateX(${curtainProgress * 96}%)` }} />

          {/* Backdrop with spotlight — centered stack */}
          <div style={{ position: 'relative', minHeight: 620, background: 'radial-gradient(ellipse at 50% 15%, rgba(255,244,200,0.28) 0%, rgba(96,165,250,0.18) 20%, rgba(30,58,138,0.35) 45%, rgba(10,15,40,0.9) 75%)', overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '3rem 2rem' }}>
            {/* Spotlight beam */}
            <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: '220px solid transparent', borderRight: '220px solid transparent', borderTop: '620px solid rgba(255, 244, 200, 0.18)', filter: 'blur(24px)', pointerEvents: 'none' }} />
            {/* Spotlight glow */}
            <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,244,200,0.75) 0%, rgba(255,244,200,0) 70%)', filter: 'blur(10px)' }} />

            {/* Centered content — Showcasing → YOUR SCHOOL → Techfest logo */}
            <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780 }}>
              <div className="rb-hand" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.4rem)', color: '#FCD34D', lineHeight: 1, textShadow: '0 0 30px rgba(255,244,200,0.45)' }}>
                Showcasing
              </div>

              <div className="rb-hero-title" style={{ marginTop: '1rem', fontSize: 'clamp(2.6rem, 6vw, 4.2rem)', lineHeight: 1, color: '#fff', textShadow: '0 0 40px rgba(255,244,200,0.55), 0 0 80px rgba(255,244,200,0.3)' }}>
                YOUR SCHOOL
              </div>

              {/* Techfest logo */}
              <div style={{ marginTop: '2rem', background: '#fff', display: 'inline-block', padding: '1.25rem 2rem', borderRadius: '0.75rem', boxShadow: '0 30px 80px rgba(255,244,200,0.32), 0 0 0 4px rgba(255,255,255,0.12)' }}>
                <img src={TECHFEST_LOGO} alt="Techfest IIT Bombay" style={{ height: 78, display: 'block' }} />
              </div>
            </div>
          </div>

          {/* THE STAGE PLATFORM */}
          <div style={{ position: 'relative', height: 120, background: 'linear-gradient(180deg, #2D1810 0%, #5C3421 40%, #3D2214 100%)', borderTop: '4px solid #DC2626', boxShadow: '0 -8px 30px rgba(220,38,38,0.25)', overflow: 'hidden', zIndex: 3 }}>
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.35) 1px, transparent 1px)', backgroundSize: '110px 100%' }} />
            <div style={{ position: 'absolute', top: 6, left: 0, right: 0, display: 'flex', justifyContent: 'space-around' }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} style={{ width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle, #FCD34D 0%, #DC2626 100%)', boxShadow: '0 0 20px rgba(252,211,77,0.9), 0 0 40px rgba(252,211,77,0.6)' }} />
              ))}
            </div>
            <div style={{ position: 'absolute', bottom: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 500, fontSize: '0.75rem', color: 'rgba(255,220,180,0.7)', letterSpacing: '0.32em', textTransform: 'uppercase' }}>
              The Stage · IIT Bombay
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 03 — STEM.ORG CERTIFICATION ═══════════ */}
      <section data-testid="rb-stem" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-light" style={{ width: 400, height: 400, top: -140, right: -80, opacity: 0.22 }} />
        <div className="rb-orb rb-orb-red"   style={{ width: 300, height: 300, bottom: -120, left: -60, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#1E3A8A', fontSize: '1.5rem' }}>international recognition</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Recognition that goes <span className="rb-stroke">beyond the classroom.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
              Make your school&apos;s future-skills journey visible — with a globally recognised STEM education credential.
            </p>
          </div>

          <div className="rb-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'center' }}>
            {/* Certificate mock */}
            <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '1.25rem', padding: '2rem', boxShadow: '0 30px 80px rgba(15,30,80,0.12)', position: 'relative' }}>
              <div style={{ border: '2px solid #E2E8F0', borderRadius: '0.8rem', padding: '2rem 1.75rem', textAlign: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #DC2626, #1E3A8A)', color: '#fff', padding: '0.4rem 1rem', borderRadius: 999, fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 800 }}>STEM.org Accredited</div>
                <Award size={44} style={{ color: '#DC2626', margin: '0.5rem auto 0.8rem' }} />
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 800 }}>Certificate of Excellence</div>
                <div className="rb-h2" style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', color: '#0A1F44', margin: '0.7rem 0 0.4rem' }}>
                  Your School Name
                </div>
                <div className="rb-serif" style={{ fontStyle: 'italic', color: '#64748B', fontSize: '0.9rem', maxWidth: 340, margin: '0 auto' }}>
                  is hereby certified for delivering an OLL-powered STEM education programme meeting international standards.
                </div>
                <div style={{ marginTop: '1.4rem', paddingTop: '1rem', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94A3B8', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
                  <span>STEM.org · USA</span>
                  <span>Valid 2026 – 2027</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="rb-h3" style={{ fontSize: '1.4rem', color: '#0A1F44' }}>What a STEM.org accreditation means for your school</h3>
              <ul style={{ listStyle: 'none', padding: 0, marginTop: '1.25rem', display: 'grid', gap: '0.7rem' }}>
                {[
                  'A globally recognised STEM education credential.',
                  'Added credibility for your STEM initiatives with parents and boards.',
                  'A certificate you can display, share and market with pride.',
                  'Alignment with international STEM education standards.',
                ].map((t) => (
                  <li key={t} style={{ display: 'flex', gap: '0.7rem', alignItems: 'flex-start', color: '#334155', fontSize: '0.98rem', lineHeight: 1.5 }}>
                    <CheckCircle2 size={20} style={{ color: '#DC2626', flexShrink: 0, marginTop: 2 }} />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 04 — PARENTS SATISFACTION ═══════════ */}
      <section data-testid="rb-parents" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 380, height: 380, top: -120, right: -80, opacity: 0.2 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, bottom: -140, left: -60, opacity: 0.22 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>parent satisfaction</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Make parents proud of what their <span className="rb-stroke">children can create.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 620, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic', lineHeight: 1.6 }}>
              Don&apos;t just tell parents &ldquo;your child learned Robotics&rdquo;. Let them see it.
            </p>
          </div>

          {/* 5-step journey */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
            {PARENT_JOURNEY.map((step, i) => (
              <div key={step.t} style={{ position: 'relative', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1rem', padding: '1.25rem', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '0.66rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '0.14em' }}>0{i + 1}</div>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #DC2626, #1E3A8A)', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                  <step.i size={22} />
                </div>
                <div className="rb-h4" style={{ fontSize: '0.95rem', color: '#0A1F44' }}>{step.t}</div>
                <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.35rem' }}>{step.s}</div>
              </div>
            ))}
          </div>

          {/* Rotating parent quote */}
          <div style={{ background: 'linear-gradient(135deg, #0A1F44, #1E3A8A)', color: '#fff', borderRadius: '1.5rem', padding: '2.5rem', position: 'relative', overflow: 'hidden' }}>
            <div className="rb-orb rb-orb-red" style={{ width: 240, height: 240, top: -80, right: -60, opacity: 0.4 }} />
            <div style={{ position: 'relative', zIndex: 1, maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>
              <Quote size={36} style={{ color: '#FCA5A5', opacity: 0.6, margin: '0 auto' }} />
              <p key={parentIdx} className="rb-serif rb-fade-in" style={{ fontSize: 'clamp(1.15rem, 2vw, 1.5rem)', lineHeight: 1.5, fontStyle: 'italic', marginTop: '0.6rem' }}>
                &ldquo;{PARENT_QUOTES[parentIdx]}&rdquo;
              </p>
              <div style={{ marginTop: '0.9rem', fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', letterSpacing: '0.16em', textTransform: 'uppercase', fontWeight: 700 }}>— A proud parent</div>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.98rem', color: '#475569', fontStyle: 'italic' }} className="rb-serif">
            Because the best school experiences are the ones children take home — and the best school achievements are the ones parents proudly share.
          </p>
        </div>
      </section>

      {/* ═══════════ 05 — FUTURE SKILLS BOUQUET ═══════════ */}
      <section data-testid="rb-skills" style={{ position: 'relative', padding: '4rem 1.5rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', background: '#0A1F44', color: '#fff', borderRadius: '32px', overflow: 'hidden', padding: '3.5rem 0 3rem', boxShadow: '0 30px 80px rgba(10,31,68,0.35)' }}>
          <div className="rb-orb rb-orb-red"   style={{ width: 420, height: 420, top: -140, right: -80 }} />
          <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, left: -60 }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
              <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>the easiest way to start</div>
              <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>
                Your school&apos;s <span style={{ color: '#FCA5A5' }}>first step</span> into the future.
              </h2>
              <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 700, margin: '0.9rem auto 0', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>
                Don&apos;t limit your students to one skill — give them the opportunity to explore the technologies shaping tomorrow.
              </p>
            </div>

            {/* Auto-scrolling marquee — duplicated for seamless loop, hidden scrollbar */}
            <div className="rb-skills-wrap" data-testid="rb-skills-scroll">
              <div className="rb-skills-track">
                {[...SKILLS, ...SKILLS].map((s, i) => (
                  <div key={`${s.l}-${i}`} className="rb-skill-card" data-testid={i < SKILLS.length ? `rb-skill-${s.l.toLowerCase().replace(/\s+/g, '-')}` : undefined}>
                    <img src={s.src} alt={s.l} loading="lazy" />
                    <div className="rb-skill-label">{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ maxWidth: 780, marginLeft: 'auto', marginRight: 'auto', textAlign: 'center', padding: '1.5rem 1.5rem 0' }}>
              <p className="rb-serif" style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, fontStyle: 'italic' }}>
                A complete, hands-on Robotics foundation designed for schools starting their journey. Beginner-friendly. Pocket-friendly. Easy to teach. No need to start with an advanced Robotics lab — <strong style={{ color: '#FCA5A5', fontStyle: 'normal' }}>start with the fundamentals, build student confidence, create excitement</strong> — and establish the foundation for a long-term Future Skills journey.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ 06 — WHAT THE SCHOOL GETS ═══════════ */}
      <section data-testid="rb-school-gets" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, top: -140, right: -80, opacity: 0.2 }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>what the school actually gets</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Everything you need <span className="rb-stroke">to start.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {SCHOOL_GETS.map((c) => (
              <div key={c.t} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '1.15rem', padding: '1.5rem', boxShadow: '0 6px 24px rgba(15,30,80,0.05)' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: `${'#DC2626'}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.9rem' }}>
                  <c.i size={22} style={{ color: '#DC2626' }} />
                </div>
                <h3 className="rb-h4" style={{ fontSize: '1.05rem', color: '#0A1F44', lineHeight: 1.1 }}>{c.t}</h3>
                <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.4rem', lineHeight: 1.5 }}>{c.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 06A — STRUCTURED CURRICULUM ═══════════ */}
      <section data-testid="rb-curriculum" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
        {/* orbs */}
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -160, left: -120 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 520, height: 520, bottom: -200, right: -140 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 340, height: 340, top: '35%', left: '40%', opacity: 0.5 }} />
        {/* subtle tech grid */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '52px 52px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.8rem' }}>structured curriculum</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.03, color: '#fff' }}>
              A <span style={{ color: '#FCA5A5' }}>grade-wise progression</span> designed for beginners.
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.05rem', maxWidth: 720, margin: '1rem auto 0', color: 'rgba(255,255,255,0.72)', lineHeight: 1.6 }}>
              Every module builds on the last — from mechanical fundamentals in early grades to real-world programming and IoT by Grade 8.
            </p>
          </div>

          <div className="rb-2col" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: '3rem', alignItems: 'center' }}>

            {/* ── LEFT: futuristic grade ladder ── */}
            <div data-testid="rb-grade-ladder" style={{ display: 'grid', gap: '0.85rem' }}>
              {[
                { rail: 'linear-gradient(180deg, #DC2626, #F87171)', glow: 'rgba(220,38,38,0.35)', num: '#FCA5A5', a: '1', b: '2', title: 'Mechanics',   sub: 'Construction',       icon: Cog },
                { rail: 'linear-gradient(180deg, #EA580C, #FBBF24)', glow: 'rgba(234,88,12,0.32)', num: '#FDBA74', a: '3', b: '4', title: 'Robotics',    sub: 'Motorised Output',   icon: Cpu },
                { rail: 'linear-gradient(180deg, #06B6D4, #60A5FA)', glow: 'rgba(6,182,212,0.32)', num: '#7DD3FC', a: '5', b: '6', title: 'Electronics', sub: 'Input & Logic',      icon: Zap },
                { rail: 'linear-gradient(180deg, #1E3A8A, #6366F1)', glow: 'rgba(99,102,241,0.35)', num: '#A5B4FC', a: '7', b: '8', title: 'Programming', sub: 'Internet of Things', icon: Wifi },
              ].map((row) => (
                <div key={row.title} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '6px 96px 1fr auto', alignItems: 'center', gap: '0.9rem', padding: '1.15rem 1.25rem 1.15rem 0', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '14px', backdropFilter: 'blur(10px)', overflow: 'hidden', boxShadow: `0 12px 30px ${row.glow}` }}>
                  {/* Left rail */}
                  <div style={{ height: '75%', width: 6, background: row.rail, borderRadius: '0 4px 4px 0', boxShadow: `0 0 20px ${row.glow}` }} />
                  {/* Numbers + brace */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', paddingLeft: '0.35rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div className="rb-hero-title" style={{ fontSize: '2rem', color: row.num, lineHeight: 1, textShadow: `0 0 18px ${row.glow}` }}>{row.a}</div>
                      <div className="rb-hero-title" style={{ fontSize: '2rem', color: row.num, lineHeight: 1, textShadow: `0 0 18px ${row.glow}` }}>{row.b}</div>
                    </div>
                    <svg width="14" height="60" viewBox="0 0 14 60" style={{ color: row.num, opacity: 0.75 }} aria-hidden>
                      <path d="M11 2 C 4 2, 4 16, 2 30 C 4 44, 4 58, 11 58" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
                    </svg>
                  </div>
                  {/* Title + sub */}
                  <div>
                    <div className="rb-h3" style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 600, fontSize: '1.45rem', color: '#fff', lineHeight: 1.1, letterSpacing: '-0.005em' }}>{row.title}</div>
                    <div style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '0.98rem', color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>{row.sub}</div>
                  </div>
                  {/* Icon tile */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: row.rail, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: `0 8px 22px ${row.glow}` }}>
                    <row.icon size={22} />
                  </div>
                </div>
              ))}
            </div>

            {/* ── RIGHT: futuristic STEAM pentagon ── */}
            <div data-testid="rb-steam">
              <div style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                <h3 className="rb-h3" style={{ fontSize: '1.75rem', color: '#fff', fontWeight: 600 }}>
                  Subject <span style={{ color: '#FCA5A5' }}>Integrated</span> Learning
                </h3>
                <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', color: 'rgba(255,255,255,0.72)', marginTop: '0.6rem', lineHeight: 1.55, maxWidth: 460 }}>
                  Every project blends STEAM disciplines — so Robotics isn&apos;t just a hobby, it lifts core subjects too.
                </p>
              </div>

              <div style={{ marginTop: '1.75rem', display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
                {/* SVG pentagon with gradient slices + glow */}
                <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 320, display: 'block', filter: 'drop-shadow(0 30px 60px rgba(220,38,38,0.25))' }} aria-label="STEAM pentagon">
                  <defs>
                    <linearGradient id="g-red"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#DC2626" /><stop offset="1" stopColor="#F87171" /></linearGradient>
                    <linearGradient id="g-orn"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#EA580C" /><stop offset="1" stopColor="#FBBF24" /></linearGradient>
                    <linearGradient id="g-blu"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#1E3A8A" /><stop offset="1" stopColor="#3B82F6" /></linearGradient>
                    <linearGradient id="g-cyn"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0891B2" /><stop offset="1" stopColor="#60A5FA" /></linearGradient>
                    <linearGradient id="g-ind"  x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#4F46E5" /><stop offset="1" stopColor="#A5B4FC" /></linearGradient>
                  </defs>
                  {(() => {
                    const cx = 150, cy = 150, r = 130;
                    const slices = [
                      { name: 'ENGINEERING', fill: 'url(#g-blu)', angleOffset: -90 },
                      { name: 'ART',         fill: 'url(#g-red)', angleOffset: -18 },
                      { name: 'MATHEMATICS', fill: 'url(#g-ind)', angleOffset:  54 },
                      { name: 'SCIENCE',     fill: 'url(#g-cyn)', angleOffset: 126 },
                      { name: 'TECHNOLOGY',  fill: 'url(#g-orn)', angleOffset: 198 },
                    ];
                    const rad = (d) => (d * Math.PI) / 180;
                    return slices.map((s) => {
                      const half = 36;
                      const x1 = cx + r * Math.cos(rad(s.angleOffset - half));
                      const y1 = cy + r * Math.sin(rad(s.angleOffset - half));
                      const x2 = cx + r * Math.cos(rad(s.angleOffset + half));
                      const y2 = cy + r * Math.sin(rad(s.angleOffset + half));
                      const lx = cx + r * 0.62 * Math.cos(rad(s.angleOffset));
                      const ly = cy + r * 0.62 * Math.sin(rad(s.angleOffset));
                      // Rotate label to run along slice axis (readable orientation)
                      let rot = s.angleOffset + 90;
                      if (rot > 90 && rot < 270) rot -= 180;
                      return (
                        <g key={s.name}>
                          <path d={`M${cx},${cy} L${x1},${y1} L${x2},${y2} Z`} fill={s.fill} stroke="#0A1F44" strokeWidth="4" strokeLinejoin="round" />
                          <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" transform={`rotate(${rot} ${lx} ${ly})`} style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 800, fontSize: 11, fill: '#fff', letterSpacing: '0.14em' }}>{s.name}</text>
                        </g>
                      );
                    });
                  })()}
                  {/* center hub */}
                  <circle cx="150" cy="150" r="22" fill="#0A1F44" stroke="rgba(255,255,255,0.25)" strokeWidth="2" />
                  <text x="150" y="152" textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 800, fontSize: 12, fill: '#FCA5A5', letterSpacing: '0.14em' }}>STEAM</text>
                </svg>

                {/* Improves grades in — glass card */}
                <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '1rem', padding: '1.25rem 1.25rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", minWidth: 190, backdropFilter: 'blur(10px)' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#fff', letterSpacing: '0.04em' }}>Improves grades in</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', display: 'grid', gap: '0.6rem' }}>
                    {[
                      { l: 'Physics',      i: Zap,            c: '#F87171' },
                      { l: 'Maths',        i: Calculator,     c: '#60A5FA' },
                      { l: 'Computers',    i: TerminalSquare, c: '#A5B4FC' },
                      { l: 'Art & Craft',  i: Palette,        c: '#FBBF24' },
                    ].map((it) => (
                      <li key={it.l} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.95rem', color: 'rgba(255,255,255,0.9)', fontWeight: 400 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${it.c}22`, color: it.c, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${it.c}44` }}>
                          <it.i size={15} />
                        </div>
                        {it.l}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════ 06B — INTERACTIVE BOOKS ═══════════ */}
      <section data-testid="rb-books" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"  style={{ width: 360, height: 360, top: -120, left: -80, opacity: 0.18 }} />
        <div className="rb-orb rb-orb-blue" style={{ width: 400, height: 400, bottom: -140, right: -80, opacity: 0.18 }} />

        <div style={{ position: 'relative', maxWidth: 1320, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '2rem' }}>interactive books</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2.6rem, 5.4vw, 4rem)', lineHeight: 1.02, color: '#0A1F44' }}>
              A book for <span className="rb-stroke">every grade.</span>
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1.1rem', maxWidth: 720, margin: '1rem auto 0', color: '#475569', lineHeight: 1.6 }}>
              Beautifully illustrated, story-driven student books — mapped to every lesson and every kit component.
            </p>
          </div>

          <div className="rb-books-grid">
            {BOOKS.map((b) => (
              <a key={b.grade} href={b.flip} target="_blank" rel="noreferrer" className="rb-book-link rb-book-pad" data-testid={`rb-book-${b.grade.replace(/\s+/g, '').toLowerCase()}`}>
                <div className="rb-book">
                  <div className="rb-book-inner" style={{ '--spine': b.spine }}>
                    <img src={b.src} alt={`Robotics ${b.grade}`} className="rb-book-cover" />
                  </div>
                </div>
                <div style={{ marginTop: '0.85rem', textAlign: 'center', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                  <div className="rb-h4" style={{ fontSize: '0.78rem', color: '#0A1F44' }}>{b.grade}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 1 }}>{b.theme}</div>
                </div>
                <div className="rb-book-cta">
                  <BookOpen size={11} /> Click to open sample
                </div>
              </a>
            ))}
          </div>

          <p style={{ textAlign: 'center', marginTop: '2rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontSize: '0.95rem', color: '#DC2626', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            <BookOpen size={14} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            Click any book to open a sample
          </p>
        </div>
      </section>

      {/* ═══════════ 07 — WHAT YOUR SCHOOL GETS (3 pillars) ═══════════ */}
      <section data-testid="rb-pillars" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#F1F5F9', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#1E3A8A', fontSize: '1.5rem' }}>the outcome</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              What your school <span className="rb-stroke">gets.</span>
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            {PILLARS.map((p) => (
              <div key={p.t} style={{ position: 'relative', background: `linear-gradient(135deg, ${p.color}, #0A1F44 130%)`, color: '#fff', borderRadius: '1.4rem', padding: '2rem 1.75rem', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, opacity: 0.12, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '44px 44px', pointerEvents: 'none' }} />
                <div style={{ position: 'relative', zIndex: 1 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.i size={26} />
                  </div>
                  <h3 className="rb-h3" style={{ fontSize: '1.4rem', marginTop: '1rem', lineHeight: 1.1 }}>{p.t}</h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.85)', marginTop: '0.5rem', lineHeight: 1.55 }}>{p.s}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 08 — ABOUT OLL (Shark Tank / KBC + Trust Stats) ═══════════ */}
      <section data-testid="rb-about-oll" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 420, height: 420, top: -140, left: '10%' }} />
        <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, right: '10%' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>about OLL</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05 }}>
              Trusted by schools <span style={{ color: '#FCA5A5' }}>across India.</span>
            </h2>
          </div>

          {/* As seen on */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
            <div data-testid="rb-media-kbc" style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src={KBC_IMG} alt="Kaun Banega Crorepati" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
                <div style={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony · KBC</div>
                <div className="rb-h3" style={{ fontSize: '1.35rem', marginTop: 4 }}>Kaun Banega Crorepati</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Featured as India&apos;s leading EdTech for kids</div>
              </div>
            </div>

            <div data-testid="rb-media-shark-tank" style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)' }}>
              <img src={SHARK_TANK_IMG} alt="Shark Tank India" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 22, right: 22 }}>
                <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony LIV · Season Finale</div>
                <div className="rb-h3" style={{ fontSize: '1.35rem', marginTop: 4 }}>Shark Tank India</div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Pitched to India&apos;s top investors on national TV</div>
              </div>
            </div>
          </div>

          {/* Trust stats */}
          <div style={{ background: '#FFFFFF', color: '#0A1F44', borderRadius: '1.5rem', padding: '2rem 1.5rem', boxShadow: '0 30px 80px rgba(0,0,0,0.35)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            {TRUST_STATS.map((s, i) => (
              <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.5rem 1rem', borderLeft: i === 0 ? 'none' : '1px solid #E5E7EB' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `${s.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <s.i size={26} style={{ color: s.color }} />
                </div>
                <div style={{ textAlign: 'left' }}>
                  <div className="rb-num" style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', lineHeight: 1, color: '#0A1F44' }}>{s.k}</div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#64748B', fontWeight: 600 }}>{s.l}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Principal testimonials */}
          <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {[
              { q: 'OLL Robotics has become the highlight of our STEM curriculum. Children walk in excited every week.', a: 'Mrs. Meena Bhatia · Principal, D. G. Khetan International' },
              { q: 'The kits and lesson plans are so well-thought that our teachers were confident from Week 1.',       a: 'Dr. R. Menon · Principal, Veekays English High' },
              { q: 'From backbenchers to toppers, everyone finds their pace. That inclusivity won us over.',            a: 'Mr. Anand Kumar · Principal, Ryan International' },
            ].map((t) => (
              <div key={t.a} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)', borderRadius: '1rem', padding: '1.5rem', backdropFilter: 'blur(8px)' }}>
                <Quote size={22} style={{ color: '#FCA5A5', opacity: 0.7 }} />
                <p className="rb-serif" style={{ fontStyle: 'italic', fontSize: '0.98rem', lineHeight: 1.55, marginTop: '0.4rem', color: 'rgba(255,255,255,0.9)' }}>&ldquo;{t.q}&rdquo;</p>
                <div style={{ marginTop: '0.9rem', fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700, color: '#60A5FA' }}>{t.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 09 — GROWTH PATH ═══════════ */}
      <section data-testid="rb-growth" style={{ position: 'relative', padding: '5rem 1.25rem', background: '#FFFFFF', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 380, height: 380, top: -140, left: -80, opacity: 0.2 }} />
        <div className="rb-orb rb-orb-blue"  style={{ width: 380, height: 380, bottom: -140, right: -80, opacity: 0.2 }} />

        <div style={{ position: 'relative', maxWidth: 1000, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.5rem' }}>a long-term journey</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Start here. Then go <span className="rb-stroke">advanced.</span>
            </h2>
            <p className="rb-serif" style={{ fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', fontStyle: 'italic' }}>
              OLL is a long-term partner — not a one-year Robotics vendor.
            </p>
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {GROWTH_PATH.map((g, i) => (
              <div key={g.level} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '1.15rem', padding: '1.25rem 1.5rem', position: 'relative' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${g.color}, #0A1F44 130%)`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span className="rb-h3" style={{ fontSize: '1.3rem' }}>0{i + 1}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: g.color, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 800 }}>{g.level}</div>
                  <h3 className="rb-h3" style={{ fontSize: '1.4rem', color: '#0A1F44', marginTop: 3 }}>{g.verb}</h3>
                  <div style={{ fontSize: '0.9rem', color: '#64748B', marginTop: 4 }}>{g.s}</div>
                </div>
                {i < GROWTH_PATH.length - 1 && (
                  <div style={{ position: 'absolute', bottom: -14, left: 43, width: 2, height: 20, background: '#E2E8F0' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ 10 — FINAL CTA ═══════════ */}
      <section id="demo" data-testid="rb-final-cta" style={{ position: 'relative', padding: '6rem 1.25rem', background: 'linear-gradient(135deg, #DC2626 0%, #1E3A8A 100%)', color: '#fff', overflow: 'hidden' }}>
        <div className="rb-orb rb-orb-red"   style={{ width: 460, height: 460, top: -160, left: -100 }} />
        <div className="rb-orb rb-orb-light" style={{ width: 420, height: 420, bottom: -160, right: -80 }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.08, backgroundImage: 'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 780, margin: '0 auto', textAlign: 'center', zIndex: 1 }}>
          <Sparkles size={38} style={{ color: '#FCA5A5', margin: '0 auto 0.9rem' }} />
          <h2 className="rb-h1" style={{ fontSize: 'clamp(2.2rem, 5vw, 3.6rem)', lineHeight: 1 }}>
            Ready to build your<br />future-skills powerhouse?
          </h2>
          <p className="rb-serif" style={{ fontSize: '1.05rem', color: 'rgba(255,255,255,0.9)', marginTop: '1rem', fontStyle: 'italic' }}>
            Start your school&apos;s Robotics journey with OLL.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
            <button onClick={bookDemo} data-testid="rb-final-book" className="rb-btn" style={{ background: '#fff', color: '#0A1F44', padding: '1.1rem 2.2rem', fontSize: '1.05rem', boxShadow: '0 18px 40px rgba(0,0,0,0.3)' }}>
              Book a School Demo <ArrowRight size={18} />
            </button>
            <a href="tel:+919820106645" data-testid="rb-final-call" className="rb-btn rb-btn-ghost-white" style={{ padding: '1.1rem 2.2rem', fontSize: '1.05rem' }}>
              <Phone size={16} /> Talk to an OLL Expert
            </a>
          </div>
          <div style={{ marginTop: '2.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, fontSize: '0.78rem', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 700 }}>
            <PlayCircle size={14} /> Free · No commitment · 30-min walkthrough
          </div>
        </div>
      </section>
    </div>
  );
}
