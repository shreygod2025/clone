/**
 * Father's Day Robotics Workshop landing page.
 * Hero: headline + photoframe carousel with I♥DAD watermark · rotating sun · spinning pinwheel
 * + How-the-day-runs · Pricing (+999 per extra child) · FAQ · Hand silhouette
 */
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Helmet } from 'react-helmet-async';
import {
  Calendar, Clock, MapPin, Heart, Shield, Sparkles, ArrowRight, ArrowLeft,
  Camera, Cpu, Zap, Wrench, X, Loader2, Phone, Plus, Minus, ChevronDown,
  Play, Video, Quote, Star,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { openCashfreeCheckout } from '../utils/cashfreeCheckout';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WORKSHOP_KEY = 'fathers-day-robotics';

const YELLOW = '#FCE899';
const YELLOW_DEEP = '#F9D162';
const SUN = '#FFB627';
const NAVY = '#1E40AF';
const NAVY_DEEP = '#0F2960';
const SKY = '#A8DCF0';
const CORAL = '#FF7B6B';

// Carousel — real workshop images (more to be added by client)
const CAROUSEL = [
  'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/b27p9fpm_IMG_20260525_105021.jpg',
];

const AGE_GROUPS = [
  { slug: '4-8',  label: 'Ages 4 – 8',  tagline: 'Tiny hands. Big imagination.', color: SUN,  emoji: '🌟',
    builds: ['Manual Swing 🛝', 'Motorised Merry-go-Round 🎠'],
    learns: ['Engineering basics', 'Electricity 101', 'How a motor works'],
    images: [
      // Image 1 — large, slight left tilt
      { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/wus3ar3y_1.png', alt: 'Manual Swing build', large: true,  rotate: -4 },
      // Image 2 — smaller, right tilt
      { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/y01nt59y_2.png', alt: 'Motorised Merry-go-Round build', large: false, rotate: 3 },
    ] },
  { slug: '9-12', label: 'Ages 9 – 12', tagline: 'Build a real working robot.',   color: NAVY, emoji: '🤖',
    builds: ['Edge Avoiding Robot 🚗', 'Circle Drawing Robot ⭕'],
    learns: ['Build a robot chassis', 'Add sensors', 'Wire motors', 'Power up & test'],
    images: [
      // Image 3 — large, overflow more, tilt right
      { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/580sl54n_3.png', alt: 'Edge Avoiding Robot build', large: true,  rotate: 5, overflow: 'extra' },
      // Image 4 — smaller, tilt left
      { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/tg3vboqf_4.png', alt: 'Circle Drawing Robot build', large: false, rotate: -4 },
    ] },
];

const CENTERS = [
  { slug: 'kandivali', label: 'OLL Center — Kandivali', area: 'West, Mumbai' },
  { slug: 'mira_road', label: 'OLL Center — Mira Road', area: 'Mira Bhayandar' },
];

const DAY_RUNS = [
  { t: 'Welcome',  d: 'Meet your build-station and your teammate for the day' },
  { t: 'Intro to Parts', d: 'Discover the wires, motors, sensors & their roles' },
  { t: 'Assemble Together', d: 'Build the robot side-by-side — adults & kids' },
  { t: 'Wire it up', d: 'Learn what every part does as you connect them' },
  { t: 'Games',      d: 'Play with your robot, your child &amp; your team' },
  { t: 'Photo Time', d: 'Take a picture with your robot — yours to keep' },
];

const FAQS = [
  { q: 'Do I need any technical background?', a: 'No. The session is built for complete beginners, adults and kids alike. Your instructor guides every step.' },
  { q: 'What ages is this for?', a: 'Designed for children aged 4 to 12. Younger kids (4–8) build hands-on circuits with more parent involvement; older kids (9–12) build a working robot. Everyone goes home happy.' },
  { q: 'Can I bring more than one child?', a: 'Yes! Add a second child for ₹999. Both kids get a build station with the parent guiding them.' },
  { q: 'Do we keep the robot?', a: 'The robot stays at OLL — but a printed photoframe of you and your child with the robot is yours to take home.' },
  { q: 'Is this online or in person?', a: 'In person at OLL Center, Kandivali or Mira Road. No kits shipped — everything is provided.' },
];

// ── Video testimonials (parents + students) ───────────────────────────────
const VIDEO_TESTIMONIALS = [
  { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/39v27qp3_Testimonial%20Parents.mp4',
    role: 'Parent',  name: 'OLL Parents',          line: '"Our kids come home buzzing about what they built."', accent: CORAL },
  { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/yl1ydmda_IMG_7029.MOV',
    role: 'Student', name: 'Young Builder · Grade 5', line: '"I made a robot that follows a line!"',           accent: NAVY },
  { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4boxtvd2_IMG_7035.MOV',
    role: 'Student', name: 'Young Coder · Grade 7',   line: '"I wrote my first Python game in class."',       accent: SUN },
  { src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/vo8r3dzk_IMG_7045.MOV',
    role: 'Student', name: 'Young Creator · Grade 9', line: '"3D-printed my own phone stand this week!"',     accent: CORAL },
];

// ── Real classroom media (images + videos) ───────────────────────────────
const CLASS_MEDIA = [
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/5h69is60_20260504_122331.mp4', label: 'Hands-on build',     caption: 'Kids assembling their first IoT & AI lab kit' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg', label: 'Live class',         caption: 'Working through a circuit module step by step' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/gwljm6r9_20260504_122607.jpg', label: 'Build station',      caption: 'Pair-builds with the OLL IoT & AI Lab Kit' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/04pgqymv_20260504_123958.mp4', label: 'In action',          caption: 'Real class footage — what a session feels like' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/tqatbciw_20260504_124243.jpg', label: 'Manipulative station', caption: 'Kids exploring components together' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9p89o2y6_20260504_154936.mp4', label: 'Class showcase',     caption: 'Students presenting what they built today' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rhwyg94z_20260504_163950.jpg', label: 'Batch of builders',  caption: 'End-of-class group photo — the whole crew' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/geb6vgey_VID20260504135039.mp4', label: 'Build moment',      caption: 'Mid-class hands-on — heads-down focus' },
];

// ── Written testimonials ──────────────────────────────────────────────────
const TEXT_TESTIMONIALS = [
  { name: 'Anita S., Grade 5 parent',  quote: 'My son went from gaming all weekend to spending Saturdays designing his own game. The shift in 3 months has been unreal.' },
  { name: 'Rajesh M., Grade 8 parent', quote: 'He builds robots at home now with parts he saves up for. The class lit a fire we didn\'t know was there.' },
  { name: 'Priya K., Grade 3 parent',  quote: 'Best investment beyond her academics. She actually looks forward to Saturdays.' },
];

export default function FathersDayWorkshopLandingPage() {
  const navigate = useNavigate();
  const [showEnroll, setShowEnroll] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ age_group: '', center: '', parent_phone: '', additional_children: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [carouselIdx, setCarouselIdx] = useState(0);
  const [openFaq, setOpenFaq] = useState(0);
  const [videoOpen, setVideoOpen] = useState(null);
  const [mediaOpen, setMediaOpen] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Close modals on Esc
  useEffect(() => {
    if (!videoOpen && !mediaOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setVideoOpen(null); setMediaOpen(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoOpen, mediaOpen]);

  // Auto-rotate carousel every 4s
  useEffect(() => {
    if (CAROUSEL.length <= 1) return;
    const t = setInterval(() => setCarouselIdx(i => (i + 1) % CAROUSEL.length), 4000);
    return () => clearInterval(t);
  }, []);

  // Navbar CTA opens modal
  useEffect(() => {
    const open = () => { setStep(0); setShowEnroll(true); };
    window.addEventListener('open-workshop-enroll', open);
    return () => window.removeEventListener('open-workshop-enroll', open);
  }, []);

  const openEnroll = () => { setStep(0); setForm({ age_group: '', center: '', parent_phone: '', additional_children: 0 }); setShowEnroll(true); };

  const handlePay = async () => {
    const phone = form.parent_phone.replace(/\D/g, '');
    if (phone.length < 10) return toast.error('Enter a valid 10-digit phone');
    setSubmitting(true);
    try {
      const reg = await axios.post(`${API}/workshops/register`, {
        workshop_key: WORKSHOP_KEY, parent_phone: phone,
        age_group: form.age_group, center: form.center,
        additional_children: Number(form.additional_children) || 0,
      });
      const bookingId = reg.data?.booking_id;
      if (!bookingId) throw new Error('Could not create booking');
      const pay = await axios.post(`${API}/workshops/initiate-payment`, {
        booking_id: bookingId, frontend_url: window.location.origin,
      });
      const sessionId = pay.data?.payment_session_id;
      if (!sessionId) throw new Error('Could not initiate payment');
      toast.success('Opening secure payment…');
      await openCashfreeCheckout({ paymentSessionId: sessionId, mode: 'production', redirectTarget: '_self' });
    } catch (e) {
      toast.error(e.response?.data?.detail || e.message || 'Booking failed — please retry');
      setSubmitting(false);
    }
  };

  const total = 1999 + (Number(form.additional_children) || 0) * 999;

  return (
    <div data-testid="fathers-day-landing" style={{ minHeight: '100vh', fontFamily: '"Fredoka", "Nunito", sans-serif', background: YELLOW }}>
      <Helmet>
        {/* Primary SEO */}
        <title>Father's Day Robotics Workshop Mumbai 2026 — Bond Over Learning | OLL</title>
        <meta name="description" content="Spend Father's Day 2026 building a real robot together with your child (ages 4–12). Screen-free workshop · Sunday 21 June · Kandivali & Mira Road, Mumbai · ₹1,999 per dad-child duo. Photoframe & memories to take home." />
        <meta name="keywords" content="Father's Day workshop Mumbai, robotics workshop for kids, dad and child activity Mumbai, Father's Day 2026, screen-free workshop, OLL robotics, STEM workshop Kandivali, STEM workshop Mira Road, parent-child bonding workshop, summer activity Mumbai" />
        <meta name="author" content="OLL — Skills for All" />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1" />
        <meta name="googlebot" content="index, follow" />
        <link rel="canonical" href="https://oll.co/workshops/fathers-day-robotics" />
        <meta name="theme-color" content="#1E40AF" />

        {/* Open Graph / Facebook / WhatsApp */}
        <meta property="og:type" content="event" />
        <meta property="og:site_name" content="OLL — Skills for All" />
        <meta property="og:url" content="https://oll.co/workshops/fathers-day-robotics" />
        <meta property="og:title" content="Father's Day Robotics Workshop — Bond Over Learning | OLL" />
        <meta property="og:description" content="3 uninterrupted hours building a real robot together — dad + child (ages 4–12). Sunday 21 June, 3–6 PM · Kandivali & Mira Road · ₹1,999." />
        <meta property="og:image" content={CAROUSEL[0]} />
        <meta property="og:image:alt" content="Children with their robots at OLL Father's Day workshop" />
        <meta property="og:locale" content="en_IN" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Father's Day Robotics Workshop — Bond Over Learning | OLL" />
        <meta name="twitter:description" content="3 hours · screen-free · dad-and-child robot build · Sunday 21 June, Mumbai. ₹1,999 per duo." />
        <meta name="twitter:image" content={CAROUSEL[0]} />
        <meta name="twitter:image:alt" content="OLL Father's Day Robotics Workshop" />

        {/* Mobile / PWA hints */}
        <meta name="format-detection" content="telephone=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />

        {/* Structured data — Event */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'Event',
          name: "Father's Day Robotics Workshop — Bond Over Learning",
          description: "A 3-hour screen-free Father's Day workshop where dads and kids (ages 4–12) build a real robot together at OLL Mumbai.",
          startDate: '2026-06-21T15:00:00+05:30',
          endDate: '2026-06-21T18:00:00+05:30',
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          location: [
            { '@type': 'Place', name: 'OLL Center — Kandivali', address: { '@type': 'PostalAddress', addressLocality: 'Kandivali West', addressRegion: 'Maharashtra', addressCountry: 'IN' } },
            { '@type': 'Place', name: 'OLL Center — Mira Road',  address: { '@type': 'PostalAddress', addressLocality: 'Mira Bhayandar', addressRegion: 'Maharashtra', addressCountry: 'IN' } },
          ],
          image: [CAROUSEL[0]],
          organizer: { '@type': 'Organization', name: 'OLL — Skills for All', url: 'https://oll.co' },
          offers: {
            '@type': 'Offer', url: 'https://oll.co/workshops/fathers-day-robotics', price: '1999',
            priceCurrency: 'INR', availability: 'https://schema.org/InStock',
            validFrom: '2026-05-15T00:00:00+05:30',
          },
        })}</script>

        {/* FAQ structured data */}
        <script type="application/ld+json">{JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: FAQS.map(f => ({
            '@type': 'Question', name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        })}</script>

        <link href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Caveat:wght@500;700&family=Bungee&display=swap" rel="stylesheet" />
      </Helmet>

      <Navbar variant="workshop" />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="pb-10 sm:pb-12 lg:pb-12" style={{ background: `linear-gradient(180deg, ${YELLOW} 0%, ${YELLOW} 55%, ${SKY} 100%)`, position: 'relative', overflow: 'hidden' }}>
        {/* keyframes for ambient hero animations */}
        <style>{`
          @keyframes fd-sun-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fd-sun-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.06); } }
          @keyframes fd-pinwheel-spin { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
          @keyframes fd-pinwheel-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
          .fd-sun-rotor   { animation: fd-sun-spin 22s linear infinite; transform-origin: 50% 50%; }
          .fd-sun-pulser  { animation: fd-sun-pulse 3.2s ease-in-out infinite; transform-origin: 50% 50%; }
          .fd-pinwheel    { animation: fd-pinwheel-spin 2.4s linear infinite; transform-origin: 50% 50%; }
          .fd-pinwheel-wrap { animation: fd-pinwheel-bob 3.6s ease-in-out infinite; }
          .fd-hero-sun {
            position: absolute; top: 8px; right: 10px; width: 64px; height: 64px;
            pointer-events: none; z-index: 1;
          }
          @media (min-width: 640px) {
            .fd-hero-sun { top: 12px; right: 14px; width: 88px; height: 88px; }
          }
          @media (min-width: 1024px) {
            .fd-hero-sun { top: 14px; right: 18px; width: 120px; height: 120px; }
          }

          /* Animated hand-drawn underline — strokes in once on load */
          @keyframes fd-draw-underline { to { stroke-dashoffset: 0; } }
          .fd-underline-path {
            stroke-dasharray: 700;
            stroke-dashoffset: 700;
            animation: fd-draw-underline 1.4s cubic-bezier(0.22, 1, 0.36, 1) 0.4s forwards;
          }

          /* Enroll button — diagonal bouncy wiggle to grab the eye */
          @keyframes fd-enroll-wiggle {
            0%, 100%    { transform: translateY(0) rotate(0deg); }
            18%         { transform: translateY(-6px) rotate(-2deg); }
            36%         { transform: translateY(0)    rotate(0deg); }
            54%         { transform: translateY(-4px) rotate(2deg); }
            72%         { transform: translateY(0)    rotate(0deg); }
          }
          @keyframes fd-arrow-nudge {
            0%, 100% { transform: translateX(0); }
            50%      { transform: translateX(4px); }
          }
          .fd-enroll-btn {
            animation: fd-enroll-wiggle 3.4s ease-in-out 1.4s infinite;
            transform-origin: center;
            transition: transform 0.15s ease;
          }
          .fd-enroll-btn:hover {
            animation-play-state: paused;
            transform: scale(1.05) rotate(-1.5deg);
          }
          .fd-enroll-arrow { animation: fd-arrow-nudge 1.6s ease-in-out infinite; }

          @media (prefers-reduced-motion: reduce) {
            .fd-sun-rotor, .fd-sun-pulser, .fd-pinwheel, .fd-pinwheel-wrap,
            .fd-enroll-btn, .fd-enroll-arrow { animation: none; }
            .fd-underline-path { stroke-dashoffset: 0; animation: none; }
          }
        `}</style>

        {/* Decorative animated sun — top-right corner of hero (shrinks on mobile) */}
        <div aria-hidden="true" className="fd-hero-sun" data-testid="hero-sun">
          <svg viewBox="0 0 100 100" className="fd-sun-pulser" style={{ width: '100%', height: '100%' }}>
            <g className="fd-sun-rotor">
              {Array.from({ length: 12 }).map((_, i) => (
                <rect key={i} x="48" y="4" width="4" height="14" rx="2" fill={SUN}
                  transform={`rotate(${i * 30} 50 50)`} />
              ))}
            </g>
            <circle cx="50" cy="50" r="22" fill={SUN} stroke={YELLOW_DEEP} strokeWidth="2" />
            <circle cx="43" cy="47" r="2" fill={NAVY_DEEP} />
            <circle cx="57" cy="47" r="2" fill={NAVY_DEEP} />
            <path d="M 43 56 Q 50 61 57 56" stroke={NAVY_DEEP} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          </svg>
        </div>

        {/* Hero doodle layer — hearts, squiggles, sparkles */}
        <Doodles preset="hero" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 lg:pt-14 relative" style={{ zIndex: 2 }}>
          <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 items-center">
            {/* Left — headline only */}
            <div className="text-center lg:text-left">
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '6px 14px', background: '#FFFFFF', border: `2px solid ${NAVY}`, borderRadius: 999, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: NAVY }}>
                Father's Day · 1-Day Event
              </span>
              <h1 className="mt-6 leading-[1.04]" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif', fontWeight: 700, fontSize: 'clamp(2.1rem, 5.2vw, 4rem)', letterSpacing: '-0.01em' }}>
                This Father&apos;s Day,<br />
                <span style={{ display: 'inline-block', position: 'relative' }}>
                  Bond over Learning
                  {/* Animated hand-drawn curvy underline */}
                  <svg viewBox="0 0 320 22" preserveAspectRatio="none"
                    style={{ position: 'absolute', left: 0, right: 0, bottom: -14, width: '100%', height: 22, pointerEvents: 'none', overflow: 'visible' }}
                    aria-hidden="true">
                    <path className="fd-underline-path"
                      d="M 4 14 Q 50 4, 96 12 T 188 12 T 280 9 Q 305 7, 316 14"
                      stroke={SUN} strokeWidth="6" strokeLinecap="round" fill="none" />
                  </svg>
                </span>
              </h1>
              <p className="mt-7" style={{ fontFamily: '"Caveat", cursive', color: CORAL, fontSize: 'clamp(1.35rem, 3vw, 2.1rem)', fontWeight: 700, lineHeight: 1.2 }}>
                Father&apos;s Day Screen-Free Robotics Workshop
              </p>
              <p className="mt-4 text-sm sm:text-base lg:text-lg max-w-xl mx-auto lg:mx-0 leading-relaxed" style={{ color: '#1F2937' }}>
                3 hours of zero screens, full smiles. Bond with your child while you build a real robot.
              </p>
              <div className="mt-7 flex flex-wrap justify-center lg:justify-start gap-2 sm:gap-2.5">
                <Pill icon={Calendar} text="Sunday, 21 June" />
                <Pill icon={Clock}    text="2 hours" />
                <Pill icon={Sparkles} text="Ages 4 – 12" />
                <Pill icon={MapPin}   text="Mumbai" />
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-center lg:justify-start gap-4">
                <button onClick={openEnroll} data-testid="hero-enroll-btn"
                  className="fd-enroll-btn px-7 sm:px-8 py-3.5 sm:py-4 rounded-full text-sm sm:text-base font-bold inline-flex items-center gap-2 shadow-xl"
                  style={{ background: NAVY, color: '#fff', fontFamily: '"Fredoka", sans-serif' }}>
                  Enroll Now <ArrowRight className="w-5 h-5 fd-enroll-arrow" />
                </button>
                <div className="text-xs sm:text-sm font-semibold" style={{ color: NAVY }}>Limited seats per center</div>
              </div>
            </div>

            {/* Right — Photoframe + pinwheel (smaller on mobile) */}
            <div className="relative" style={{ minHeight: 'auto' }}>
              {/* Spinning pinwheel — peeks out from below the photoframe (right side) */}
              <div aria-hidden="true" className="fd-pinwheel-wrap" data-testid="hero-pinwheel"
                style={{ position: 'absolute', bottom: 'clamp(-44px, -10vw, -36px)', right: 'clamp(10px, 4vw, 24px)', width: 'clamp(58px, 14vw, 78px)', height: 'clamp(58px, 14vw, 78px)', zIndex: 3, pointerEvents: 'none' }}>
                <svg viewBox="0 0 100 100" className="fd-pinwheel" style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 4px 8px rgba(15,30,80,0.35))' }}>
                  <path d="M50 50 L50 6 Q72 14 50 50 Z"  fill={CORAL} />
                  <path d="M50 50 L94 50 Q86 72 50 50 Z" fill={SUN} />
                  <path d="M50 50 L50 94 Q28 86 50 50 Z" fill={NAVY} />
                  <path d="M50 50 L6 50  Q14 28 50 50 Z" fill="#FFFFFF" stroke={NAVY} strokeWidth="1" />
                  <circle cx="50" cy="50" r="6" fill={NAVY_DEEP} />
                </svg>
              </div>

              <div style={{ position: 'relative', zIndex: 2 }}>
                <Photoframe imgSrc={CAROUSEL[carouselIdx]} />
                {CAROUSEL.length > 1 && (
                  <div className="flex justify-center gap-1.5 mt-3">
                    {CAROUSEL.map((_, i) => (
                      <button key={i} onClick={() => setCarouselIdx(i)}
                        className="w-2 h-2 rounded-full transition-all"
                        style={{ background: i === carouselIdx ? NAVY : 'rgba(30,64,175,0.25)', width: i === carouselIdx ? 24 : 8 }}
                        data-testid={`carousel-dot-${i}`} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── USP STRIP ───────────────────────────────────── */}
      <section style={{ background: SKY, position: 'relative', overflow: 'hidden' }} className="py-8 sm:py-12 lg:py-12">
        <Doodles preset="usp" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 gap-4 relative" style={{ zIndex: 1 }}>
          <FeatureCard color={CORAL} icon={Heart}  title="Bonding time, no screens" sub="3 hours of fully present, hands-on time — building together." />
          <FeatureCard color={NAVY}  icon={Shield} title="100% screen-free zone"    sub="No phones, tablets or laptops. Just kits, smiles, and creativity." />
        </div>
      </section>

      {/* ── WHY THIS MATTERS (callout) ─────────────────── */}
      <section style={{ background: '#FFFEF7', position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
        <Doodles preset="why" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center" style={{ zIndex: 1 }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[10px] sm:text-xs uppercase tracking-[0.16em] font-bold" style={{ background: `${CORAL}18`, color: CORAL, border: `1.5px solid ${CORAL}50` }}>
            <Heart className="w-3 h-3" /> Why this Father&apos;s Day matters
          </div>
          <p className="mt-5 sm:mt-6" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif', fontWeight: 500, fontSize: 'clamp(1.15rem, 2.2vw, 1.6rem)', lineHeight: 1.5 }} data-testid="why-paragraph">
            Most Father&apos;s Day plans are a meal and a card.<br className="hidden sm:inline" />
            This one gives you a few uninterrupted hours with your child, working on the same thing, side by side. You build a real robot together, from parts. They walk away knowing how the machines around them actually work. You walk away having spent the day as a team.
          </p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <SquigglyLine width={60} />
            <Heart className="w-5 h-5" style={{ color: CORAL, fill: CORAL }} />
            <SquigglyLine width={60} flip />
          </div>
        </div>
      </section>

      {/* ── WHAT WILL YOU BUILD ─────────────────────────── */}
      <Section bg={SKY} decor="build">
        <SectionLabel>The Build</SectionLabel>
        <H2>What will you build together?</H2>
        <div className="grid lg:grid-cols-2 gap-y-12 gap-x-5 mt-16 sm:mt-20 lg:mt-24">
          {AGE_GROUPS.map(g => (
            <div key={g.slug} className="rounded-3xl p-6 sm:p-8 pt-0 sm:pt-0 shadow-lg relative" style={{ background: '#FFFEF7', border: `3px solid ${g.color}` }} data-testid={`age-card-${g.slug}`}>
              {/* ── Project image collage — transparent, overflowing the card top ── */}
              {g.images && (
                <div className="-mt-12 sm:-mt-16 lg:-mt-20 mb-4 grid grid-cols-5 gap-2 sm:gap-4 items-end pointer-events-none select-none" data-testid={`age-images-${g.slug}`}>
                  {g.images.map((im, i) => (
                    <div key={i}
                      className={im.large ? 'col-span-3' : 'col-span-2'}
                      style={{
                        transform: im.overflow === 'extra'
                          ? `rotate(${im.rotate}deg) scale(1.22) translateY(-8%)`
                          : `rotate(${im.rotate}deg)`,
                        filter: 'drop-shadow(0 12px 24px rgba(15,30,80,0.22))',
                        aspectRatio: im.large ? '1 / 1' : '4 / 5',
                        transformOrigin: 'center bottom',
                      }}>
                      <img src={im.src} alt={im.alt}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', background: 'transparent', mixBlendMode: 'multiply' }}
                        loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="font-black uppercase leading-none" style={{ color: g.color, fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)', letterSpacing: '0.02em' }}>{g.label}</div>
                  <div className="text-xs sm:text-sm mt-2 font-semibold" style={{ color: '#475569' }}>{g.tagline}</div>
                </div>
                <div className="text-3xl sm:text-4xl flex-shrink-0">{g.emoji}</div>
              </div>
              <div className="mt-3">
                <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">You&apos;ll Build</div>
                <ul className="space-y-2">
                  {g.builds.map(b => (
                    <li key={b} className="flex items-center gap-3 text-base font-semibold" style={{ color: NAVY_DEEP }}>
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.color }} />{b}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5 pt-4 border-t" style={{ borderColor: `${g.color}30` }}>
                <div className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">You&apos;ll Learn</div>
                <div className="flex flex-wrap gap-2">
                  {g.learns.map(l => (
                    <span key={l} className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: `${g.color}18`, color: g.color, border: `1.5px solid ${g.color}50` }}>{l}</span>
                  ))}
                </div>
              </div>
              <button onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); setShowEnroll(true); }}
                className="mt-5 w-full font-bold py-3.5 rounded-full inline-flex items-center justify-center gap-2 text-sm transition-transform hover:scale-[1.02]"
                style={{ background: NAVY, color: '#fff' }} data-testid={`enroll-from-age-${g.slug}`}>
                Enroll {g.label} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* ── HOW THE DAY RUNS ─────────────────────────── */}
      <section style={{ background: NAVY_DEEP, color: '#fff', position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
        <Doodles preset="dark" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
          <SectionLabel light>The Session</SectionLabel>
          <H2 light>How the day runs</H2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8" data-testid="how-the-day-runs">
            {DAY_RUNS.map((s, i) => (
              <div key={s.t} className="rounded-2xl p-5 relative" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <div className="absolute -top-3 -left-3 w-9 h-9 rounded-full flex items-center justify-center font-black text-base shadow-lg" style={{ background: SUN, color: NAVY_DEEP }}>{i + 1}</div>
                <div className="font-bold text-lg" style={{ fontFamily: '"Fredoka", sans-serif' }}>{s.t}</div>
                <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.78)' }} dangerouslySetInnerHTML={{ __html: s.d }} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT WILL CHILD LEARN ─────────────────────────── */}
      <section style={{ background: NAVY, position: 'relative', overflow: 'hidden' }} className="text-white py-12 sm:py-16 lg:py-20">
        <Doodles preset="dark" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
          <SectionLabel light>The Learning</SectionLabel>
          <H2 light>What will your child learn?</H2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[{i:Zap,t:'Electricity & Circuits',s:'How current, batteries, and switches actually work'},
              {i:Cpu,t:'Motors & Movement',s:'Turning electricity into motion — the heart of robotics'},
              {i:Wrench,t:'Engineering Mindset',s:'Plan it · Build it · Test it · Fix it · Improve it'},
              {i:Sparkles,t:'Sensor Logic',s:'How robots "see" obstacles and follow paths'}].map(({i:Icon,t,s}) => (
              <div key={t} className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
                <Icon className="w-7 h-7 mb-3" style={{ color: SUN }} />
                <div className="font-bold text-base">{t}</div>
                <div className="text-sm mt-1.5 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{s}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHAT YOU GET ─────────────────────────── */}
      <Section bg={YELLOW} decor="warm">
        <SectionLabel>The Take-home</SectionLabel>
        <H2>What will you get?</H2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          {[
            { i: Camera, t: 'Take-home Photoframe', s: 'A printed memento of you & your child at the workshop' },
            { i: Heart,  t: 'Lifelong Memories',     s: 'Bonding over building something real, together' },
            { i: Sparkles, t: 'Hands-on Learning',   s: "STEM concepts they'll remember for years" },
          ].map(({ i: Icon, t, s }) => (
            <div key={t} className="rounded-2xl p-6 shadow-md" style={{ background: '#FFFEF7', border: `2px solid ${SKY}` }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: SKY, color: NAVY }}><Icon className="w-6 h-6" /></div>
              <div className="text-lg font-bold" style={{ color: NAVY_DEEP }}>{t}</div>
              <div className="text-sm mt-2 leading-relaxed text-slate-600">{s}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── CLASS MOMENTS GALLERY ─────────────────── */}
      <section style={{ background: '#FFFEF7', position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
        <Doodles preset="warm" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-8">
            <SectionLabel>Real moments · Real builds</SectionLabel>
            <H2>Inside an OLL classroom</H2>
            <p className="text-sm text-slate-500 mt-2 italic">Tap any tile to play / view</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3" data-testid="fd-class-gallery">
            {CLASS_MEDIA.map((m, i) => (
              <button key={i} onClick={() => setMediaOpen(m)}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-lg transition-all hover:scale-[1.02] hover:shadow-2xl"
                style={{ border: `2px solid ${SKY}`, background: NAVY_DEEP }}
                data-testid={`fd-gallery-${i}`}
                aria-label={`View ${m.label}`}>
                {m.type === 'video' ? (
                  <LazyVideoPreview src={m.src} />
                ) : (
                  <img src={m.src} alt={m.label} loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F2960] via-[#0F2960]/30 to-transparent" />
                <div className="absolute top-2.5 left-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase text-white backdrop-blur-sm border"
                    style={{ background: m.type === 'video' ? `${CORAL}cc` : `${NAVY}cc`, borderColor: m.type === 'video' ? CORAL : SKY }}>
                    {m.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                    {m.type === 'video' ? 'Video' : 'Photo'}
                  </span>
                </div>
                {m.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/50 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#FF7B6B] group-hover:border-[#FF7B6B] transition-all shadow-2xl">
                      <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
                    </div>
                  </div>
                )}
                <div className="absolute bottom-0 inset-x-0 p-3 text-left">
                  <div className="text-xs font-black text-white leading-tight">{m.label}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS (Video + Text) ─────────────────── */}
      <section style={{ background: SKY, position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
        <Doodles preset="usp" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-8">
            <SectionLabel>Loved by families</SectionLabel>
            <H2>Hear from our parents &amp; students</H2>
          </div>

          {/* Video testimonials */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-10" data-testid="fd-video-testimonials">
            {VIDEO_TESTIMONIALS.map((v, i) => (
              <button key={i} onClick={() => setVideoOpen(v)}
                className="group relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg transition-all hover:-translate-y-0.5 hover:shadow-2xl"
                style={{ border: `2px solid ${v.accent}`, background: NAVY_DEEP }}
                data-testid={`fd-video-testimonial-${i}`}
                aria-label={`Play ${v.role} testimonial`}>
                <LazyVideoPreview src={v.src} />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0F2960] via-[#0F2960]/40 to-[#0F2960]/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl"
                    style={{ '--hover-bg': v.accent }}>
                    <Play className="w-6 h-6 text-white fill-white translate-x-0.5" />
                  </div>
                </div>
                <div className="absolute top-3 left-3">
                  <span className="text-[9px] font-black tracking-widest uppercase text-white px-2 py-1 rounded-full backdrop-blur-sm border"
                    style={{ background: `${v.accent}cc`, borderColor: v.accent }}>
                    {v.role}
                  </span>
                </div>
                <div className="absolute bottom-0 inset-x-0 p-3 text-left">
                  <div className="text-xs font-black text-white leading-tight">{v.name}</div>
                  <div className="text-[10px] mt-1 leading-snug line-clamp-2" style={{ color: '#A8DCF0' }}>{v.line}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Text testimonials */}
          <div className="grid md:grid-cols-3 gap-4" data-testid="fd-text-testimonials">
            {TEXT_TESTIMONIALS.map((t, i) => (
              <div key={i} className="rounded-2xl p-6 shadow-md" style={{ background: '#FFFEF7', border: `2px solid ${SKY}` }} data-testid={`fd-testimonial-${i}`}>
                <Quote className="w-6 h-6 mb-3" style={{ color: `${CORAL}99` }} />
                <p className="text-sm leading-relaxed italic" style={{ color: '#475569' }}>"{t.quote}"</p>
                <div className="flex items-center gap-1 mt-3 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5" style={{ color: CORAL, fill: CORAL }} />)}
                </div>
                <div className="text-xs font-bold" style={{ color: NAVY_DEEP }}>{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────── */}
      <section style={{ background: YELLOW, position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
        <Doodles preset="warm" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative" style={{ zIndex: 1 }}>
          <SectionLabel>Pricing</SectionLabel>
          <H2>One price. Everything included.</H2>
          <div className="mt-8 rounded-3xl p-8 sm:p-10 shadow-2xl text-white relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }} data-testid="pricing-card">
            <div className="text-[11px] uppercase tracking-widest font-bold" style={{ color: SUN }}>Father-Child Pair</div>
            <div className="mt-2 font-black" style={{ fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(2.6rem, 6vw, 4rem)', lineHeight: 1 }}>₹1,999</div>
            <div className="text-base mt-1" style={{ color: 'rgba(255,255,255,0.78)' }}>per father-and-child duo</div>
            <p className="mt-5 max-w-md mx-auto text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>Includes everything: robot kit, materials, photoframe, refreshments — hardware yours to keep where applicable.</p>
            <div className="mt-5 inline-block rounded-full px-4 py-2 text-sm font-bold" style={{ background: 'rgba(252,232,153,0.18)', color: SUN, border: `1px solid ${SUN}55` }}>
              + ₹999 for each additional child
            </div>
            <button onClick={openEnroll} data-testid="pricing-cta-btn"
              className="mt-7 px-8 py-4 rounded-full font-bold text-base inline-flex items-center gap-2 shadow-xl hover:scale-[1.03] transition-transform"
              style={{ background: SUN, color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>
              Book your Father&apos;s Day session <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────── */}
      <Section bg={YELLOW} decor="warm">
        <div className="text-center">
          <SectionLabel>FAQ</SectionLabel>
          <H2>Quick answers</H2>
        </div>
        <div className="mt-8 max-w-3xl mx-auto space-y-3" data-testid="faq-section">
          {FAQS.map((f, i) => (
            <div key={f.q} className="rounded-2xl overflow-hidden" style={{ background: '#FFFEF7', border: `2px solid ${SKY}` }}>
              <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 p-5 text-left" data-testid={`faq-q-${i}`}>
                <span className="font-bold text-base sm:text-lg" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>{f.q}</span>
                <ChevronDown className="w-5 h-5 flex-shrink-0 transition-transform" style={{ color: NAVY, transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }} />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-5 text-base leading-relaxed" style={{ color: '#475569' }}>{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {showEnroll && (
        <EnrollModal step={step} setStep={setStep} form={form} setForm={setForm} total={total} submitting={submitting} onPay={handlePay} onClose={() => setShowEnroll(false)} />
      )}

      {/* ── Class media modal ───────────────────────── */}
      {mediaOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMediaOpen(null); }}
          data-testid="fd-media-modal">
          <button onClick={(e) => { e.stopPropagation(); setMediaOpen(null); }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#FF7B6B] border border-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm z-10"
            aria-label="Close">
            <X className="w-5 h-5 pointer-events-none" />
          </button>
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/60" style={{ background: NAVY_DEEP }}>
              {mediaOpen.type === 'video' ? (
                <video src={mediaOpen.src} controls autoPlay playsInline className="w-full max-h-[75vh] bg-black">
                  Your browser doesn't support inline video.
                </video>
              ) : (
                <img src={mediaOpen.src} alt={mediaOpen.label} className="w-full max-h-[80vh] object-contain bg-black" />
              )}
              <div className="p-4 sm:p-5">
                <div className="text-[10px] font-black tracking-widest uppercase" style={{ color: SUN }}>{mediaOpen.type === 'video' ? 'Class footage' : 'Class moment'}</div>
                <div className="text-base sm:text-lg font-black text-white mt-1">{mediaOpen.label}</div>
                <p className="text-sm mt-1" style={{ color: '#A8DCF0' }}>{mediaOpen.caption}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Video testimonial modal ─────────────────────────── */}
      {videoOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setVideoOpen(null); }}
          data-testid="fd-video-modal">
          <button onClick={(e) => { e.stopPropagation(); setVideoOpen(null); }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#FF7B6B] border border-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm z-10"
            aria-label="Close video">
            <X className="w-5 h-5 pointer-events-none" />
          </button>
          <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
            <div className="rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/60" style={{ background: NAVY_DEEP }}>
              <video src={videoOpen.src} controls autoPlay playsInline className="w-full max-h-[75vh] bg-black">
                Your browser doesn't support inline video.
              </video>
              <div className="p-4 sm:p-5">
                <div className="text-[10px] font-black tracking-widest uppercase" style={{ color: SUN }}>{videoOpen.role}</div>
                <div className="text-base sm:text-lg font-black text-white mt-1">{videoOpen.name}</div>
                <p className="text-sm mt-1 italic" style={{ color: '#A8DCF0' }}>{videoOpen.line}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Photoframe = ({ imgSrc }) => (
  <div className="w-full mx-auto relative px-2 sm:px-0" style={{ maxWidth: 460 }} data-testid="photoframe-carousel">
    <div className="rounded-2xl sm:rounded-3xl relative overflow-hidden" style={{
      background: NAVY,
      padding: 'clamp(36px, 8vw, 60px) clamp(16px, 5vw, 28px) clamp(54px, 12vw, 90px)',
      boxShadow: '0 16px 40px rgba(15,30,80,0.3)',
    }}>
      {/* Yellow bunting at top */}
      <svg viewBox="0 0 400 60" style={{ position: 'absolute', top: 12, left: 0, right: 0, width: '100%' }} aria-hidden="true">
        <path d="M 0 5 Q 200 30 400 5" stroke={SUN} strokeWidth="1.5" fill="none" />
        {Array.from({ length: 9 }).map((_, i) => {
          const x = 30 + i * 42;
          return (
            <g key={i} transform={`translate(${x},${5 + Math.sin(i / 2) * 4})`}>
              <path d="M 0 0 L 18 0 L 9 22 Z" fill={SUN} stroke={YELLOW_DEEP} strokeWidth="0.6" />
              <circle cx="9" cy="11" r="2.5" fill={NAVY} />
            </g>
          );
        })}
      </svg>
      {/* White photo area */}
      <div style={{ background: '#fff', borderRadius: 8, aspectRatio: '4 / 5', overflow: 'hidden', position: 'relative', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
        <img src={imgSrc} alt="OLL workshop moment" style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.6s ease' }} />
      </div>
      {/* "Happy Father's Day" branding bottom-left */}
      <div style={{ position: 'absolute', bottom: 14, left: 18, lineHeight: 1, transform: 'rotate(-2deg)' }}>
        <div style={{ fontFamily: '"Bungee", sans-serif', color: SUN, fontSize: '0.7rem', letterSpacing: '0.18em' }}>HAPPY</div>
        <div style={{ fontFamily: '"Caveat", cursive', color: SUN, fontSize: '2rem', fontWeight: 700, marginTop: -4 }}>Father&apos;s</div>
        <div style={{ fontFamily: '"Bungee", sans-serif', color: '#fff', fontSize: '0.7rem', letterSpacing: '0.18em', marginTop: 2 }}>DAY</div>
      </div>
      {/* Sparkles */}
      <svg viewBox="0 0 100 100" style={{ position: 'absolute', bottom: 14, right: 14, width: 60, height: 60, opacity: 0.9 }} aria-hidden="true">
        <path d="M50 10 L54 42 L86 50 L54 58 L50 90 L46 58 L14 50 L46 42 Z" fill={SUN} />
      </svg>
    </div>
  </div>
);

const Pill = ({ icon: Icon, text }) => (
  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold shadow-sm" style={{ background: '#FFFFFF', color: NAVY, border: `2px solid ${NAVY}20` }}>
    <Icon className="w-4 h-4" /> {text}
  </div>
);

const SectionLabel = ({ children, light }) => (
  <div className="text-xs uppercase tracking-widest font-bold" style={{ color: light ? SUN : CORAL }}>{children}</div>
);

const H2 = ({ children, light }) => (
  <h2 className="font-bold mt-2" style={{ color: light ? '#fff' : NAVY_DEEP, fontFamily: '"Fredoka", sans-serif', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}>{children}</h2>
);

const Section = ({ bg, children, decor }) => (
  <section style={{ background: bg, position: 'relative', overflow: 'hidden' }} className="py-12 sm:py-16 lg:py-20">
    {decor && <Doodles preset={decor} />}
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative" style={{ zIndex: 1 }}>{children}</div>
  </section>
);

const FeatureCard = ({ color, icon: Icon, title, sub }) => (
  <div className="rounded-3xl p-6 shadow-lg" style={{ background: '#FFFEF7', border: `2px solid ${color}40` }}>
    <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: `${color}18`, color }}><Icon className="w-6 h-6" /></div>
    <div className="text-lg font-bold" style={{ color: NAVY_DEEP, fontFamily: '"Fredoka", sans-serif' }}>{title}</div>
    <div className="text-sm mt-1.5 leading-relaxed text-slate-600">{sub}</div>
  </div>
);

function EnrollModal({ step, setStep, form, setForm, total, submitting, onPay, onClose }) {
  const setExtras = (n) => setForm(p => ({ ...p, additional_children: Math.max(0, Math.min(5, n)) }));
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4" data-testid="enroll-modal">
      <div className="w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl max-h-[92vh] overflow-y-auto" style={{ background: '#FFFEF7', fontFamily: '"Fredoka", sans-serif' }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs uppercase tracking-widest font-bold" style={{ color: CORAL }}>Step {step + 1} of 3</div>
          <button onClick={onClose} className="text-slate-400" data-testid="enroll-close"><X className="w-5 h-5" /></button>
        </div>
        <div className="h-1.5 rounded-full mb-5 overflow-hidden" style={{ background: SKY }}>
          <div className="h-full transition-all duration-300" style={{ width: `${((step + 1) / 3) * 100}%`, background: `linear-gradient(90deg, ${NAVY}, ${SUN})` }} />
        </div>

        {step === 0 && (
          <div>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>How old is your child?</h3>
            <p className="text-sm mt-1 text-slate-500">We split projects by age so it&apos;s just right.</p>
            <div className="mt-5 space-y-3">
              {AGE_GROUPS.map(g => (
                <button key={g.slug} onClick={() => { setForm(p => ({ ...p, age_group: g.slug })); setStep(1); }}
                  className="w-full text-left rounded-2xl p-4 transition-all hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.age_group === g.slug ? g.color : '#E2E8F0'}`, background: form.age_group === g.slug ? `${g.color}10` : '#fff' }}
                  data-testid={`modal-age-${g.slug}`}>
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{g.emoji}</div>
                    <div>
                      <div className="font-bold" style={{ color: NAVY_DEEP }}>{g.label}</div>
                      <div className="text-sm mt-0.5 text-slate-500">{g.tagline}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <button onClick={() => setStep(0)} className="text-xs inline-flex items-center gap-1 mb-3 text-slate-500"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>Pick your center</h3>
            <p className="text-sm mt-1 text-slate-500">Two locations available.</p>
            <div className="mt-5 space-y-3">
              {CENTERS.map(c => (
                <button key={c.slug} onClick={() => { setForm(p => ({ ...p, center: c.slug })); setStep(2); }}
                  className="w-full text-left rounded-2xl p-4 transition-all flex items-start gap-3 hover:scale-[1.01]"
                  style={{ border: `2.5px solid ${form.center === c.slug ? NAVY : '#E2E8F0'}`, background: form.center === c.slug ? `${NAVY}10` : '#fff' }}
                  data-testid={`modal-center-${c.slug}`}>
                  <MapPin className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: NAVY }} />
                  <div>
                    <div className="font-bold" style={{ color: NAVY_DEEP }}>{c.label}</div>
                    <div className="text-sm mt-0.5 text-slate-500">{c.area}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <button onClick={() => setStep(1)} className="text-xs inline-flex items-center gap-1 mb-3 text-slate-500"><ArrowLeft className="w-3 h-3" /> Back</button>
            <h3 className="text-xl font-bold" style={{ color: NAVY_DEEP }}>Confirm &amp; pay</h3>

            {/* Additional children selector */}
            <div className="mt-4 rounded-2xl p-4" style={{ background: YELLOW, border: `2px solid ${YELLOW_DEEP}` }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-sm" style={{ color: NAVY_DEEP }}>Additional children</div>
                  <div className="text-xs text-slate-600 mt-0.5">₹999 per extra child</div>
                </div>
                <div className="inline-flex items-center gap-2">
                  <button onClick={() => setExtras((form.additional_children || 0) - 1)}
                    disabled={!form.additional_children} data-testid="extras-minus"
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{ background: '#fff', border: `2px solid ${NAVY}40`, color: NAVY }}>
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="font-black text-lg w-6 text-center" style={{ color: NAVY_DEEP }} data-testid="extras-count">{form.additional_children || 0}</span>
                  <button onClick={() => setExtras((form.additional_children || 0) + 1)}
                    disabled={(form.additional_children || 0) >= 5} data-testid="extras-plus"
                    className="w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40 transition-colors"
                    style={{ background: NAVY, color: '#fff' }}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: '#fff', border: `2px solid ${SKY}` }}>
              <Row k="Age group" v={AGE_GROUPS.find(g => g.slug === form.age_group)?.label} />
              <Row k="Center"    v={CENTERS.find(c => c.slug === form.center)?.label} />
              <Row k="Date"      v="Sunday, 21 June · 2 hours" />
              <Row k="Base"      v="₹1,999" />
              {form.additional_children > 0 && (
                <Row k={`+${form.additional_children} extra child${form.additional_children > 1 ? 'ren' : ''}`} v={`₹${(form.additional_children * 999).toLocaleString()}`} />
              )}
              <div className="border-t mt-3 pt-3 flex justify-between text-base font-bold" style={{ borderColor: SKY, color: NAVY_DEEP }}>
                <span>Total</span><span data-testid="modal-total">₹{total.toLocaleString()}</span>
              </div>
            </div>
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider mb-1.5 block text-slate-600">Parent&apos;s Phone (WhatsApp) *</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="tel" inputMode="numeric" maxLength={15}
                  value={form.parent_phone}
                  onChange={e => setForm(p => ({ ...p, parent_phone: e.target.value }))}
                  placeholder="98XXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl outline-none text-base"
                  style={{ border: '2.5px solid #E2E8F0', background: '#fff' }}
                  onFocus={e => { e.currentTarget.style.borderColor = NAVY; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
                  data-testid="modal-phone-input" autoFocus />
              </div>
            </div>
            <button onClick={onPay} disabled={submitting || form.parent_phone.replace(/\D/g, '').length < 10}
              className="mt-5 w-full font-bold py-4 rounded-full text-base inline-flex items-center justify-center gap-2 disabled:opacity-50"
              style={{ background: NAVY, color: '#fff' }} data-testid="modal-pay-btn">
              {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating booking…</> : <>Pay ₹{total.toLocaleString()} Securely <ArrowRight className="w-5 h-5" /></>}
            </button>
            <p className="text-xs text-center mt-3 inline-flex items-center justify-center gap-1.5 w-full text-slate-400">
              <Shield className="w-3 h-3" /> Secure Cashfree · UPI / Cards / Net Banking
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

const Row = ({ k, v }) => (
  <div className="flex items-center justify-between py-1.5">
    <span className="text-slate-500">{k}</span>
    <span className="font-bold text-right" style={{ color: NAVY_DEEP }}>{v || '—'}</span>
  </div>
);

// ──────────────────────────────────────────────────────────────────────
//  LAZY VIDEO PREVIEW — only fetches the first frame when scrolled into view.
//  Drastically cuts initial-load network requests on gallery + testimonials.
// ──────────────────────────────────────────────────────────────────────
const LazyVideoPreview = ({ src }) => {
  const ref = useRef(null);
  const [mount, setMount] = useState(false);

  useEffect(() => {
    if (!ref.current || mount) return undefined;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setMount(true); io.disconnect(); }
    }, { rootMargin: '200px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [mount]);

  return (
    <div ref={ref} className="absolute inset-0 w-full h-full pointer-events-none">
      {mount ? (
        <video src={`${src}#t=0.5`} preload="metadata" muted playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100" />
      ) : (
        // Static gradient placeholder while video is out of viewport
        <div className="absolute inset-0 w-full h-full"
          style={{ background: `linear-gradient(135deg, ${NAVY_DEEP} 0%, ${NAVY} 100%)` }} />
      )}
    </div>
  );
};

// ──────────────────────────────────────────────────────────────────────
//  DECORATIVE SVG DOODLES — hearts, squiggles, sparkles, dotted lines
//  Placed absolutely behind section content. Pointer-events disabled.
// ──────────────────────────────────────────────────────────────────────

const SquigglyLine = ({ width = 60, color = CORAL, flip = false }) => (
  <svg width={width} height="10" viewBox="0 0 60 10" fill="none" aria-hidden="true"
    style={{ transform: flip ? 'scaleX(-1)' : 'none', opacity: 0.7 }}>
    <path d="M 2 5 Q 8 0 14 5 T 26 5 T 38 5 T 50 5 T 58 5"
      stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
  </svg>
);

const HeartDoodle = ({ size = 22, color = CORAL, filled = true, rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'}
    stroke={color} strokeWidth="1.6" aria-hidden="true"
    style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M12 21s-7-4.5-9.5-9C0 8 2 3.5 6 3.5c2 0 3.5 1.2 4.5 2.5 1-1.3 2.5-2.5 4.5-2.5 4 0 6 4.5 3.5 8.5C19 16.5 12 21 12 21z" strokeLinejoin="round" />
  </svg>
);

const SparkleDoodle = ({ size = 18, color = SUN, rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"
    style={{ transform: `rotate(${rotate}deg)` }}>
    <path d="M12 2 L13.5 9 L21 10.5 L13.5 12 L12 19.5 L10.5 12 L3 10.5 L10.5 9 Z" />
  </svg>
);

const CurvyLine = ({ width = 140, color = NAVY, dashed = false, rotate = 0 }) => (
  <svg width={width} height="40" viewBox="0 0 140 40" fill="none" aria-hidden="true"
    style={{ transform: `rotate(${rotate}deg)`, opacity: 0.55 }}>
    <path d="M 5 30 Q 30 5 60 25 T 135 15"
      stroke={color} strokeWidth="2" strokeLinecap="round" fill="none"
      strokeDasharray={dashed ? '5,5' : '0'} />
  </svg>
);

const DottedArc = ({ size = 90, color = CORAL, rotate = 0 }) => (
  <svg width={size} height={size / 2} viewBox="0 0 90 45" fill="none" aria-hidden="true"
    style={{ transform: `rotate(${rotate}deg)`, opacity: 0.55 }}>
    <path d="M 5 40 Q 45 -5 85 40" stroke={color} strokeWidth="2.2" strokeLinecap="round"
      strokeDasharray="2 6" fill="none" />
  </svg>
);

// Decorative cluster — composed of hearts, squiggles, sparkles in absolute positions.
// `preset` controls the color palette and density.
const Doodles = ({ preset = 'usp' }) => {
  // palette: array of [color, type] tuples
  const palettes = {
    hero:  { primary: CORAL, secondary: NAVY, accent: SUN },
    usp:   { primary: CORAL, secondary: NAVY, accent: SUN },
    why:   { primary: CORAL, secondary: NAVY_DEEP, accent: SUN },
    build: { primary: CORAL, secondary: NAVY_DEEP, accent: SUN },
    warm:  { primary: CORAL, secondary: NAVY,      accent: NAVY_DEEP },
    dark:  { primary: SUN,   secondary: '#FFFFFF', accent: SKY },
  };
  const p = palettes[preset] || palettes.usp;
  const dim = preset === 'dark' ? 0.18 : 0.6;

  // Pre-set positions — kept to corner/edge zones to avoid overlapping reading text
  const items = {
    hero: [
      { top: '4%',   left: '2%',  el: <HeartDoodle size={18} color={p.primary} rotate={-12} /> },
      { bottom: '6%', left: '2%', el: <HeartDoodle size={14} color={p.primary} filled={false} rotate={18} /> },
      { top: '46%',  left: '0.5%', el: <SparkleDoodle size={12} color={p.accent} /> },
      { top: '8%',   right: '1%',  el: <SparkleDoodle size={14} color={p.accent} /> },
    ],
    usp: [
      { top: '14%',    left: '2%',  el: <HeartDoodle size={20} color={p.primary} rotate={-10} /> },
      { bottom: '14%', left: '3%',  el: <CurvyLine width={90} color={p.secondary} /> },
      { top: '18%',    right: '3%', el: <SparkleDoodle size={18} color={p.accent} /> },
      { bottom: '14%', right: '2%', el: <HeartDoodle size={14} color={p.primary} filled={false} rotate={20} /> },
    ],
    why: [
      { top: '8%',    left: '3%',  el: <HeartDoodle size={22} color={p.primary} rotate={-15} /> },
      { bottom: '10%', left: '4%', el: <CurvyLine width={110} color={p.secondary} dashed /> },
      { top: '10%',   right: '3%', el: <DottedArc color={p.primary} rotate={20} /> },
      { bottom: '10%', right: '3%', el: <HeartDoodle size={18} color={p.primary} rotate={14} /> },
      { top: '52%',   right: '1.5%', el: <SparkleDoodle size={16} color={p.accent} /> },
      { top: '52%',   left: '1.5%',  el: <SparkleDoodle size={14} color={p.accent} /> },
    ],
    build: [
      { top: '4%',    left: '2%',  el: <SparkleDoodle size={18} color={p.accent} /> },
      { bottom: '8%', left: '2%',  el: <HeartDoodle size={18} color={p.primary} rotate={-8} /> },
      { top: '6%',    right: '3%', el: <CurvyLine width={100} color={p.secondary} dashed /> },
      { bottom: '8%', right: '2%', el: <HeartDoodle size={16} color={p.primary} rotate={18} /> },
    ],
    warm: [
      { top: '6%',    left: '2%',  el: <HeartDoodle size={20} color={p.primary} rotate={-12} /> },
      { bottom: '8%', left: '3%',  el: <DottedArc color={p.primary} rotate={180} /> },
      { top: '10%',   right: '3%', el: <SparkleDoodle size={18} color={p.accent} /> },
      { bottom: '8%', right: '2%', el: <HeartDoodle size={14} color={p.primary} filled={false} rotate={16} /> },
    ],
    dark: [
      { top: '6%',    left: '2%',  el: <HeartDoodle size={18} color={p.primary} rotate={-12} /> },
      { bottom: '8%', left: '3%',  el: <SparkleDoodle size={14} color={p.accent} /> },
      { top: '8%',    right: '3%', el: <CurvyLine width={90} color={p.secondary} dashed /> },
      { bottom: '8%', right: '2%', el: <HeartDoodle size={16} color={p.primary} rotate={14} /> },
    ],
  };
  const list = items[preset] || items.usp;
  return (
    <div aria-hidden="true" data-testid={`doodles-${preset}`}
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: dim, zIndex: 0 }}>
      {list.map((it, idx) => {
        const { el, ...pos } = it;
        return <div key={idx} style={{ position: 'absolute', ...pos }}>{el}</div>;
      })}
    </div>
  );
};
