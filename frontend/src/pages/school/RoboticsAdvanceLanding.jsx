/**
 * OLL Advance Robotics & AI Curriculum (Grades 3–10) — 2027-28 Brochure Edition.
 *
 * Design Language:
 *   - Bright, modern, principal-friendly white & light-slate canvas.
 *   - Deep navy (#0A1F44 / #1E3A5F) & energetic crimson (#DC2626 / #D63031) accents.
 *   - Rounded modern cards (rounded-2xl / rounded-3xl), glowing pill badges.
 *
 * Structure:
 *   1) Sticky Header (OLL Logo, Download Brochure CTA, Book School Demo CTA).
 *   2) Breadcrumb navigation with JSON-LD BreadcrumbList schema.
 *   3) Hero section: Value proposition, trust badges, primary CTA & brochure gate.
 *   4) Trust Stats (500+ Schools, 5 Lakh+ Kids, 4.8/5 Rating, 35+ Cities).
 *   5) Grade-by-Grade Interactive Explorer (Grades 3 to 10 tab switcher with real kits & project outlines).
 *   6) Hardware & Kits Deep Dive (Smart Hubs, Snap-fit Mechanics, Arduino, ESP32, Sensors, OLED Displays).
 *   7) Why OLL: 3 Pillars (Curriculum + Turnkey Kits, Teacher Empowerment, IIT Bombay Techfest & STEM.org).
 *   8) Leadership & Credibility (Shark Tank India S2, KBC S16 Hot Seat with Mr. Amitabh Bachchan).
 *   9) Partner Schools Video Testimonials & School Logo Marquee.
 *   10) Interactive School Demo Booking / Inquiry Form.
 *   11) LMS Section.
 *   12) School Related Programs (Cross-linking to other school tracks).
 *   13) Footer.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, MapPin, Play, Heart, ChevronRight, ChevronLeft, Phone, Mail, Building,
  Layers, Radio, Gauge, Zap, Cog, Compass, Monitor, Check, Globe, Maximize2, X, Eye
} from 'lucide-react';

import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';

const API = process.env.REACT_APP_BACKEND_URL;

const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

// High-resolution brochure slides extracted from the official 2027-28 OLL Advance Robotics Curriculum
const BROCHURE_PAGES = [
  {
    page: 1,
    tag: 'Page 1 · Cover',
    badge: 'Curriculum Brochure (2027–28)',
    title: 'OLL Advanced Robotics & AI Curriculum',
    subtitle: 'Grades 3 – 10 · Robotics | Coding | AI | STEM',
    src: '/school/advance/advance_page_1.webp',
    desc: 'Official curriculum edition featuring turnkey student kits, grade-wise student workbooks, teacher lesson plans, and LMS software.',
    keyPoints: [
      'Comprehensive continuum across Grades 3 to 10',
      'Turnkey physical hardware kits with snap-fit parts & sensors',
      'Interactive coding with tablet & computer interfaces',
      'STEM.org accredited & gateway to IIT Bombay Techfest'
    ]
  },
  {
    page: 3,
    tag: 'Page 3 · Global Classrooms',
    badge: 'Global Adaptation for Indian Schools',
    title: 'From Global Classrooms to Your School',
    subtitle: 'Adapting World-Leading Robotics Models (US & China)',
    src: '/school/advance/advance_page_3.webp',
    desc: 'We study, source, and adapt the world\'s best robotics education models (LEGO® Education, Mindstorms, SPIKE, and WeDo 2.0-style platforms) to design a holistic, school-ready program for Indian learners.',
    keyPoints: [
      'Study Global Models: Benchmarked against international standards',
      'Source World-Class Kits: High-durability snap-fit parts & smart hubs',
      'Grade-Wise Structured Curriculum: Aligned with NEP 2020 & NCF',
      'Expert OLL Educators: Certified instructors dedicated to your school'
    ]
  },
  {
    page: 2,
    tag: 'Page 2 · Global Mandates',
    badge: 'International Workforce Blueprint',
    title: 'Global Perspectives on Robotics Education',
    subtitle: 'National Mandates & Methodologies Across Leading Economies',
    src: '/school/advance/advance_page_2.webp',
    desc: 'A primary driver for preparing future workforces, backed by national mandates and innovative methodologies across leading global economies like China and the United States.',
    keyPoints: [
      'China: Top-down national AI mandates & structured hardware',
      'United States: STEM problem-solving & competition leagues (VEX, FIRST)',
      'Bridging academic research with hands-on school application',
      'Moving towards hands-on, future-ready technology education'
    ]
  },
  {
    page: 4,
    tag: 'Page 4 · Curriculum Stack',
    badge: 'Grade 3 to 10 Continuum',
    title: 'Grade-wise Concept Explanation & Learning Approach',
    subtitle: 'Explore Concepts > Build Models > Code & Program > Test & Improve > Create Real Projects',
    src: '/school/advance/advance_page_4.webp',
    desc: 'Complete modular learning roadmap transitioning from mechanical linkages and optical sensors to Arduino embedded C++, OLED graphics, and ESP32 Voice AI.',
    keyPoints: [
      'Grade 3–4: Robotics with Motion, Gears & Sensor Automation',
      'Grade 5–6: Power Transmission, Torque & RF Wireless Control',
      'Grade 7–8: Arduino Breadboarding, Microcontrollers & Industrial Automation',
      'Grade 9–10: OLED Arcade Gaming, ESP32 IoT & Local Voice AI (STT/TTS)'
    ]
  }
];

const CANONICAL_PATH =
  '/school/advance-robotics-and-ai-curriculum-books-with-kits-for-grades-3-to-10';

const CURRICULUM_PDF_GDRIVE =
  'https://drive.google.com/uc?export=download&id=1e2m6Aem4wRs-3CSv2NwuA6-p5nxN-lXd';

const CURRICULUM_PDF_NAME =
  'OLL-Advance-Robotics-Curriculum-2027-28.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const SCHOOL_VIDEOS = [
  { name: 'Parle Tilak Vidyalay', id: 'xHhMLBzB_GU' },
  { name: 'Maneckji Cooper Education Trust', id: 'vOik-WmE_n8' },
  { name: 'Hiranandani Foundation School', id: 'OnK6oevnLeM' },
  { name: 'TayieBiyah High School', id: 'dWo2wr02mq4' },
  { name: 'Greenlawns High School', id: 'YoIu5akBkr0' },
  { name: 'Shree Chandulal Nanavati High', id: 'r6xeqlTixYE' },
  { name: 'GD Somani School', id: '5c2gZORdUxc' },
  { name: 'St. Agnes School', id: 'I0uZ8aIIkwU' },
  { name: 'Sanjeevani World School', id: 'YeyKFirPot4' },
  { name: 'Dosti Foundation School', id: 'sqXE6tsUQ6g' },
];

const PARTNER_LOGOS = Array.from({ length: 46 }, (_, i) => `/school-logos/${i + 1}.png`);

// Grade-wise Curriculum data directly extracted from the Advance Curriculum PDF
const GRADE_CURRICULUM = [
  {
    grade: 'Grade 3',
    theme: 'Robotics with Motion',
    tag: 'Motion & Mechanics',
    color: '#0284C7',
    kitImg: '/school/advance/kit_grade_3.webp',
    kitIncludes: 'Rechargeable Coding Hub × 1, Type-C Charger × 1, Snap-Fit Parts × 286',
    summary: 'Focuses on kinetic energy, motorized movement, gear mechanisms, and structural balance.',
    projectsCount: 15,
    projects: [
      'Dolphin Robot', 'Flower & Bee Mechanism', 'Pulling Robot', 'Race Car Rover',
      'Dino Face Bot', 'Frog Jumper', 'Gorilla Walker', 'Construction Crane',
      'Automated Flood Gate', 'Rescue Helicopter', 'Spider Crawler', 'Recycling Truck',
      'Garbage Lorry', 'Robotic Fish', 'Exhibition Capstone Project'
    ],
    skills: ['Gear Movement', 'Kinetic Systems', 'Structural Rigidity', 'Problem Solving']
  },
  {
    grade: 'Grade 4',
    theme: 'Robotics with Sensors',
    tag: 'Sensors & Automation',
    color: '#059669',
    kitImg: '/school/advance/kit_grade_4.webp',
    kitIncludes: 'Rechargeable Coding Hub × 1, Type-C Charger × 1, Sensor Modules, Snap-Fit Parts × 286',
    summary: 'Introduces perception, distance measurement, optical sensing, and reactive autonomous behaviors.',
    projectsCount: 15,
    projects: [
      'Caterpillar Crawler', 'Mantis Sensor Bot', 'Alarm Safety Device', 'Bridge Lift Mechanism',
      'Forklift Machine', 'Snow Plough Rover', 'Sea Ocean Cleaner', 'Robotic Pick-and-Place Arm',
      'Automated Floor Sweeper', 'Distance Measuring Bot', 'Blinking Firefly', 'Joystick Luna Rover',
      'Scan Bot Detector', 'Autonomous Security Rover', 'Exhibition Capstone Project'
    ],
    skills: ['Distance Sensing', 'Sensor Automation', 'Closed-Loop Feedback', 'Autonomous Navigation']
  },
  {
    grade: 'Grade 5',
    theme: 'Robotics with Gears & Mechanical Motion',
    tag: 'Power Transmission & Torque',
    color: '#D97706',
    kitImg: '/school/advance/kit_grade_5.webp',
    kitIncludes: 'Battery Hub × 1, Medium Motor × 2, Coding Hub × 1, Parts × 311',
    summary: 'Deep dive into gear ratios, torque versus speed, mechanical advantage, and compound machines.',
    projectsCount: 16,
    projects: [
      'Power Transmission Car', 'Heavy Duty Crane Arm', 'Sweeping Street Car', 'Car with Rotating Arm',
      'Power Hammer System', 'Mechanical Pendulum', 'Robotic Dog Walker', 'Geared Windmill',
      'Precision Weighing Scale', 'Insect Crawler Bot', 'Dragster Speed Car', 'Wind-Powered Vehicle',
      'Flywheeler Inertia Car', 'F1 Racing Robot', 'Trundle Measuring Wheel', 'Motorised Harbor Crane'
    ],
    skills: ['Compound Gears', 'Torque & RPM', 'Mechanical Advantage', 'Kinetic Linkages']
  },
  {
    grade: 'Grade 6',
    theme: 'Robotics with Gears, Remote Control & Navigation',
    tag: 'Wireless Remote Control',
    color: '#7C3AED',
    kitImg: '/school/advance/kit_grade_6.webp',
    kitIncludes: 'Wireless Remote Controller × 1, Battery Hub × 1, Medium Motor × 1, Coding Hub × 1, Parts × 311',
    summary: 'Wireless radio control, differential steering, multi-axis motion, and smart obstacle evasion.',
    projectsCount: 16,
    projects: [
      'Remote Controlled Helicopter', 'Two-Wheeled RC Balancing Car', 'Alpine Ski Robot',
      'Dragonfly Flapper', 'Mechanical Crab Walker', 'Steam Train Engine', 'Armoured Tank with Treads',
      'Bicycle Stabilizer', 'Snail Motion Bot', 'Dragon Dance Robot', 'Obstacle Avoiding Rover',
      'Twin Spin Aeroplane', 'High-Speed RC Car', 'Chinook Tandem Helicopter', 'Cable Ski Lift', 'Dragon Boat'
    ],
    skills: ['RF Wireless Control', 'Differential Steering', 'Tracked Propulsion', 'Aerodynamic Motion']
  },
  {
    grade: 'Grade 7',
    theme: 'Embedded Systems & Arduino Automation',
    tag: 'Arduino Circuits & Microcontrollers',
    color: '#DC2626',
    kitImg: '/school/advance/kit_grade_7.webp',
    kitIncludes: 'Arduino Uno DIP, Breadboard, Jumper Wires, Servo Motors, LDR, PIR, Smoke, Rain Sensors & Pump',
    summary: 'Transition to breadboard prototyping, C++ Arduino coding, environmental sensing, and real-world automation.',
    projectsCount: 15,
    projects: [
      'Introduction to Breadboard Circuitry', 'Arduino & Tinkercad Virtual Simulation',
      'Blink LED Digital Output', 'Traffic Light Controller Logic', 'Electronic Doorbell Buzzer',
      'Smart Visitor Alert & Attendance Counter', 'Solar Panel Sun Tracker (LDR + Servo)',
      'Automated Toll Booth Barrier', 'Smart Fire Safety Alert (Smoke Sensor)',
      'Automatic Fire Extinguisher (Pump Motor)', 'Rain Detection Warning Alarm',
      'Automated Car Windshield Wiper', 'Automatic Plant Irrigation System',
      'Smart Home Integrated Automation', 'Exhibition Capstone Project'
    ],
    skills: ['Arduino IDE & C++', 'Breadboard Prototyping', 'PWM & Analog Read', 'Smart Infrastructure']
  },
  {
    grade: 'Grade 8',
    theme: 'Microcontrollers, PWM & Industrial Robotics',
    tag: 'Industrial Automation & Robotics',
    color: '#2563EB',
    kitImg: '/school/advance/kit_grade_8.webp',
    kitIncludes: 'Arduino Board, Ultrasonic Sensor, IR Tracking Array, Motor Driver Shield, DC Motors, Chassis',
    summary: 'Pulse Width Modulation, speed control, conveyor belt systems, edge-avoidance, and line-tracking robots.',
    projectsCount: 15,
    projects: [
      'Understanding Circuit Breadboards', 'Introduction to Arduino & Tinkercad',
      'LED Sequence & Timing Logic', 'Traffic Light Phase Automation',
      'Push-Button Controlled Smart Night Lamp', 'Infrared Intruder Alarm System',
      'Automatic Ambient Street Lamp', 'DC Motor Direction & Speed Control',
      'PWM Speed Demon Motor Tuning', 'Ultrasonic Autonomous Obstacle Avoider',
      'Smart Factory Gate Opener', 'Industrial Conveyor Belt Assembly',
      'Edge Avoider Table-Safe Robot', 'Autonomous PID Line Follower Bot',
      'Exhibition Capstone Project'
    ],
    skills: ['PWM Motor Control', 'Infrared Arrays', 'PID Path Tracking', 'Industrial Mechatronics']
  },
  {
    grade: 'Grade 9',
    theme: 'Advanced Embedded Systems, OLED Displays & Arcade Gaming',
    tag: 'I2C Protocols & OLED Graphics',
    color: '#4F46E5',
    kitImg: '/school/advance/kit_grade_9.webp',
    kitIncludes: 'Arduino Uno, 0.96" OLED Display (I2C), 2-Axis Joystick, DHT11 Sensor, RGB LEDs, Ultrasonic Sensor',
    summary: 'I2C bus communication, hexadecimal pixel mapping, interactive UI menus, and joystick gaming engines on hardware.',
    projectsCount: 15,
    projects: [
      'Arduino Architecture & Breadboard Interfacing', 'Introduction to LCD & Hexadecimal Addressing',
      'Hello World OLED Graphics Display', 'Custom 5x8 Pixel Emoji Character Designer',
      'Local Weather Station & Temp/Humidity Alarm (DHT11)', 'Car Reverse Parking Sonar with Variable Buzzer',
      'RGB LED Color Mixer using PWM', 'Intelligent Traffic Signal Timing Controller',
      'Joystick Coordinate Plotter (ADC Readings)', 'LCD Interactive Menu Navigator',
      'Flappy Bird-Style OLED Arcade Game', 'Ultrasonic Theremin Electronic Musical Instrument',
      'Classic Snake Game with Joystick Input', 'Space Shooter Multi-Enemy Arcade Game',
      'Memory Sequence Direction Game'
    ],
    skills: ['I2C Protocol', 'Pixel Matrix Buffering', 'Hardware Game Engines', 'Analog Joystick ADC']
  },
  {
    grade: 'Grade 10',
    theme: 'IoT, Wireless, AI Speech Recognition & Voice Automation',
    tag: 'IoT, Bluetooth & Voice AI',
    color: '#0D9488',
    kitImg: '/school/advance/kit_grade_10.webp',
    kitIncludes: 'ESP32 IoT Controller, Bluetooth Module, Voice/Microphone Module, Text-to-Speech Speaker, Relays',
    summary: 'Cloud connectivity, smartphone Bluetooth telemetry, Local Speech-to-Text (STT), Text-to-Speech (TTS), and Voice AI.',
    projectsCount: 10,
    projects: [
      'Bluetooth Railway Barrier via Smartphone', 'Mobile-Operated Smart Home Appliance Controller',
      'Giving the Robot a Voice (TTS Speech Synthesis)', 'Hearing & Transcribing (Local STT Voice Recognition)',
      'Voice Command: Turn On the Room Lights', 'Voice Command: Open the Smart Door Mechanism',
      'Smart IoT Environmental Cloud Dashboard', 'Wireless Telemetry & Sensor Logger',
      'AI Voice-Assisted Receptionist Bot', 'Grand Finale Capstone Project'
    ],
    skills: ['ESP32 & Wireless IoT', 'Local Speech-to-Text', 'Text-to-Speech Synthesis', 'Mobile Telemetry']
  }
];

export default function RoboticsAdvanceLanding() {
  const navigate = useNavigate();
  const [selectedGradeIdx, setSelectedGradeIdx] = useState(0);
  const [gateOpen, setGateOpen] = useState(false);
  const [activeVideoModal, setActiveVideoModal] = useState(null);
  const [heroBrochureIdx, setHeroBrochureIdx] = useState(0);
  const [lightboxPageIdx, setLightboxPageIdx] = useState(null);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setLightboxPageIdx(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Form submission state
  const [leadForm, setLeadForm] = useState({
    school_name: '',
    contact_name: '',
    phone: '',
    email: '',
    city: '',
    board: 'CBSE',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const activeGrade = GRADE_CURRICULUM[selectedGradeIdx];

  const handleFormChange = (e) => {
    setLeadForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleLeadSubmit = async (e) => {
    e.preventDefault();
    if (!leadForm.school_name.trim() || leadForm.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please provide a valid School Name and 10-digit Phone Number.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: leadForm.school_name.trim(),
          contact_name: leadForm.contact_name.trim() || 'Principal / Coordinator',
          email: leadForm.email.trim() || `school_${leadForm.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: leadForm.phone.trim(),
          city: leadForm.city.trim(),
          board: leadForm.board,
          selected_offerings: ['Advance Robotics & AI Program (Grades 3-10)'],
          programs_interested: ['Advance Robotics Curriculum 2027-28'],
          source: 'advance-robotics-landing-page',
          notes: `Advance Robotics demo request. Board: ${leadForm.board}. Message: ${leadForm.message || 'None'}.`,
          assign_option: 'admin',
        }),
      });
      if (res.ok) {
        setSubmitted(true);
        toast.success('Demo booking request submitted successfully! Our curriculum specialist will connect shortly.');
      } else {
        throw new Error('Failed to submit');
      }
    } catch {
      toast.success('Your request was received. Our team will contact you shortly.');
      setSubmitted(true);
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
        .icse-btn.primary { background:#DC2626; color:#fff; box-shadow:0 14px 28px rgba(220,38,38,0.28); }
        .icse-btn.primary:hover { background:#B91C1C; transform:translateY(-1px); }
        .icse-btn.outline { background:#fff; color:#0A1F44; border:1.5px solid #0A1F44; }
        .icse-btn.outline:hover { background:#0A1F44; color:#fff; }
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
      <nav className="fixed top-3 left-0 right-0 z-50 px-3 hidden sm:block" data-testid="advance-nav">
        <div className="icse-nav-pill">
          <a href="/" className="flex items-center gap-3">
            <img src={OLL_LOGO_COLOR} alt="OLL — Skills for All logo · Official Advance Robotics partner" className="h-9 sm:h-10 w-auto" />
            <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest text-[#0A1F44] border-l border-slate-200 pl-3 leading-tight">
              Advance Robotics &amp; AI<br/>Grades 3 to 10
            </span>
          </a>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setGateOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A1F44] px-3 py-2 rounded-full hover:bg-slate-100 transition"
              data-testid="advance-nav-download">
              <Download className="w-3.5 h-3.5" /> Curriculum PDF
            </button>
            <a href="#book-demo-section" className="icse-btn primary" style={{ padding: '10px 20px', fontSize: '0.72rem' }} data-testid="advance-nav-cta">
              Book Demo <ArrowRight className="w-3.5 h-3.5" />
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
            { label: 'Robotics', href: '/school#robotics' },
            { label: 'Advance Robotics & AI (Grades 3–10)' }
          ]}
          schemaId="advance-robotics-breadcrumbs-schema"
          testid="advance-breadcrumbs"
        />
      </div>

      {/* 3. HERO SECTION */}
      <section style={{ maxWidth: 1200, margin: '1.5rem auto 3rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'radial-gradient(ellipse at top right, rgba(239, 68, 68, 0.08), transparent 60%), radial-gradient(ellipse at bottom left, rgba(30, 58, 95, 0.06), transparent 60%), #FFFFFF',
          borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '3rem 2.5rem', boxShadow: '0 20px 50px rgba(15, 30, 80, 0.06)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            
            {/* Hero Left: Text & CTA */}
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626',
                borderRadius: '9999px', padding: '0.35rem 0.85rem', fontSize: '0.8rem',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem'
              }}>
                <Award size={14} /> STEM.org Certified · NEP 2020 Aligned
              </div>

              <h1 style={{
                fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 900,
                lineHeight: 1.15, color: '#0A1F44', marginBottom: '1.25rem',
                letterSpacing: '-0.02em'
              }}>
                Advance Robotics & AI Curriculum for Schools{' '}
                <span style={{ color: '#DC2626', display: 'inline-block' }}>(Grades 3 to 10)</span>
              </h1>

              <p style={{
                fontSize: '1.05rem', lineHeight: 1.6, color: '#475569',
                marginBottom: '2rem', maxWidth: 560
              }}>
                From foundational mechanical motion and sensors in middle school to Arduino microcontrollers,
                I2C OLED displays, autonomous rovers, and ESP32 Voice AI in high school. Complete hands-on lab kits,
                grade-mapped textbooks, and comprehensive teacher empowerment.
              </p>

              {/* Primary Action Buttons */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '2.5rem' }}>
                <a
                  href="#book-demo-section"
                  data-testid="hero-primary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#fff', padding: '0.9rem 1.75rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)',
                    transition: 'transform 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  Book Free School Demo <ArrowRight size={18} />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  data-testid="hero-secondary-cta"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: '#FFFFFF', color: '#0A1F44', border: '2px solid #E2E8F0',
                    padding: '0.85rem 1.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15, 30, 80, 0.04)',
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.background = '#F8FAFC'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.background = '#FFFFFF'; }}
                >
                  <Download size={18} style={{ color: '#DC2626' }} /> Download Curriculum Brochure (PDF)
                </button>
              </div>

              {/* Trust Checkmarks */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                {[
                  '100+ Hands-on Lab Projects',
                  'Snap-Fit Kits (286–311 pcs)',
                  'No Prior Teacher Coding Needed',
                  'IIT Bombay Techfest Gateway'
                ].map((txt, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                    <CheckCircle2 size={16} style={{ color: '#16A34A', flexShrink: 0 }} />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Right: Showcase Banner Card - Featuring Page 1 Cover & Quick Tabs */}
            <div style={{ position: 'relative' }}>
              <div style={{
                background: '#FFFFFF', borderRadius: '1.75rem',
                border: '2px solid #E2E8F0', overflow: 'hidden',
                boxShadow: '0 20px 45px rgba(15, 30, 80, 0.12)'
              }}>
                {/* Header Bar */}
                <div style={{
                  background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
                  padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Package size={17} style={{ color: '#F87171' }} />
                    <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.01em' }}>
                      Advance Robotics · {BROCHURE_PAGES[heroBrochureIdx].tag}
                    </span>
                  </div>
                  <button
                    onClick={() => setLightboxPageIdx(heroBrochureIdx)}
                    title="Click to zoom brochure page"
                    style={{
                      background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                      fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.65rem', borderRadius: '999px',
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                    }}
                  >
                    <Maximize2 size={12} /> Fullpage Zoom
                  </button>
                </div>

                {/* Interactive Mini-Tab Strip */}
                <div style={{
                  display: 'flex', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', padding: '0.35rem 0.5rem', gap: '0.35rem'
                }}>
                  {[
                    { idx: 0, label: 'Page 1 · Cover' },
                    { idx: 1, label: 'Page 3 · Global Models' },
                    { idx: 3, label: 'Page 4 · Grade Stack' }
                  ].map((tb) => (
                    <button
                      key={tb.idx}
                      onClick={() => setHeroBrochureIdx(tb.idx)}
                      style={{
                        flex: 1, padding: '0.45rem 0.6rem', borderRadius: '0.6rem',
                        border: heroBrochureIdx === tb.idx ? '1px solid #DC2626' : '1px solid transparent',
                        background: heroBrochureIdx === tb.idx ? '#FFFFFF' : 'transparent',
                        color: heroBrochureIdx === tb.idx ? '#DC2626' : '#64748B',
                        fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                        boxShadow: heroBrochureIdx === tb.idx ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                        transition: 'all 0.15s'
                      }}
                    >
                      {tb.label}
                    </button>
                  ))}
                </div>

                {/* Image Container with Hover Lightbox Trigger */}
                <div
                  onClick={() => setLightboxPageIdx(heroBrochureIdx)}
                  style={{
                    padding: '1rem', textAlign: 'center', background: '#F8FAFC',
                    cursor: 'pointer', position: 'relative'
                  }}
                  title="Click to view fullpage high-res preview"
                >
                  <img
                    src={BROCHURE_PAGES[heroBrochureIdx].src}
                    alt={BROCHURE_PAGES[heroBrochureIdx].title}
                    style={{
                      width: '100%', maxHeight: 390, objectFit: 'contain',
                      borderRadius: '1rem', border: '1px solid #E2E8F0', background: '#fff',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.05)', transition: 'transform 0.2s'
                    }}
                  />
                  <div style={{
                    position: 'absolute', bottom: '1.5rem', right: '1.5rem',
                    background: 'rgba(10,31,68,0.85)', backdropFilter: 'blur(6px)', color: '#fff',
                    padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '0.35rem', pointerEvents: 'none',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  }}>
                    <Maximize2 size={12} /> Click to expand
                  </div>
                </div>

                {/* Footer Bar */}
                <div style={{ padding: '1.1rem 1.35rem', background: '#fff', borderTop: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {BROCHURE_PAGES[heroBrochureIdx].badge}
                      </div>
                      <div style={{ fontWeight: 900, fontSize: '1rem', color: '#0A1F44', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {BROCHURE_PAGES[heroBrochureIdx].title}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => setLightboxPageIdx(heroBrochureIdx)}
                        style={{
                          background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '0.65rem',
                          padding: '0.45rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, color: '#1D4ED8',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                      >
                        <Eye size={13} /> Inspect
                      </button>
                      <button
                        onClick={() => setGateOpen(true)}
                        style={{
                          background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '0.65rem',
                          padding: '0.45rem 0.75rem', fontSize: '0.76rem', fontWeight: 700, color: '#0F1E33',
                          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                        }}
                      >
                        <Download size={13} /> PDF
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. TRUST STATS BAR */}
      <section style={{ maxWidth: 1200, margin: '0 auto 4rem', padding: '0 1.25rem' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1.25rem'
        }}>
          {[
            { num: '500+', label: 'Partner Schools Across India', icon: School, color: '#DC2626' },
            { num: '5,00,000+', label: 'Students Trained & Certified', icon: Users, color: '#2563EB' },
            { num: '4.8 / 5', label: 'Principal & Teacher Rating', icon: Star, color: '#D97706' },
            { num: '98%', label: 'Year-on-Year Renewal Rate', icon: Heart, color: '#059669' },
          ].map((st, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.25rem', border: '1px solid #E2E8F0',
              padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem',
              boxShadow: '0 4px 16px rgba(15, 30, 80, 0.03)'
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '0.9rem',
                background: `${st.color}15`, color: st.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <st.icon size={24} />
              </div>
              <div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0A1F44', lineHeight: 1.1 }}>
                  {st.num}
                </div>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748B', marginTop: '0.2rem' }}>
                  {st.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4.5 GLOBAL ROBOTICS BENCHMARK & METHODOLOGY SHOWCASE (PAGE 2 & PAGE 3 DEEP-DIVE) */}
      <section id="global-methodology" style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.75rem', fontWeight: 800, color: '#DC2626',
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem',
            background: '#FEF2F2', padding: '0.35rem 0.85rem', borderRadius: '999px', border: '1px solid #FECACA'
          }}>
            <Globe size={14} /> Global Standards · Local Relevance
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3.2vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            From Global Classrooms to Your School
          </h2>
          <p style={{ color: '#64748B', maxWidth: 720, margin: '0.5rem auto 0', fontSize: '0.98rem', lineHeight: 1.6 }}>
            We study, source, and adapt the world’s leading robotics education models (US &amp; China)
            into an accredited, turnkey, school-ready curriculum designed for Indian students.
          </p>
        </div>

        {/* 2-Card Side-by-Side Visual Showcase: Page 3 and Page 2 */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '2rem', alignItems: 'stretch'
        }}>
          {/* Card 1: Page 3 - From Global Classrooms to Your School */}
          <div style={{
            background: '#FFFFFF', borderRadius: '1.75rem', border: '2px solid #E2E8F0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 32px rgba(15, 30, 80, 0.06)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
              padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#F87171' }}>
                  Brochure Page 3
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                  From Global Classrooms to Your School
                </div>
              </div>
              <button
                onClick={() => setLightboxPageIdx(1)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.5rem',
                  padding: '0.4rem 0.75rem', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Maximize2 size={13} /> Zoom
              </button>
            </div>

            {/* Image Preview with Hover Overlay */}
            <div
              onClick={() => setLightboxPageIdx(1)}
              style={{
                background: '#F8FAFC', padding: '1.25rem', textAlign: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden'
              }}
            >
              <img
                src="/school/advance/advance_page_3.webp"
                alt="From Global Classrooms to Your School - OLL Robotics Models"
                style={{
                  width: '100%', maxHeight: 340, objectFit: 'contain',
                  borderRadius: '1rem', border: '1px solid #E2E8F0', background: '#fff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
                }}
              />
              <div style={{
                marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.75rem', fontWeight: 700, color: '#2563EB'
              }}>
                <Eye size={13} /> Click to view full high-res brochure page
              </div>
            </div>

            {/* Key Content Breakdown from Page 3 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  4 Pillars of OLL Adaptation
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                  Proven LEGO® &amp; WeDo 2.0-Style Kits Made Affordable
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { label: 'Study Global Models', desc: 'Researched international curricula across the United States (LEGO® Education, SPIKE, Mindstorms) and China.' },
                    { label: 'Source World-Class Kits', desc: 'Procure proven platforms like LEGO® and WeDo 2.0-style kits with rechargeable hubs and precision motors.' },
                    { label: 'Grade-Wise Structured Curriculum', desc: 'Progressive, hands-on syllabus seamlessly mapped to NEP 2020 and Indian school timetables.' },
                    { label: 'Expert OLL Educator', desc: 'Trained, certified facilitators stationed in school to deliver robotics & AI lessons with ongoing teacher mentoring.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: '#EFF6FF',
                        color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0A1F44' }}>{item.label}:</strong> {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  Global Innovation · Local Relevance
                </span>
                <button
                  onClick={() => setLightboxPageIdx(1)}
                  style={{
                    background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '0.6rem',
                    padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, color: '#0A1F44',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <Eye size={13} /> Inspect Page 3
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Page 2 - Global Perspectives on Robotics Education */}
          <div style={{
            background: '#FFFFFF', borderRadius: '1.75rem', border: '2px solid #E2E8F0',
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 12px 32px rgba(15, 30, 80, 0.06)', transition: 'transform 0.2s, box-shadow 0.2s'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
              padding: '1.1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#fff'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#60A5FA' }}>
                  Brochure Page 2
                </span>
                <div style={{ fontSize: '1rem', fontWeight: 800 }}>
                  Global Perspectives on Robotics Education
                </div>
              </div>
              <button
                onClick={() => setLightboxPageIdx(2)}
                style={{
                  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '0.5rem',
                  padding: '0.4rem 0.75rem', color: '#fff', fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Maximize2 size={13} /> Zoom
              </button>
            </div>

            {/* Image Preview with Hover Overlay */}
            <div
              onClick={() => setLightboxPageIdx(2)}
              style={{
                background: '#F8FAFC', padding: '1.25rem', textAlign: 'center',
                cursor: 'pointer', position: 'relative', overflow: 'hidden'
              }}
            >
              <img
                src="/school/advance/advance_page_2.webp"
                alt="Global Perspectives on Robotics Education - China & USA"
                style={{
                  width: '100%', maxHeight: 340, objectFit: 'contain',
                  borderRadius: '1rem', border: '1px solid #E2E8F0', background: '#fff',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.04)'
                }}
              />
              <div style={{
                marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.75rem', fontWeight: 700, color: '#2563EB'
              }}>
                <Eye size={13} /> Click to view full high-res brochure page
              </div>
            </div>

            {/* Key Content Breakdown from Page 2 */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                  Why World Economies Mandate Robotics
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                  Preparing Future Workforces from Grade 3 Upwards
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {[
                    { country: '🇨🇳 China Mandate', desc: 'Central AI & automation industrial planning. Mass AI literacy and specialized maker facilities like Hangzhou Robot School.' },
                    { country: '🇺🇸 United States', desc: 'STEM problem-solving, open-ended design thinking, programming logic, and competitive leagues (VEX, FIRST Robotics).' },
                    { country: '⚡ Real-World Relevance', desc: 'Connecting academic research with industry-ready robotics learning and interactive humanoid classroom tools.' },
                    { country: '🇮🇳 India’s Opportunity', desc: 'NEP 2020 calls for experiential learning. OLL gives every Indian school an international-grade lab turnkey.' }
                  ].map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: '#FEF2F2',
                        color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 800, flexShrink: 0, marginTop: 2
                      }}>
                        ✓
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
                        <strong style={{ color: '#0A1F44' }}>{item.country}:</strong> {item.desc}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B' }}>
                  Backed by Global National Frameworks
                </span>
                <button
                  onClick={() => setLightboxPageIdx(2)}
                  style={{
                    background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '0.6rem',
                    padding: '0.45rem 0.85rem', fontSize: '0.78rem', fontWeight: 700, color: '#0A1F44',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <Eye size={13} /> Inspect Page 2
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Banner Strip */}
        <div style={{
          marginTop: '2rem', background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          borderRadius: '1.25rem', border: '1px solid #DBEAFE', padding: '1.25rem 1.75rem',
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0A1F44' }}>
              Want to review the complete 32-page Advance Curriculum &amp; Kit Blueprint?
            </div>
            <div style={{ fontSize: '0.85rem', color: '#64748B', marginTop: '0.2rem' }}>
              Download the official brochure PDF or request an on-campus demonstration with physical kits.
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={() => setGateOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.75rem',
                padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(220, 38, 38, 0.25)'
              }}
            >
              <Download size={15} /> Download PDF
            </button>
            <a
              href="#book-demo-section"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                background: '#FFFFFF', color: '#0A1F44', border: '1px solid #CBD5E1', borderRadius: '0.75rem',
                padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none'
              }}
            >
              Book School Demo <ArrowRight size={15} />
            </a>
          </div>
        </div>
      </section>

      {/* 5. GRADE-BY-GRADE INTERACTIVE EXPLORER */}
      <section id="curriculum-explorer" style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-block', fontSize: '0.75rem', fontWeight: 800,
            color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem'
          }}>
            Detailed Syllabus & Hardware
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Grade 3 to Grade 10 Modular Progression
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
            Explore what students build, code, and master in each grade with dedicated kit configurations.
          </p>
        </div>

        {/* Grade Tab Bar */}
        <div style={{
          display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.75rem',
          marginBottom: '2rem', scrollbarWidth: 'thin'
        }}>
          {GRADE_CURRICULUM.map((gc, idx) => {
            const isSelected = selectedGradeIdx === idx;
            return (
              <button
                key={gc.grade}
                onClick={() => setSelectedGradeIdx(idx)}
                data-testid={`tab-${gc.grade.toLowerCase().replace(' ', '-')}`}
                style={{
                  flexShrink: 0, padding: '0.75rem 1.25rem', borderRadius: '1rem',
                  border: isSelected ? '2px solid #DC2626' : '1px solid #E2E8F0',
                  background: isSelected ? '#DC2626' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#334155',
                  fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem',
                  boxShadow: isSelected ? '0 8px 20px rgba(220, 38, 38, 0.25)' : 'none',
                  transition: 'all 0.15s'
                }}
              >
                <span>{gc.grade}</span>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600,
                  opacity: isSelected ? 0.9 : 0.65
                }}>
                  {gc.tag}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Grade Detail Card */}
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', boxShadow: '0 16px 40px rgba(15, 30, 80, 0.05)'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            
            {/* Left: Info & Projects */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{
                  background: `${activeGrade.color}15`, color: activeGrade.color,
                  fontWeight: 900, fontSize: '0.85rem', padding: '0.35rem 0.85rem', borderRadius: '999px'
                }}>
                  {activeGrade.grade}
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748B' }}>
                  {activeGrade.projectsCount}+ Projects & Activities
                </span>
              </div>

              <h3 style={{ fontSize: '1.85rem', fontWeight: 900, color: '#0A1F44', marginBottom: '0.75rem' }}>
                {activeGrade.theme}
              </h3>

              <p style={{ fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                {activeGrade.summary}
              </p>

              {/* Kit Details Box */}
              <div style={{
                background: '#F8FAFC', borderRadius: '1rem', border: '1px solid #E2E8F0',
                padding: '1rem 1.25rem', marginBottom: '1.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', fontWeight: 800, color: '#DC2626', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  <Package size={15} /> Hardware Inclusions
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E293B' }}>
                  {activeGrade.kitIncludes}
                </div>
              </div>

              {/* Learning Skills Pills */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Core Competencies Learned
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {activeGrade.skills.map((sk, i) => (
                    <span key={i} style={{
                      background: '#F1F5F9', color: '#334155', borderRadius: '0.5rem',
                      padding: '0.25rem 0.65rem', fontSize: '0.8rem', fontWeight: 700
                    }}>
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              {/* Sample Projects Grid */}
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.5rem' }}>
                  Hands-On Projects Built by Students
                </div>
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '0.5rem', maxHeight: 200, overflowY: 'auto', paddingRight: '0.5rem'
                }}>
                  {activeGrade.projects.map((proj, pIdx) => (
                    <div key={pIdx} style={{
                      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '0.6rem',
                      padding: '0.45rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, color: '#1E293B',
                      display: 'flex', alignItems: 'center', gap: '0.4rem'
                    }}>
                      <span style={{ color: activeGrade.color, fontWeight: 800 }}>•</span>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Grade Kit Visual */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                background: '#F8FAFC', borderRadius: '1.5rem', border: '2px solid #E2E8F0',
                padding: '1.25rem', overflow: 'hidden', boxShadow: '0 12px 30px rgba(15, 30, 80, 0.05)'
              }}>
                <img
                  src={activeGrade.kitImg}
                  alt={`${activeGrade.grade} Robotics Kit & Models`}
                  style={{
                    width: '100%', maxHeight: 360, objectFit: 'contain',
                    borderRadius: '1rem', background: '#fff', border: '1px solid #E2E8F0'
                  }}
                />
                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0A1F44' }}>
                    {activeGrade.grade} Official Models & Hardware
                  </span>
                  <button
                    onClick={() => setGateOpen(true)}
                    style={{
                      background: '#DC2626', color: '#fff', border: 'none',
                      borderRadius: '0.5rem', padding: '0.4rem 0.8rem', fontSize: '0.78rem',
                      fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem'
                    }}
                  >
                    <Download size={12} /> Brochure Page
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. WHAT'S IN THE ADVANCE ROBOTICS KITS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Built for Years of Classroom Use
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Inside the Advance Robotics Hardware Stack
          </h2>
          <p style={{ color: '#64748B', maxWidth: 650, margin: '0.5rem auto 0', fontSize: '0.95rem' }}>
            Classroom-grade modular components designed for high reuse, student safety, and deep exploration.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {[
            {
              icon: Cpu,
              title: 'Smart Hubs & Microcontrollers',
              desc: 'Rechargeable Type-C coding hubs, Arduino Uno DIP boards, and ESP32 wireless IoT microcontrollers.',
              color: '#DC2626'
            },
            {
              icon: Cog,
              title: 'Snap-Fit Mechanics (286–311 pcs)',
              desc: 'Modular beams, gear wheels, compound axles, steering linkages, rack-and-pinions, and durable chassis frames.',
              color: '#2563EB'
            },
            {
              icon: Radio,
              title: 'Multitude of Sensor Modules',
              desc: 'Ultrasonic distance, infrared obstacle/line, DHT11 temp/humidity, PIR motion, LDR light, rain sensors & smoke detectors.',
              color: '#059669'
            },
            {
              icon: Zap,
              title: 'Actuators, Motors & Pumps',
              desc: 'Medium high-torque motors, micro servo motors, high-speed DC motors, and submersible mini water pumps.',
              color: '#D97706'
            },
            {
              icon: Monitor,
              title: '0.96" OLED Displays & Joysticks',
              desc: 'I2C monochrome OLED screens with hexadecimal pixel addressing and dual-axis analog joysticks for hardware gaming.',
              color: '#7C3AED'
            },
            {
              icon: Brain,
              title: 'AI Speech & Bluetooth IoT',
              desc: 'Local speech-to-text (STT) microphones, text-to-speech (TTS) voice modules, and smartphone Bluetooth control.',
              color: '#0D9488'
            }
          ].map((item, idx) => (
            <div key={idx} style={{
              background: '#FFFFFF', borderRadius: '1.5rem', border: '1px solid #E2E8F0',
              padding: '1.75rem', boxShadow: '0 8px 24px rgba(15, 30, 80, 0.04)',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
            }}>
              <div>
                <div style={{
                  width: 52, height: 52, borderRadius: '1rem',
                  background: `${item.color}15`, color: item.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem'
                }}>
                  <item.icon size={26} />
                </div>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0A1F44', marginBottom: '0.5rem' }}>
                  {item.title}
                </h4>
                <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.55 }}>
                  {item.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. WHY OLL: 3 TRUST PILLARS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #172554 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#F87171', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              Turnkey School Partnership
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900 }}>
              Everything Your School Needs to Run a World-Class Lab
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
            {[
              {
                icon: BookOpen,
                step: '01',
                title: 'Structured Curriculum & Textbooks',
                desc: 'Aligned to NEP 2020 & NCF 2023. Lesson-by-lesson progression so concepts build seamlessly from Grade 3 through Grade 10.'
              },
              {
                icon: Users,
                step: '02',
                title: 'Teacher Empowerment & Training',
                desc: 'Step-by-step lecture slides, teacher handbooks, and hands-on workshops so existing school teachers deliver with 100% confidence.'
              },
              {
                icon: Trophy,
                step: '03',
                title: 'Competitions & IIT Bombay Gateway',
                desc: 'Official gateway to Techfest IIT Bombay, regional robotics exhibitions, and STEM.org global digital certificates for students.'
              }
            ].map((p, i) => (
              <div key={i} style={{
                background: 'rgba(255, 255, 255, 0.06)', borderRadius: '1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.12)', padding: '2rem',
                backdropFilter: 'blur(8px)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '0.85rem',
                    background: 'rgba(239, 68, 68, 0.2)', color: '#F87171',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <p.icon size={22} />
                  </div>
                  <span style={{ fontSize: '1.2rem', fontWeight: 900, color: 'rgba(255,255,255,0.25)', fontFamily: 'monospace' }}>
                    {p.step}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.75rem', color: '#fff' }}>
                  {p.title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. CREDIBILITY: SHARK TANK & KBC */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: '#FFFFFF', borderRadius: '2rem', border: '2px solid #E2E8F0',
          padding: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem', alignItems: 'center', boxShadow: '0 12px 36px rgba(15, 30, 80, 0.05)'
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              background: '#FEF2F2', color: '#DC2626', borderRadius: '999px',
              padding: '0.3rem 0.8rem', fontSize: '0.75rem', fontWeight: 800,
              textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1rem'
            }}>
              National Recognition
            </div>
            <h2 style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.2rem)', fontWeight: 900, color: '#0A1F44', marginBottom: '1rem' }}>
              Backed by Shark Tank India & Celebrated on KBC Hot Seat
            </h2>
            <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
              Founded by Shreyaan Daga (Youngest to secure funding on Shark Tank India S2 and Hot Seat contestant on KBC S16 with Mr. Amitabh Bachchan), OLL is driven by an obsession to make quality STEM education hands-on and accessible to every school.
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
                <Play size={14} style={{ color: '#DC2626' }} /> Watch Shark Tank Pitch
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
                <Play size={14} style={{ color: '#2563EB' }} /> Watch KBC Episode
              </a>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <img
              src={SHARK_TANK_IMG}
              alt="OLL on Shark Tank and KBC"
              style={{
                width: '100%', maxHeight: 300, objectFit: 'contain',
                borderRadius: '1.25rem', border: '1px solid #E2E8F0'
              }}
            />
          </div>
        </div>
      </section>

      {/* 9. PARTNER SCHOOLS VIDEO TESTIMONIALS */}
      <section style={{ maxWidth: 1200, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#DC2626', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Real Classrooms · Real Impact
          </div>
          <h2 style={{ fontSize: 'clamp(1.75rem, 3vw, 2.5rem)', fontWeight: 900, color: '#0A1F44' }}>
            Hear from Principals & Educators
          </h2>
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.25rem'
        }}>
          {SCHOOL_VIDEOS.slice(0, 4).map((vid, i) => (
            <div key={i} style={{
              background: '#FFFFFF', borderRadius: '1.25rem', border: '1px solid #E2E8F0',
              overflow: 'hidden', boxShadow: '0 4px 16px rgba(15, 30, 80, 0.04)'
            }}>
              <div style={{ position: 'relative', width: '100%', paddingBottom: '56.25%', background: '#000' }}>
                <iframe
                  src={`https://www.youtube.com/embed/${vid.id}`}
                  title={vid.name}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  style={{
                    position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none'
                  }}
                />
              </div>
              <div style={{ padding: '1rem', fontWeight: 700, fontSize: '0.9rem', color: '#0A1F44' }}>
                {vid.name}
              </div>
            </div>
          ))}
        </div>

        {/* 46 Partner School Logos Marquee */}
        <div style={{ marginTop: '3.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1.25rem' }}>
            Trusted by Leading Educational Institutions Across India
          </div>
          <div style={{
            display: 'flex', gap: '1.5rem', overflowX: 'auto', padding: '0.5rem 0',
            scrollbarWidth: 'none', alignItems: 'center'
          }}>
            {PARTNER_LOGOS.slice(0, 24).map((src, idx) => (
              <img
                key={idx}
                src={src}
                alt="Partner School Logo"
                style={{ height: 42, width: 'auto', filter: 'grayscale(100%) opacity(70%)', transition: 'all 0.2s', flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.filter = 'grayscale(0%) opacity(100%)'; }}
                onMouseLeave={e => { e.currentTarget.style.filter = 'grayscale(100%) opacity(70%)'; }}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 10. INTERACTIVE SCHOOL DEMO BOOKING FORM */}
      <section id="book-demo-section" style={{ maxWidth: 1000, margin: '0 auto 5rem', padding: '0 1.25rem' }}>
        <div style={{
          background: 'linear-gradient(135deg, #0A1F44 0%, #111827 100%)',
          borderRadius: '2rem', padding: '3.5rem 2.5rem', color: '#fff',
          boxShadow: '0 24px 60px rgba(10, 31, 68, 0.25)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ maxWidth: 650, margin: '0 auto', textAlign: 'center', marginBottom: '2.5rem' }}>
            <span style={{
              background: 'rgba(239, 68, 68, 0.2)', color: '#F87171',
              padding: '0.35rem 0.85rem', borderRadius: '999px', fontSize: '0.75rem',
              fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em'
            }}>
              Zero Cost School Pilot
            </span>
            <h2 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.6rem)', fontWeight: 900, marginTop: '0.75rem', color: '#fff' }}>
              Bring the Advance Robotics Lab to Your School
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', marginTop: '0.5rem' }}>
              Request a free physical sample kit demo or speak with our curriculum director to evaluate for your school's 2027–28 academic session.
            </p>
          </div>

          {submitted ? (
            <div style={{
              background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22C55E',
              borderRadius: '1.25rem', padding: '2rem', textAlign: 'center'
            }}>
              <CheckCircle2 size={48} style={{ color: '#22C55E', margin: '0 auto 1rem' }} />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
                Demo Request Received!
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.95rem' }}>
                Thank you! Our regional academic coordinator will contact your school within 24 hours to schedule the demonstration.
              </p>
            </div>
          ) : (
            <form onSubmit={handleLeadSubmit} data-testid="advance-school-lead-form">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    School Name *
                  </label>
                  <input
                    type="text"
                    name="school_name"
                    required
                    value={leadForm.school_name}
                    onChange={handleFormChange}
                    placeholder="e.g. St. Xavier's International School"
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
                    value={leadForm.contact_name}
                    onChange={handleFormChange}
                    placeholder="Principal / Trustee / Coordinator"
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#CBD5E1', marginBottom: '0.35rem' }}>
                    Mobile Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    value={leadForm.phone}
                    onChange={handleFormChange}
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
                    value={leadForm.email}
                    onChange={handleFormChange}
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
                    value={leadForm.city}
                    onChange={handleFormChange}
                    placeholder="e.g. Mumbai, Maharashtra"
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
                    value={leadForm.board}
                    onChange={handleFormChange}
                    style={{
                      width: '100%', padding: '0.85rem 1rem', borderRadius: '0.75rem',
                      background: '#1E293B', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#fff', fontSize: '0.9rem', outline: 'none'
                    }}
                  >
                    <option value="CBSE">CBSE</option>
                    <option value="ICSE">ICSE</option>
                    <option value="State Board">State Board</option>
                    <option value="IB / Cambridge">IB / Cambridge</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  data-testid="advance-lead-submit-btn"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    color: '#fff', padding: '1rem 2.5rem', borderRadius: '1rem',
                    fontWeight: 800, fontSize: '1rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 8px 24px rgba(220, 38, 38, 0.4)',
                    opacity: submitting ? 0.7 : 1
                  }}
                >
                  {submitting ? 'Submitting Request...' : 'Schedule School Demo & Proposal'} <ArrowRight size={18} />
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* 11. LMS SECTION */}
      <LMSSection theme="light" />

      {/* 12. RELATED PROGRAMS CROSS-LINKING */}
      <SchoolRelatedPrograms current="advance-robotics" theme="light" />

      {/* 13. FOOTER */}
      <Footer />

      {/* ── HIGH-RESOLUTION CURRICULUM BROCHURE LIGHTBOX MODAL ─────── */}
      {lightboxPageIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Brochure Page Viewer"
          onClick={() => setLightboxPageIdx(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem', background: 'rgba(10, 31, 68, 0.88)', backdropFilter: 'blur(8px)'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              position: 'relative', width: '100%', maxWidth: 860, maxHeight: '94vh',
              background: '#FFFFFF', borderRadius: '1.5rem', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
              border: '2px solid rgba(255,255,255,0.2)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0A1F44 0%, #1E3A5F 100%)',
              padding: '0.9rem 1.25rem', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem'
            }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {BROCHURE_PAGES[lightboxPageIdx].badge}
                </span>
                <div style={{ fontWeight: 800, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {BROCHURE_PAGES[lightboxPageIdx].title}
                </div>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                {/* Page Navigation */}
                <div style={{
                  display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)',
                  borderRadius: '999px', padding: '0.2rem 0.5rem', gap: '0.35rem'
                }}>
                  <button
                    onClick={() => setLightboxPageIdx((lightboxPageIdx - 1 + BROCHURE_PAGES.length) % BROCHURE_PAGES.length)}
                    aria-label="Previous page"
                    style={{
                      background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
                      padding: 2, display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0 0.35rem' }}>
                    {lightboxPageIdx + 1} / {BROCHURE_PAGES.length}
                  </span>
                  <button
                    onClick={() => setLightboxPageIdx((lightboxPageIdx + 1) % BROCHURE_PAGES.length)}
                    aria-label="Next page"
                    style={{
                      background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
                      padding: 2, display: 'flex', alignItems: 'center'
                    }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Download PDF button */}
                <button
                  onClick={() => { setLightboxPageIdx(null); setGateOpen(true); }}
                  style={{
                    background: '#DC2626', color: '#fff', border: 'none', borderRadius: '0.5rem',
                    padding: '0.45rem 0.85rem', fontSize: '0.75rem', fontWeight: 800,
                    cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.3rem'
                  }}
                >
                  <Download size={13} /> PDF
                </button>

                {/* Close Button */}
                <button
                  onClick={() => setLightboxPageIdx(null)}
                  aria-label="Close modal"
                  style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Image Body */}
            <div style={{
              flex: 1, overflowY: 'auto', background: '#0F172A',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
            }}>
              <img
                src={BROCHURE_PAGES[lightboxPageIdx].src}
                alt={BROCHURE_PAGES[lightboxPageIdx].title}
                style={{
                  maxWidth: '100%', maxHeight: 'calc(80vh - 100px)',
                  objectFit: 'contain', borderRadius: '0.75rem',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.5)'
                }}
              />
            </div>

            {/* Modal Footer Thumbnail Strip */}
            <div style={{
              background: '#FFFFFF', padding: '0.75rem 1rem', borderTop: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', overflowX: 'auto'
            }}>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {BROCHURE_PAGES.map((bp, idx) => (
                  <button
                    key={bp.page}
                    onClick={() => setLightboxPageIdx(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.4rem',
                      padding: '0.35rem 0.65rem', borderRadius: '0.5rem',
                      border: lightboxPageIdx === idx ? '2px solid #DC2626' : '1px solid #E2E8F0',
                      background: lightboxPageIdx === idx ? '#FEF2F2' : '#F8FAFC',
                      color: lightboxPageIdx === idx ? '#DC2626' : '#475569',
                      fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                    }}
                  >
                    <span>{bp.tag}</span>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#64748B', whiteSpace: 'nowrap' }}>
                Press <strong style={{ color: '#0A1F44' }}>ESC</strong> or click outside to close
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 14. CURRICULUM DOWNLOAD LEAD-GATE MODAL */}
      <CurriculumGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        pdfUrl={CURRICULUM_PDF_GDRIVE}
        pdfName={CURRICULUM_PDF_NAME}
        title="Advance Robotics Curriculum Brochure (2027–28)"
        offering="Advance Robotics & AI Program (Grades 3-10)"
        program="Advance Robotics Curriculum 2027-28"
        source="advance-robotics-curriculum-download-gate"
        testid="advance-curriculum-gate"
      />

      {/* ── Mobile-only sticky bottom CTA (thumb-reachable) ─────────── */}
      <div className="icse-mobile-cta" data-testid="advance-mobile-cta">
        <button type="button" onClick={() => setGateOpen(true)} className="icse-btn outline" data-testid="advance-mobile-cta-brochure">
          <Download className="w-3.5 h-3.5" /> Brochure
        </button>
        <a href="#book-demo-section" className="icse-btn primary" data-testid="advance-mobile-cta-demo">
          Book Demo <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
