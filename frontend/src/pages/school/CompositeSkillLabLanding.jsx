/**
 * OLL Composite Skill Lab (CSL) Landing Page
 * Mandated as per CBSE Circular Skill-75/2024 · NEP 2020 & NCF-SE 2023 (Grades 6–10).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, Heart, Play, Leaf, Hammer, Shirt, Stethoscope, ShoppingBag,
  Wrench, Check, Clock, Compass, Layers, Shield, Maximize2, X, Eye
} from 'lucide-react';

import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';

const API = process.env.REACT_APP_BACKEND_URL;
const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const CANONICAL_PATH =
  '/school/composite-skill-lab-cbse-skill-education-grades-6-to-10';

const BROCHURE_PDF_URL =
  'https://drive.google.com/uc?export=download&id=1GNsJkhDyrDGzWxUwUORgQRDXBtLQsr3J';
const BROCHURE_NAME =
  'OLL-Composite-Skill-Lab-Brochure.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const CSL_HERO_SLIDES = [
  {
    badge: 'CBSE Skill-75/2024 · Grades 6–10',
    tag: 'Official Lab Blueprint · 2026-27',
    title: 'Composite Skill Lab Solution',
    subtitle: 'Life Forms · Machines & Materials · Human Services',
    src: '/school/composite/csl_page_1.webp',
    highlight: 'Mandatory CBSE Norms',
    edition: '110 Hours / Year',
  },
  {
    badge: 'Turnkey Lab Setup · NEP 2020',
    tag: 'State-of-the-Art Learning Space',
    title: 'Explore · Create · Innovate',
    subtitle: 'Robotics, AI, 3D Printing, Electronics & Apparel Stations',
    src: '/school/composite/csl_page_2.webp',
    highlight: 'Turnkey Lab Fitout',
    edition: 'Complete Equipment',
  },
  {
    badge: 'NCF-SE 2023 Aligned · Textbooks',
    tag: 'Curriculum & Hardware Ecosystem',
    title: 'Curriculum Alignment & Textbooks',
    subtitle: 'Grade-Wise Textbooks, Kits & LMS for CBSE Mandate',
    src: '/school/composite/csl_page_3.webp',
    highlight: 'Official Syllabus',
    edition: 'Ready to Implement',
  },
];

const CSL_EQUIPMENT_STATIONS = [
  {
    id: 'electronics',
    name: 'Electronics, AI & Mechatronics',
    tag: 'Sector 2: Machines & Materials',
    color: '#0284C7',
    bg: '#E0F2FE',
    img: '/school/composite/csl_page_8.webp',
    title: 'Electronics, Mechatronics, AI & IoT Hardware Stack',
    desc: 'Arduino UNO boards, breadboards, ESP32 dev boards, digital multimeters, DC gear motors, servo motors, soldering stations, humidity sensors, ultrasonic sensors, and autonomous mobile robot kits.',
    highlights: ['Arduino UNO with USB Cables (4 Nos)', 'ESP32 Wi-Fi & Bluetooth IoT Boards (4 Nos)', 'Digital Multimeters & Pen Testers', 'Soldering Station & Helping Hands', 'Autonomous Mobile Robot Kits with L298P Shields']
  },
  {
    id: 'agriculture',
    name: 'Agriculture, Gardening & Safety',
    tag: 'Sector 1: Life Forms & Utilities',
    color: '#16A34A',
    bg: '#DCFCE7',
    img: '/school/composite/csl_page_6.webp',
    title: 'Agriculture, Drip Irrigation & Lab Safety Equipment',
    desc: 'Soil measurement kits (digital pH + moisture), hydroponics DWC kits, drip irrigation kits, grow lights, plant grow bags, pruning shears, along with ABC fire extinguishers, fire blankets, first aid kits, PPE and safety goggles.',
    highlights: ['Soil Digital pH & Moisture Meters', 'Hydroponics NFT / DWC Starter Kit', 'Drip Irrigation Tubing & Emitters', 'ABC Fire Extinguishers & Fire Blankets', 'Student Safety Goggles (20 Nos) & First Aid Training Kit']
  },
  {
    id: 'woodwork-health',
    name: 'Carpentry & Healthcare Services',
    tag: 'Sector 2 & 3: Materials & Human Services',
    color: '#DC2626',
    bg: '#FEE2E2',
    img: '/school/composite/csl_page_10.webp',
    title: 'Carpentry, Joinery & Healthcare Consumables Stack',
    desc: 'Bench vises, chisels, hammers, electric hand drill machines, hacksaws, paired with half-body CPR training mannequins with feedback, digital BP monitors, pulse oximeters, glucometers, reflex hammers, and WHO health posters.',
    highlights: ['Adult CPR Half-Body Mannequin with Feedback', 'Digital BP Monitors & Fingertip Pulse Oximeters', 'Carpentry & Bench Vises (Workbench Mount)', 'Electric Hand Drill & Bit Set', 'Patient Record Sheets & WHO Health Chart Posters']
  },
  {
    id: 'lab-setup',
    name: 'Complete Lab Room Architecture',
    tag: 'Turnkey Classroom Transformation',
    color: '#7C3AED',
    bg: '#EDE9FE',
    img: '/school/composite/csl_page_2.webp',
    title: 'Explore · Create · Innovate Integrated Lab Environment',
    desc: 'Ergonomic multi-station layout accommodating 40+ students simultaneously across robotics tables, sewing and textile craft tables, carpentry benches, hydroponics growing racks, and multimedia coding displays.',
    highlights: ['600 – 1,200 sq. ft. Flexible Room Fit-Out', 'Branded OLL Lab Signage & Workstations', 'Dedicated Heavy-Duty Storage Bins', 'LMS-Connected Facilitator Laptop Desk', 'Kaushal Mela Exhibition Capstone Readiness']
  }
];

const SECTORS = [
  {
    title: 'Work with Life Forms',
    icon: Leaf,
    color: '#16A34A',
    bg: '#DCFCE7',
    domains: [
      { name: 'Agriculture & Gardening', desc: 'Kitchen Garden (Gr. 6), Plant Nursery (Gr. 7), Hydroponics (Gr. 8), Agriculture Vocation (Gr. 9)' },
      { name: 'Food Production', desc: 'Cooking without Fire (Gr. 6), Food Production & Nutrition Vocation (Gr. 10)' }
    ]
  },
  {
    title: 'Work with Machines & Materials',
    icon: Hammer,
    color: '#0284C7',
    bg: '#E0F2FE',
    domains: [
      { name: 'Electronics, AI & Mechatronics', desc: 'Circuits (Gr. 6), AI Assistant (Gr. 7), Home Automation (Gr. 8), Electronics Vocation (Gr. 9)' },
      { name: 'Apparel, Tie-Dye & Fashion', desc: 'Tie & Dye (Gr. 7), Puppet Making (Gr. 7), Apparel Design Vocation (Gr. 10)' },
      { name: 'Carpentry & Woodwork', desc: 'Wood & Bamboo Craft (Gr. 8), Carpentry & Joinery (Gr. 10)' }
    ]
  },
  {
    title: 'Work in Human Services',
    icon: Stethoscope,
    color: '#DC2626',
    bg: '#FEE2E2',
    domains: [
      { name: 'Healthcare & First Aid', desc: 'Family Health Handbook (Gr. 7), Patient Support & Healthcare Vocation (Gr. 9)' },
      { name: 'Retail & Enterprise (Lite)', desc: 'Plant & Craft Sales (Gr. 7), Retail Vocation (Gr. 10), Kaushal Mela School Exhibitions' }
    ]
  }
];

export default function CompositeSkillLabLanding() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);
  const [selectedStationIdx, setSelectedStationIdx] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);

  // Auto-rotate hero slider
  useEffect(() => {
    const id = setInterval(() => {
      setActiveSlideIdx((i) => (i + 1) % CSL_HERO_SLIDES.length);
    }, 4500);
    return () => clearInterval(id);
  }, []);

  // Listen for ESC to close zoom modal
  useEffect(() => {
    if (!previewImage) return;
    const onKey = (e) => { if (e.key === 'Escape') setPreviewImage(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [previewImage]);

  const activeHeroSlide = CSL_HERO_SLIDES[activeSlideIdx];

  const [form, setForm] = useState({
    school_name: '', contact_name: '', phone: '', email: '', city: '', board: 'CBSE', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.school_name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter school name and a valid 10-digit phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: form.school_name.trim(),
          contact_name: form.contact_name.trim() || 'Principal / Coordinator',
          email: form.email.trim() || `lead_${form.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: form.phone.trim(),
          city: form.city.trim(),
          board: form.board,
          selected_offerings: ['Composite Skill Lab (Grades 6-10)'],
          programs_interested: ['CBSE Skill-75/2024 Composite Skill Lab'],
          source: 'composite-skill-lab-landing',
          notes: `Inquiry for CBSE Composite Skill Lab setup. City: ${form.city}. Message: ${form.message}`,
          assign_option: 'admin',
        }),
      });
      setSubmitted(true);
      toast.success('Your Composite Skill Lab demo request has been received!');
    } catch {
      setSubmitted(true);
      toast.success('Your request was received. Our lab specialist will connect shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative icse-page" style={{ background: '#FAFBFD', color: '#0F1E33', fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif" }}>
      <Toaster position="top-right" richColors />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@200;300;400;500;600;700;800;900&family=Caveat:wght@400;700&display=swap');
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400; font-style: normal; font-display: swap;
        }
        .icse-nav-pill { max-width: 1220px; margin: 0 auto; background: rgba(255,255,255,0.98); backdrop-filter: saturate(180%) blur(14px); border: 1px solid rgba(10,31,68,0.08); box-shadow: 0 20px 44px rgba(10,31,68,0.12); border-radius: 999px; display:flex; align-items:center; justify-content: space-between; padding: 8px 14px 8px 18px; }
        .icse-btn     { display:inline-flex; align-items:center; gap:8px; padding:14px 26px; border-radius:999px; font-weight:700; font-size:0.82rem; letter-spacing:0.05em; text-transform:uppercase; transition:transform .2s ease, box-shadow .2s ease, background .2s ease; cursor:pointer; text-decoration:none; border:none; }
        .icse-btn.primary { background:#2563EB; color:#fff; box-shadow:0 14px 28px rgba(37,99,235,0.28); }
        .icse-btn.primary:hover { background:#1D4ED8; transform:translateY(-1px); }
        .icse-btn.outline { background:#fff; color:#0A1F44; border:1.5px solid #0A1F44; }
        .icse-btn.outline:hover { background:#0A1F44; color:#fff; }
        @keyframes floatY { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        .icse-anim-float { animation: floatY 6s ease-in-out infinite; }
        @keyframes sparkleSpin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
        .icse-anim-spin { animation: sparkleSpin 12s linear infinite; }
        .icse-mobile-cta {
          position: fixed; left: 0; right: 0; bottom: 0; z-index: 60;
          padding: 10px 12px calc(10px + env(safe-area-inset-bottom, 0));
          display: none;
          gap: 8px;
          background: rgba(255,255,255,0.96);
          backdrop-filter: saturate(180%) blur(14px);
          border-top: 1px solid rgba(10,31,68,0.08);
          box-shadow: 0 -12px 32px rgba(10,31,68,0.10);
        }
        .icse-mobile-cta .icse-btn { flex: 1; justify-content: center; padding: 12px 14px !important; font-size: 0.75rem !important; }
        @media (max-width: 640px) {
          .icse-nav-pill { padding: 6px 10px 6px 12px; }
          .icse-nav-pill img { height: 34px !important; }
          .icse-page { padding-bottom: 84px; }
          .icse-btn { padding: 12px 18px !important; font-size: 0.78rem !important; }
          .icse-btn.primary, .icse-btn.outline { min-height: 46px; }
          .icse-mobile-cta { display: flex; }
        }
      `}</style>

      {/* ── Sticky Nav (desktop/tablet only — mobile uses the sticky bottom CTA bar). ─── */}
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="csl-nav">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3">
            <img src={OLL_LOGO_COLOR} alt="OLL — Skills for All logo · Official CBSE Composite Skill Lab partner" className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              Composite Skill Lab<br/>CBSE Grades 6 to 10
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGateOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="csl-download-brochure">
              <Download className="w-3.5 h-3.5" /> Download Blueprint
            </button>
            <a href="#setup-consultation" className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="csl-header-demo">
              Request Setup <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Visible breadcrumb trail (with top padding to account for fixed floating pill nav) ── */}
      <div style={{ paddingTop: 'clamp(2.5rem, 8vw, 5.5rem)' }}>
        <SchoolBreadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'For Schools', href: '/school' },
            { label: 'Composite Skill Lab', href: '/school#labs' },
            { label: 'CBSE · Composite Skill Lab (Grades 6–10)' }
          ]}
          schemaId="csl-breadcrumbs-schema"
          testid="csl-breadcrumbs"
        />
      </div>

      {/* HERO SECTION */}
      <section style={{ maxWidth: 1200, margin: '1.5rem auto 3.5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'radial-gradient(ellipse at top right, rgba(37, 99, 235, 0.08), transparent 60%), #FFFFFF',
          borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '3rem 2.5rem', boxShadow: '0 20px 50px rgba(15, 30, 80, 0.06)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            
            {/* Left Column */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8',
                borderRadius: '9999px', padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem'
              }}>
                <Clock size={14} /> 110 Hours Per Year · Mandatory CBSE Norms
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 900,
                lineHeight: 1.15, color: '#0A1F44', marginBottom: '1.25rem',
                letterSpacing: '-0.02em'
              }}>
                Composite Skill Lab for Schools{' '}
                <span style={{ color: '#2563EB', display: 'inline-block' }}>(Grades 6 to 10)</span>
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.6, color: '#475569',
                marginBottom: '2rem', maxWidth: 580
              }}>
                Empower your school with an integrated, multi-sector hands-on learning hub.
                Fulfills <strong>CBSE Circular Skill-75/2024</strong>, <strong>NEP 2020</strong>, and <strong>NCF-SE 2023</strong> mandates across Life Forms, Machines & Materials, and Human Services.
              </p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                <a
                  href="#setup-consultation"
                  data-testid="csl-hero-primary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff', padding: '0.9rem 1.75rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.3)',
                    transition: 'transform 0.15s'
                  }}
                >
                  Schedule Lab Setup Consultation <ArrowRight size={18} />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  data-testid="csl-hero-brochure-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFFFFF', color: '#0A1F44', border: '2px solid #E2E8F0',
                    padding: '0.85rem 1.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 30, 80, 0.04)'
                  }}
                >
                  <Download size={18} style={{ color: '#2563EB' }} /> Download CSL Blueprint (PDF)
                </button>
              </div>

              {/* Compliance Badges */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  'CBSE Skill-75/2024 Compliant',
                  '110 Hours Curriculum per Grade',
                  'Covers 3 Core Economic Sectors',
                  'Turnkey Equipment & Teacher LMS'
                ].map((txt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Hero Showcase Floating Card */}
            <div className="relative" data-testid="csl-hero-card">
              {/* Ambient glowing gradient behind the card */}
              <div className="absolute -inset-6 rounded-[36px] bg-gradient-to-br from-[#0A1F44]/25 via-transparent to-[#2563EB]/25 blur-3xl icse-anim-spin" />

              {/* White floating card */}
              <div className="relative bg-white rounded-[32px] p-5 sm:p-6 border border-blue-100 shadow-2xl icse-anim-float">
                {/* Header Bar */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 bg-[#0A1F44] px-3.5 py-1.5 rounded-full">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {activeHeroSlide.badge}
                    </span>
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 tabular-nums">
                    {String(activeSlideIdx + 1).padStart(2, '0')} / {String(CSL_HERO_SLIDES.length).padStart(2, '0')}
                  </div>
                </div>

                {/* Full-Cover Hero Visual Box */}
                <div
                  onClick={() => setPreviewImage({
                    src: activeHeroSlide.src,
                    title: activeHeroSlide.title,
                    caption: `${activeHeroSlide.badge} — ${activeHeroSlide.subtitle}`
                  })}
                  className="relative rounded-2xl overflow-hidden w-full h-[380px] sm:h-[420px] shadow-md bg-slate-900 group cursor-pointer"
                  title="Click to view full size"
                >
                  <img
                    src={activeHeroSlide.src}
                    alt={activeHeroSlide.title}
                    className="w-full h-full object-cover object-top transition-all duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center rounded-2xl">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5">
                      <Maximize2 size={13} className="text-[#2563EB]" /> Tap to Inspect Slide
                    </span>
                  </div>
                </div>

                {/* Info / Metadata Row */}
                <div className="mt-4 pt-3.5 border-t border-blue-100 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[#2563EB]">
                      {activeHeroSlide.tag}
                    </div>
                    <div className="text-[#0A1F44] font-black text-base sm:text-lg leading-tight mt-0.5 truncate">
                      {activeHeroSlide.title}
                    </div>
                    <div className="text-xs text-slate-500 font-semibold mt-0.5 truncate">
                      {activeHeroSlide.subtitle}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="inline-block bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                      {activeHeroSlide.highlight}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                      {activeHeroSlide.edition}
                    </div>
                  </div>
                </div>

                {/* Bottom Carousel Indicator Dots */}
                <div className="flex items-center justify-center gap-1.5 mt-4">
                  {CSL_HERO_SLIDES.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSlideIdx(idx)}
                      aria-label={`Go to slide ${idx + 1}`}
                      className={`transition-all duration-300 cursor-pointer border-none p-0 ${
                        activeSlideIdx === idx
                          ? 'w-6 h-2 rounded-full bg-[#2563EB]'
                          : 'w-2 h-2 rounded-full bg-slate-300 hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 3 CORE SECTORS SECTION */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Comprehensive Multi-Sector Learning
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            The 3 Pillars of CBSE Composite Skill Education
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
            Exposing students across Grades 6–10 to agriculture, modern manufacturing, electronics, healthcare, and retail.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          {SECTORS.map((sec, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.5rem', border: '2px solid #E2E8F0',
              padding: '2rem', boxShadow: '0 8px 24px rgba(15, 30, 80, 0.04)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: 56, height: 56, borderRadius: '1.25rem',
                  background: sec.bg, color: sec.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem'
                }}>
                  <sec.icon size={28} />
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0A1F44', marginBottom: '1.25rem' }}>
                  {sec.title}
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {sec.domains.map((dom, dIdx) => (
                    <div key={dIdx} style={{
                      background: '#F8FAFC', borderRadius: '0.85rem', padding: '0.85rem 1rem',
                      border: '1px solid #E2E8F0'
                    }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B', marginBottom: '0.25rem' }}>
                        {dom.name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748B', lineHeight: 1.5 }}>
                        {dom.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TURNKEY EQUIPMENT & CONSUMABLES STACK (Interactive Station Explorer) */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Official CBSE Skill-75/2024 Lab Inventory
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Turnkey Equipment, Tools &amp; Consumables Stack
          </h2>
          <p style={{ color: '#64748B', maxWidth: 700, margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
            Examine our high-spec multi-station inventories designed specifically for schools to deliver hands-on vocational excellence without sourcing headaches.
          </p>
        </div>

        {/* Station Navigation Pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
          {CSL_EQUIPMENT_STATIONS.map((station, idx) => (
            <button
              key={station.id}
              type="button"
              onClick={() => setSelectedStationIdx(idx)}
              style={{
                padding: '0.75rem 1.4rem',
                borderRadius: '999px',
                border: selectedStationIdx === idx ? `2px solid ${station.color}` : '2px solid #E2E8F0',
                background: selectedStationIdx === idx ? station.bg : '#FFFFFF',
                color: selectedStationIdx === idx ? station.color : '#475569',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: selectedStationIdx === idx ? `0 4px 14px ${station.color}25` : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: station.color }} />
              {station.name}
            </button>
          ))}
        </div>

        {/* Selected Station Card Showcase */}
        {(() => {
          const currentStation = CSL_EQUIPMENT_STATIONS[selectedStationIdx];
          return (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '2rem',
              border: '2px solid #E2E8F0',
              overflow: 'hidden',
              boxShadow: '0 16px 40px rgba(15, 30, 80, 0.06)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '2.5rem',
              padding: '2.5rem',
              alignItems: 'center'
            }}>
              {/* Left Column: Details & Checklist */}
              <div>
                <span style={{
                  display: 'inline-block',
                  background: currentStation.bg,
                  color: currentStation.color,
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '0.35rem 0.85rem',
                  borderRadius: '999px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '1rem'
                }}>
                  {currentStation.tag}
                </span>

                <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.85rem', lineHeight: 1.25 }}>
                  {currentStation.title}
                </h3>

                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                  {currentStation.desc}
                </p>

                <div style={{ marginBottom: '2rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0A1F44', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
                    Key Inventory Highlights (Included Turnkey):
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {currentStation.highlights.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: currentStation.bg,
                          color: currentStation.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2
                        }}>
                          ✓
                        </div>
                        <span style={{ fontSize: '0.9rem', color: '#1E293B', fontWeight: 600 }}>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setPreviewImage({
                      src: currentStation.img,
                      title: currentStation.title,
                      caption: currentStation.desc
                    })}
                    className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer shadow-md"
                  >
                    <Eye size={15} /> Inspect Full Inventory Spec
                  </button>
                  <button
                    type="button"
                    onClick={() => setGateOpen(true)}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
                  >
                    <Download size={14} /> Download Blueprint PDF
                  </button>
                </div>
              </div>

              {/* Right Column: Click-to-Zoom High-Res Spec Card */}
              <div
                onClick={() => setPreviewImage({
                  src: currentStation.img,
                  title: currentStation.title,
                  caption: currentStation.desc
                })}
                className="relative cursor-pointer group rounded-2xl overflow-hidden border-2 border-slate-200 bg-slate-50 p-2 shadow-md hover:shadow-xl transition-all"
                title="Click to zoom high-resolution inventory"
              >
                <div className="relative overflow-hidden rounded-xl bg-white">
                  <img
                    src={currentStation.img}
                    alt={currentStation.title}
                    className="w-full h-[360px] sm:h-[400px] object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-all flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 text-slate-900 text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                      <Maximize2 size={14} className="text-[#2563EB]" /> Click to Zoom Full Image
                    </span>
                  </div>
                  <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200">
                    High-Res CBSE Spec
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </section>

      {/* SLIDE GALLERY / LAB FEATURES */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              background: 'rgba(255,255,255,0.15)', color: '#93C5FD',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Turnkey Equipment & Setup
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.5rem)', fontWeight: 900, marginTop: '0.75rem' }}>
              What OLL Delivers in Your Composite Skill Lab
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { title: 'Modular Lab Architecture', desc: 'Designed to fit existing school rooms (600 - 1,200 sq. ft.) with flexible stations for life sciences, electronics, and human services.' },
              { title: '110-Hour Aligned Curriculum', desc: 'Grade-wise student activity books, teacher guides, lecture slides, and Kaushal Bodh project portfolios.' },
              { title: 'Full Equipment & Tool Inventory', desc: 'Hydroponics trays, sewing machines, woodwork tools, soldering kits, Raspberry Pi AI stations, and safety utilities.' },
              { title: 'Continuous Teacher Upskilling', desc: 'Onsite onboarding, semester refresher workshops, and LMS lesson plans so in-house faculty lead seamlessly.' },
            ].map((f, idx) => (
              <div key={idx} style={{
                background: 'rgba(255,255,255,0.08)', borderRadius: '1.25rem',
                border: '1px solid rgba(255,255,255,0.15)', padding: '1.75rem'
              }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.5rem', color: '#60A5FA' }}>
                  {f.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.55 }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SHARK TANK & CREDIBILITY */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem', alignItems: 'center', boxShadow: '0 12px 36px rgba(15, 30, 80, 0.05)'
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#EFF6FF', color: '#1D4ED8', borderRadius: '999px',
              padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem'
            }}>
              National Recognition
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.2rem)', fontWeight: 900, color: '#0A1F44', marginBottom: '1rem' }}>
              Backed by Shark Tank India & KBC Hot Seat
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              OLL provides educational institutions across India with validated, NEP 2020-compliant curricula, certified by STEM.org and recognized nationwide.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <a
                href={SHARK_TANK_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#2563EB' }} /> Watch Shark Tank
              </a>
              <a
                href={KBC_YT}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                  background: '#F1F5F9', color: '#0A1F44', padding: '0.65rem 1.1rem',
                  borderRadius: '0.75rem', fontSize: '0.85rem', fontWeight: 700,
                  textDecoration: 'none', border: '1px solid #CBD5E1'
                }}
              >
                <Play size={14} style={{ color: '#DC2626' }} /> Watch KBC
              </a>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <img
              src={SHARK_TANK_IMG}
              alt="OLL on Shark Tank and KBC"
              style={{
                width: '100%', maxHeight: 280, objectFit: 'contain',
                borderRadius: '1.25rem', border: '1px solid #E2E8F0'
              }}
            />
          </div>
        </div>
      </section>

      {/* LAB CONSULTATION FORM */}
      <section id="setup-consultation" style={{ maxWidth: 1000, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #0F172A 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff',
          boxShadow: '0 24px 60px rgba(10, 31, 68, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ maxWidth: 650, margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              background: 'rgba(37, 99, 235, 0.2)', color: '#60A5FA',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              School Lab Blueprint & Proposal
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.6rem)', fontWeight: 900, marginTop: '0.75rem', color: '#fff' }}>
              Bring the Composite Skill Lab to Your Campus
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Request a customized floorplan, equipment budget, and syllabus demo for your school.
            </p>
          </div>

          {submitted ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E',
              borderRadius: '1.25rem', padding: '2rem', textAlign: 'center'
            }}>
              <CheckCircle2 size={48} style={{ color: '#22C55E', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Consultation Request Received!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
                Our institutional lab architect will review your school requirements and reach out within 24 hours.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} data-testid="csl-consultation-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="school_name"
                    required
                    value={form.school_name}
                    onChange={handleChange}
                    placeholder="e.g. Delhi Public School"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Contact Person Name
                  </label>
                  <input
                    type="text"
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    placeholder="Principal / Trustee"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="10-digit Phone Number"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Official Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="principal@school.edu"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    City / State
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="e.g. Pune, Maharashtra"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Affiliated Board
                  </label>
                  <select
                    name="board"
                    value={form.board}
                    onChange={handleChange}
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: '#1E293B', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="CBSE">CBSE (Skill-75/2024)</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="csl-submit-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                    color: '#fff', padding: '1rem 2.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(37, 99, 235, 0.4)',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting...' : 'Request Lab Consultation & Floorplan'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* LMS & CROSS-LINKS */}
      <LMSSection theme="light" />
      <SchoolRelatedPrograms current="composite-skill-lab" theme="light" />
      <Footer />

      {/* ── High-Resolution Zoom Lightbox Modal ─────────── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6"
          onClick={() => setPreviewImage(null)}
          data-testid="csl-image-lightbox"
        >
          <div
            className="relative bg-white rounded-3xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-slate-50">
              <div className="pr-4">
                <h3 className="text-[#0A1F44] font-black text-base sm:text-lg leading-tight">
                  {previewImage.title}
                </h3>
                {previewImage.caption && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5 line-clamp-1">
                    {previewImage.caption}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 flex items-center justify-center transition-colors cursor-pointer border-none flex-shrink-0"
                aria-label="Close Preview"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/5 flex items-center justify-center">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-lg bg-white"
              />
            </div>
            <div className="px-5 py-3 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-semibold">
                Official CBSE Skill-75/2024 Composite Skill Lab Inventory &amp; Specifications
              </span>
              <button
                type="button"
                onClick={() => { setPreviewImage(null); setGateOpen(true); }}
                className="inline-flex items-center gap-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border-none cursor-pointer"
              >
                <Download size={14} /> Download Blueprint PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BROCHURE GATE MODAL */}
      <CurriculumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        pdfUrl={BROCHURE_PDF_URL}
        pdfName={BROCHURE_NAME}
        title="CBSE Composite Skill Lab (CSL) Brochure"
        offering="Composite Skill Lab (Grades 6-10)"
        program="CBSE Skill-75/2024 Composite Skill Lab"
        source="composite-skill-lab-gate"
        testid="csl-curriculum-gate"
      />

      {/* ── Mobile-only sticky bottom CTA (thumb-reachable) ─────────── */}
      <div className="icse-mobile-cta" data-testid="csl-mobile-cta">
        <button type="button" onClick={() => setGateOpen(true)} className="icse-btn outline" data-testid="csl-mobile-cta-brochure">
          <Download className="w-3.5 h-3.5" /> Blueprint PDF
        </button>
        <a href="#setup-consultation" className="icse-btn primary" data-testid="csl-mobile-cta-demo">
          Request Setup <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
