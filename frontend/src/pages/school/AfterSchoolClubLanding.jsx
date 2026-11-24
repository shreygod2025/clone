/**
 * OLL After-School Robo Club Landing Page
 * Complete Robotics & AI Learning Center for Schools (Ages 3–16).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, Heart, Play, ChevronRight, Phone, Mail, Building,
  Layers, Radio, Gauge, Zap, Cog, Compass, Monitor, Check,
  Printer, Wrench, Eye, Shield, DollarSign, Target, Calendar,
  Rocket
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
  '/school/after-school-robo-club-robotics-ai-stem-learning-center';

const BROCHURE_PDF_URL =
  'https://drive.google.com/uc?export=download&id=1rYT5N4s6amn6EHCNhD6V83n93pOY3uH5';
const BROCHURE_NAME =
  'OLL-After-School-Robo-Club-Brochure.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const PILLARS = [
  {
    title: 'Utilise Space to Generate Revenue',
    highlight: 'New Income Stream',
    desc: 'Turn unutilised school classrooms after hours and on weekends into a high-margin, recurring revenue generator for your school.',
    icon: DollarSign,
    color: '#059669',
    bg: '#ECFDF5'
  },
  {
    title: 'Prepare Students for Global Competitions',
    highlight: 'IIT Bombay Grand Finale',
    desc: 'Equip learners with hands-on technical skills to win at WRO, Robo Sumo, IIT Bombay Techfest, and national STEM Olympiads.',
    icon: Trophy,
    color: '#D97706',
    bg: '#FFFBEB'
  },
  {
    title: 'Open to Outside Students & Boost Admissions',
    highlight: 'Admissions Magnet',
    desc: 'Host evening and weekend batches welcoming students from nearby schools, establishing your campus as the neighborhood tech hub.',
    icon: Users,
    color: '#0284C7',
    bg: '#F0F9FF'
  },
  {
    title: 'Position School Brand as Futuristic',
    highlight: 'Modern STEM Brand',
    desc: 'Enhance your institution’s standing among parents as an innovative, forward-looking school pioneering AI, 3D printing, and Robotics.',
    icon: Rocket,
    color: '#7C3AED',
    bg: '#F5F3FF'
  }
];

const ECOSYSTEM_ITEMS = [
  {
    title: 'Robotics & Innovation Kits',
    desc: 'Hands-on builds, modular coding hubs, microcontrollers, motors and real-world mechanisms.',
    icon: Cpu
  },
  {
    title: 'Advanced Learning Stations',
    desc: 'Dedicated zones for 3D printing, laser cutting, electronics soldering, and AI vision computing.',
    icon: Monitor
  },
  {
    title: 'Structured Curriculum & Books',
    desc: 'Age-appropriate course books, step-by-step schematics, student workbooks, and project guides.',
    icon: BookOpen
  },
  {
    title: 'Teacher Training & Support',
    desc: 'Master trainers certify your educators or OLL supplies certified instructors directly to your school.',
    icon: Award
  },
  {
    title: 'Digital Learning & LMS',
    desc: 'Cloud platform with video lessons, assessment tracking, attendance, and student progress reports.',
    icon: Layers
  },
  {
    title: 'Turnkey Setup & Operations',
    desc: 'From 3D printers and pegboards to branding signboards, arenas, and ongoing tool replenishments.',
    icon: ShieldCheck
  }
];

const AGE_PATHWAYS = [
  {
    age: 'Age 3–6',
    band: 'EXPLORE & DISCOVER',
    sub: 'Hands-on · Play-based · Sensory & Cognitive',
    color: '#0284C7',
    points: [
      'Early building mechanisms & tactile blocks',
      'Pattern recognition & screen-free coding logic',
      'Fun motorized animals & automated movement',
      'Fine motor skills & collaborative creativity'
    ]
  },
  {
    age: 'Age 7–11',
    band: 'BUILD & CREATE',
    sub: 'Projects · Coding · Robotics · Designing',
    color: '#059669',
    points: [
      'Block-based programming with Scratch & Blockly',
      'Sensor-activated rovers, obstacle avoiders & light trackers',
      '3D Pen sculpting & spatial geometry principles',
      'Mechanical advantage: gears, pulleys & torque'
    ]
  },
  {
    age: 'Age 12–16',
    band: 'INNOVATE & APPLY',
    sub: 'Advanced Projects · Python · AI · 3D Printing',
    color: '#DC2626',
    points: [
      'Python coding, microcontrollers (ESP32, Arduino, Raspberry Pi)',
      'Computer vision, face detection & voice AI assistants',
      'Precision 3D printing & CAD modeling prototypes',
      'Competition rovers, drones & IoT smart devices'
    ]
  }
];

const LAB_EQUIPMENT = [
  { name: '3D Printer', desc: 'High-speed FDM 3D printer with large build volume, auto bed leveling & precision nozzle.' },
  { name: '3D Printing Filament', desc: '1.75 mm eco-friendly PLA filament in multiple vibrant colors for durable student models.' },
  { name: 'Laser Cutting Machine', desc: 'High-precision 0.1 mm cutter for engraving and slicing wood, acrylic and foam boards.' },
  { name: 'Component Storage Organizer', desc: 'Durable multi-compartment drawers for sorting motors, sensors, wires and screws.' },
  { name: 'LCD 3D Pens', desc: 'Adjustable speed & temperature pens with auto-sleep for rapid 3D sketching.' },
  { name: 'All-in-One PC Station', desc: 'Intel Core i5, 16 GB RAM, 512 GB SSD, 20" HD display with Wi-Fi & preloaded IDEs.' },
  { name: 'Raspberry Pi AI Vision Kit', desc: 'Raspberry Pi board with camera module, sensor breakouts, and edge AI runtime.' },
  { name: '360° Security Camera', desc: '3MP smart cloud CCTV camera ensuring safety and monitoring in the lab.' },
  { name: '565-Piece Mechanical Tool Set', desc: 'Screwdrivers, hex keys, pliers, nuts, bolts, washers, and multi-hardware kits.' },
  { name: '15-in-1 Electronics Station', desc: 'Soldering station, lead-free solder wire, digital multimeter, hot glue gun, tweezers.' },
  { name: 'Wall Pegboards & Organizers', desc: '28-bin wall-mounted organizational boards keeping tools neat and accessible.' },
  { name: 'Acrylic Station Signage', desc: 'Professional acrylic zone signage designating 3D Printing, Code, and Electronics bays.' },
  { name: '360° Space Sky Projector', desc: 'Immersive galaxy ambient lighting creating an inspiring tech studio environment.' },
  { name: 'Competition Arena & Mats', desc: 'Standardized arena mats for Robo Football, Line-Follower, and Sumo Bot matches.' }
];

const SPECIALISED_COURSES = [
  { name: 'AI Foundation', duration: '4 Weeks', fee: '₹4,999', tag: 'Core AI' },
  { name: 'AI Vision with Raspberry Pi', duration: '6 Weeks', fee: '₹4,999', tag: 'Computer Vision' },
  { name: 'Python Coding & Logic', duration: '6–8 Weeks', fee: '₹4,999', tag: 'Programming' },
  { name: 'IoT with ESP32', duration: '4–6 Weeks', fee: '₹4,999', tag: 'Smart Connected' },
  { name: 'AI & Drone Building (Tello)', duration: '4–6 Weeks', fee: '₹4,999', tag: 'Aeromodelling' },
  { name: 'PCB Designing & Making', duration: '4 Weeks', fee: '₹4,999', tag: 'Hardware' },
  { name: '3D Designing & 3D Printing', duration: '4–6 Weeks', fee: '₹4,999', tag: 'CAD & Fab' },
  { name: 'Competitive Specific Training', duration: '6–8 Weeks', fee: '₹4,999', tag: 'Olympiad/Techfest' },
];

export default function AfterSchoolClubLanding() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);

  const [form, setForm] = useState({
    school_name: '', contact_name: '', phone: '', email: '', city: '', model: 'School-Managed Model', message: ''
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
          city: form.city.trim() || 'Not specified',
          source: 'after_school_robo_club_landing',
          notes: `Model Preference: ${form.model}. Message: ${form.message.trim() || 'Interested in After-School Robo Club setup'}`
        })
      });
      setSubmitted(true);
      toast.success('Inquiry submitted! Our Club Director will contact you within 24 hours.');
    } catch {
      toast.error('Submission failed. Please call our team directly at +91 93249 97060.');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Schools', href: '/school/robotics-ai-lab-for-schools-turnkey-solution/' },
    { label: 'After-School Robo Club', href: CANONICAL_PATH }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-red-500 selection:text-white">
      <Toaster position="top-right" richColors />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white text-xs md:text-sm font-semibold py-2 px-4 text-center">
        <span>🚀 Turn School Space into a High-Impact Robotics Hub · Admissions Open for 2027-28 Partner Schools</span>
        <a href="#inquiry" className="ml-3 underline font-bold hover:text-amber-200 transition">Book Club Demo →</a>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={OLL_LOGO_COLOR} alt="OLL.co" className="h-10 w-auto object-contain" />
            <div className="hidden sm:block border-l border-slate-300 pl-3">
              <p className="text-xs font-bold text-slate-900 leading-tight">AFTER-SCHOOL ROBO CLUB</p>
              <p className="text-[10px] text-slate-500">Robotics & AI Learning Center</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="tel:+919324997060"
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-red-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              <Phone className="w-3.5 h-3.5 text-red-600" />
              <span>+91 93249 97060</span>
            </a>
            <button
              onClick={() => setGateOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 transition"
            >
              <Download className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">Download</span> Brochure
            </button>
            <a
              href="#inquiry"
              className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-red-500/20 transition"
            >
              Setup Club
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <SchoolBreadcrumbs items={breadcrumbs} />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-16 lg:py-20 bg-gradient-to-b from-white via-slate-50 to-red-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headings & Call to Actions */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-red-100/80 border border-red-200 text-red-800 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold">
                <Sparkles className="w-4 h-4 text-red-600" />
                <span>Creating Next-Gen Leaders · Robotics & AI Learning Center</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                AFTER-SCHOOL <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-rose-600 to-red-700">
                  ROBO CLUB
                </span>
              </h1>

              <p className="text-lg sm:text-xl font-bold text-slate-700">
                Build. Code. Create. Innovate.
              </p>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                An OLL-powered Robotics & Technology Club right within your school campus. Transform available space outside regular hours into a cutting-edge hub for <strong>Robotics, Coding, AI, and 3D Design</strong>.
              </p>

              {/* 4 Feature Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { label: 'Robotics', icon: Cpu, color: 'text-red-600 bg-red-50 border-red-200' },
                  { label: 'Coding', icon: Code2, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                  { label: 'AI & Vision', icon: Brain, color: 'text-purple-600 bg-purple-50 border-purple-200' },
                  { label: '3D Design', icon: Printer, color: 'text-amber-600 bg-amber-50 border-amber-200' }
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <a
                  href="#inquiry"
                  className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-7 py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-red-500/25 flex items-center gap-2 transition"
                >
                  Launch Club at Your School
                  <ArrowRight className="w-5 h-5" />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 px-6 py-3.5 rounded-2xl font-bold text-base flex items-center gap-2 shadow-sm transition"
                >
                  <Download className="w-5 h-5 text-red-600" />
                  Download Club Brochure
                </button>
              </div>

              {/* Trust Micro-bar */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-semibold text-slate-500 border-t border-slate-200">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> STEM.org Accredited</span>
                <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> IIT Bombay Finale</span>
                <span className="flex items-center gap-1.5"><School className="w-4 h-4 text-blue-600" /> 400+ Partner Schools</span>
              </div>
            </div>

            {/* Right Column: Hero Cover / Slide Preview */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 aspect-[3/4]">
                  <img
                    src="/school/afterschool/asc_page_1.webp"
                    alt="After School Robo Club Overview"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                    <p className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">Turnkey School Club</p>
                    <h3 className="text-xl font-bold">State-of-the-Art In-School Lab</h3>
                    <p className="text-xs text-slate-300 mt-1">Monetize space, boost school admissions, and nurture next-gen innovators.</p>
                  </div>
                </div>

                <div className="absolute -bottom-5 -left-5 bg-white p-4 rounded-2xl shadow-xl border border-slate-200 hidden sm:flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-black text-lg">
                    ₹0
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Zero Capital Overhead</p>
                    <p className="text-sm font-extrabold text-slate-900">Flexible Revenue Share</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="bg-white border-y border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">400+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Schools Across India</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-red-600">1.55 Lac+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Learners Impacted</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">12,500+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Educators Trained</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">35+ Cities</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Pan-India Presence</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Why an After-School Robo Club? (4 Pillars) */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100/70 px-3 py-1 rounded-full">
              Strategic Advantages for Schools
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Why Launch an After-School Robo Club?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Turn your school’s skills, space, and innovation into real revenue and prestige.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {PILLARS.map((pillar, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110"
                      style={{ backgroundColor: pillar.bg, color: pillar.color }}
                    >
                      <pillar.icon className="w-6 h-6" />
                    </div>
                    <span
                      className="text-xs font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: pillar.bg, color: pillar.color }}
                    >
                      {pillar.highlight}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{pillar.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{pillar.desc}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center text-xs font-bold text-slate-500">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                  Zero capital burden on management
                </div>
              </div>
            ))}
          </div>

          {/* Full slide visual card */}
          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/afterschool/asc_page_3.webp"
              alt="Why an After-School Robo Club Slide"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Complete Robo Club Ecosystem */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-100 px-3 py-1 rounded-full">
              Everything Included · Turnkey
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              The Complete Robo Club Ecosystem
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              We provide the physical kits, digital LMS, certified curriculum, master trainers, and ongoing operational support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ECOSYSTEM_ITEMS.map((item, idx) => (
              <div
                key={idx}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-red-300 hover:bg-red-50/10 transition group"
              >
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-4 group-hover:scale-110 transition">
                  <item.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1">{item.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/afterschool/asc_page_4.webp"
              alt="Complete Robo Club Ecosystem Slide"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Grade-wise Progressive Learning Pathways */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Ages 3 to 16
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              One Program That Grows With the Child
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Progressive learning pathway from early curiosity to real-world innovation and competitive robotics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {AGE_PATHWAYS.map((path, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="text-xs font-black px-3 py-1 rounded-full text-white"
                      style={{ backgroundColor: path.color }}
                    >
                      {path.age}
                    </span>
                    <span className="text-xs font-bold text-slate-400">Phase 0{idx + 1}</span>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 mb-1">{path.band}</h3>
                  <p className="text-xs font-medium text-slate-500 mb-6">{path.sub}</p>

                  <ul className="space-y-3">
                    {path.points.map((pt, pidx) => (
                      <li key={pidx} className="flex items-start text-xs sm:text-sm text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 mr-2 flex-shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <a
                    href="#inquiry"
                    className="text-xs font-bold text-red-600 hover:text-red-700 flex items-center justify-center gap-1"
                  >
                    Explore Age {path.age} Syllabus <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/afterschool/asc_page_5.webp"
              alt="Learning Pathways Slide"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Complete RoboLab Equipment & Station Showcase */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              State-of-the-Art Hardware
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 tracking-tight">
              A Complete RoboLab Setup Inside Your School
            </h2>
            <p className="text-slate-400 text-sm sm:text-base mt-3">
              A curated set of industrial-grade tools, prototyping machines, electronics, and kits for hands-on learning.
            </p>
          </div>

          {/* Slide 6 Showcase Image */}
          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-2xl mb-12 bg-slate-950 p-3 sm:p-6">
            <img
              src="/school/afterschool/asc_page_6.webp"
              alt="Complete RoboLab Physical Layout"
              className="w-full rounded-2xl object-cover"
            />
          </div>

          {/* Lab Equipment Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {LAB_EQUIPMENT.map((eq, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 rounded-2xl p-5 border border-slate-700 hover:border-red-500/50 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Cog className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <h3 className="font-bold text-white text-sm">{eq.name}</h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{eq.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Slide 7 Showcase Image */}
          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 p-3 sm:p-6">
            <img
              src="/school/afterschool/asc_page_7.webp"
              alt="Lab Equipment and Tools Inventory"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 5: Competitions & Grand Finale at IIT Bombay */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
                National Prestige
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Compete on National Stages · Grand Finale at IIT Bombay
              </h2>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
                Our After-School Robo Club is not just about classroom learning; it’s a competitive platform. Students design autonomous rovers, battle bots, and AI solutions to qualify for national and international championships.
              </p>

              <div className="space-y-3">
                {[
                  { title: 'Inter-School Robotics League', desc: 'Quarterly challenges where your students compete against top peer schools.' },
                  { title: 'Flagship OLL Championship', desc: 'Annual mega tournament with grand finale hosted at IIT Bombay campus.' },
                  { title: 'STEM.org Recognized Accreditations', desc: 'Every participant receives globally verifiable credentials.' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                    <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      <p className="text-xs text-slate-600">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white p-4">
                <img
                  src="/school/afterschool/asc_page_9.webp"
                  alt="Competitions and IIT Bombay Grand Finale"
                  className="w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 6: Flexible Course Offerings & Pricing Sheet */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
              Curriculum & Fee Formats
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Flexible Club Course Offerings
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Multiple formats tailored to school schedules: Annual memberships, short-term bootcamps, holiday camps, and weekend workshops.
            </p>
          </div>

          {/* Memberships Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-red-200 shadow-md relative overflow-hidden">
              <span className="absolute top-4 right-4 bg-red-100 text-red-700 text-xs font-extrabold px-3 py-1 rounded-full">
                Most Popular
              </span>
              <p className="text-xs font-bold uppercase tracking-wider text-red-600">Foundations (6–16 Years)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">All-in-One Future Skills</h3>
              <p className="text-xs text-slate-500 mt-1">Robotics, AI, Coding, 3D Designing & Electronics</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">₹2,000</span>
                <span className="text-xs text-slate-500 font-semibold">/ month (Annual Plan) · ₹2,500/mo regular</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 2 classes per week (60 mins each)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> All age groups (Ages 6–16)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Hands-on kit projects every week</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Real-world portfolio creation</li>
              </ul>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-600">Advanced (8–16 Years)</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">AI Mastery Program</h3>
              <p className="text-xs text-slate-500 mt-1">Generative AI, AI Vision, Smart App Dev & Applied AI</p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-900">₹1,000</span>
                <span className="text-xs text-slate-500 font-semibold">/ month (Annual Plan) · ₹1,500/mo regular</span>
              </div>

              <ul className="mt-6 space-y-2.5 text-xs sm:text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> 1 class per week</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Latest GenAI tools, prompt engineering & APIs</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Practical computer vision & automation projects</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Real industry-aligned mentoring</li>
              </ul>
            </div>
          </div>

          {/* Short Term Courses Grid */}
          <div className="mb-12">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Short-Term Specialised Courses (4–8 Weeks · ₹4,999)</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {SPECIALISED_COURSES.map((crs, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                  <span className="text-[10px] font-bold text-red-600 uppercase tracking-wide bg-red-50 px-2 py-0.5 rounded">
                    {crs.tag}
                  </span>
                  <h4 className="text-sm font-bold text-slate-900 mt-2">{crs.name}</h4>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-semibold">
                    <span>{crs.duration}</span>
                    <span className="text-slate-900 font-bold">{crs.fee}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Full slide visual card */}
          <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/afterschool/asc_page_10.webp"
              alt="Course Curriculum and Pricing Sheet"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 7: Partnership Models (Slide 11) */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Flexible School Models
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Choose Your Robo Club Model
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Two transparent ways to launch in your school — retain total control or let OLL handle full program delivery.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Option 1: School Managed */}
            <div className="bg-slate-50 rounded-3xl p-6 sm:p-8 border-2 border-slate-200 hover:border-slate-400 transition flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold px-3 py-1 bg-slate-200 text-slate-800 rounded-full">OPTION 01</span>
                <h3 className="text-2xl font-black text-slate-900 mt-3">School-Managed Model</h3>
                <p className="text-xs text-slate-500 mt-1">School retains maximum revenues with internal faculty</p>

                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Complete turnkey RoboLab hardware & station setup</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> Structured OLL curriculum, books & lesson plans</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> OLL supports teacher recruitment & continuous training</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600" /> School hires and pays the teacher</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-600 font-bold" /> No royalty or revenue sharing to OLL</li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 text-center">
                <a href="#inquiry" className="text-xs font-bold text-slate-800 hover:text-red-600">Select School-Managed →</a>
              </div>
            </div>

            {/* Option 2: OLL Managed */}
            <div className="bg-gradient-to-b from-red-50 to-white rounded-3xl p-6 sm:p-8 border-2 border-red-500 shadow-lg flex flex-col justify-between">
              <div>
                <span className="text-xs font-extrabold px-3 py-1 bg-red-600 text-white rounded-full">OPTION 02</span>
                <h3 className="text-2xl font-black text-slate-900 mt-3">OLL-Managed Model</h3>
                <p className="text-xs text-red-600 font-bold mt-1">Zero operational hassle for school management</p>

                <ul className="mt-6 space-y-3 text-xs sm:text-sm text-slate-700">
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-red-600" /> Complete turnkey RoboLab hardware & station setup</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-red-600" /> Structured OLL curriculum, kits & student books</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-red-600 font-bold" /> Certified Robotics Teacher provided by OLL</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-red-600" /> OLL handles admissions marketing & delivery</li>
                  <li className="flex items-center gap-2"><Check className="w-4 h-4 text-red-600 font-bold" /> Transparent share-based revenue model for school</li>
                </ul>
              </div>

              <div className="mt-8 pt-4 border-t border-red-100 text-center">
                <a href="#inquiry" className="text-xs font-bold text-red-600 hover:text-red-700">Select OLL-Managed →</a>
              </div>
            </div>

          </div>

          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/afterschool/asc_page_11.webp"
              alt="Choose Your Robo Club Model"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Slide Deck Interactive Viewer */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Visual Presentation
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 tracking-tight">
              Explore the Complete Club Presentation
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Browse through all 12 slides of the official After-School Robo Club prospectus.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-slate-950 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-[16/10] sm:aspect-[16/9] bg-black">
              <img
                src={`/school/afterschool/asc_page_${activeSlide}.webp`}
                alt={`Robo Club Slide ${activeSlide}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnail bar */}
            <div className="mt-4 flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setActiveSlide(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeSlide === num
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Slide {num}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Showing Slide {activeSlide} of 12</span>
              <button
                onClick={() => setGateOpen(true)}
                className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Presentation PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Credibility Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
              Nationally Recognized
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Featured on Shark Tank India & KBC Hot Seat
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              OLL is recognized across India for pioneering STEM, Robotics, and practical Future Skills education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
              <div className="rounded-2xl overflow-hidden mb-4 relative group">
                <img src={SHARK_TANK_IMG} alt="Shark Tank India" className="w-full h-48 object-cover" />
                <a
                  href={SHARK_TANK_YT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </a>
              </div>
              <h4 className="font-bold text-slate-900 text-base">Shark Tank India Season 2</h4>
              <p className="text-xs text-slate-600 mt-1">
                Founder Shreyaan Daga became the youngest founder to secure institutional funding on Shark Tank India.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
              <div className="rounded-2xl overflow-hidden mb-4 relative group">
                <img src="/school/afterschool/asc_page_2.webp" alt="KBC Hot Seat" className="w-full h-48 object-cover" />
                <a
                  href={KBC_YT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </a>
              </div>
              <h4 className="font-bold text-slate-900 text-base">Kaun Banega Crorepati Season 16</h4>
              <p className="text-xs text-slate-600 mt-1">
                Featured on the hot seat with Mr. Amitabh Bachchan, spotlighting practical skills for young Indians.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Lead Form */}
      <section id="inquiry" className="py-16 sm:py-20 bg-gradient-to-b from-slate-50 to-red-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-12">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
                Get in Touch
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
                Launch After-School Robo Club at Your School
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Our Club Director will walk you through room requirements, equipment delivery, faculty training, and revenue estimates.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Thank You for Your Interest!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  We have received your details. An OLL Academic Advisor will call you within 24 hours to schedule an in-person or virtual consultation.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs font-bold text-red-600 underline"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">School Name *</label>
                    <input
                      type="text"
                      name="school_name"
                      required
                      value={form.school_name}
                      onChange={handleChange}
                      placeholder="e.g. St. Xavier's High School"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      name="contact_name"
                      value={form.contact_name}
                      onChange={handleChange}
                      placeholder="e.g. Principal / Coordinator"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="principal@school.edu.in"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / State</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Mumbai, Maharashtra"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Model</label>
                  <select
                    name="model"
                    value={form.model}
                    onChange={handleChange}
                    className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                  >
                    <option value="School-Managed Model">Option 1: School-Managed Model (School retains revenue, no royalty)</option>
                    <option value="OLL-Managed Model">Option 2: OLL-Managed Model (OLL provides teacher, revenue-share)</option>
                    <option value="Unsure / Need Guidance">Unsure / Need Guidance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Any Specific Requirements</label>
                  <textarea
                    name="message"
                    rows={2}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="e.g. Expected batch size, room dimensions, summer camp dates..."
                    className="w-full text-sm px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-red-500/25 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting Inquiry...' : 'Submit Club Setup Request →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* LMS & Operational Backbone */}
      <LMSSection />

      {/* Cross-linking to related school programs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SchoolRelatedPrograms current="after-school-club" />
      </div>

      {/* Footer */}
      <Footer />

      {/* Download Curriculum Gate Modal */}
      {gateOpen && (
        <CurriculumGateModal
          onClose={() => setGateOpen(false)}
          downloadUrl={BROCHURE_PDF_URL}
          fileName={BROCHURE_NAME}
          subject="After-School Robo Club Brochure"
        />
      )}
    </div>
  );
}
