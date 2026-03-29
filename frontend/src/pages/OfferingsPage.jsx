import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  GraduationCap, Building2, ArrowRight, Users, BookOpen, 
  Cpu, Code, Brain, Lightbulb, TrendingUp, Clock, ChevronRight,
  Play, School, Award, Star, Quote, X, Zap
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Individual Courses (existing courses)
const INDIVIDUAL_COURSES = [
  {
    id: 'robotics',
    name: 'Robotics',
    tagline: 'Build, program, and innovate with robots',
    emoji: '🤖',
    icon: Cpu,
    gradient: 'from-[#D63031] to-[#e84142]',
    color: '#D63031',
    duration: '3-6 months',
    classSize: '1:5 ratio'
  },
  {
    id: 'coding',
    name: 'Coding & Programming',
    tagline: 'Master programming from basics to advanced',
    emoji: '💻',
    icon: Code,
    gradient: 'from-[#1E3A5F] to-[#2C5282]',
    color: '#1E3A5F',
    duration: '6-12 months',
    classSize: '1:4 ratio'
  },
  {
    id: 'ai',
    name: 'AI & Machine Learning',
    tagline: 'Explore artificial intelligence and ML',
    emoji: '🧠',
    icon: Brain,
    gradient: 'from-[#D63031] to-[#1E3A5F]',
    color: '#D63031',
    duration: '3-6 months',
    classSize: '1:4 ratio'
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    tagline: 'Learn to build and run a business',
    emoji: '💡',
    icon: Lightbulb,
    gradient: 'from-[#1E3A5F] to-[#D63031]',
    color: '#1E3A5F',
    duration: '2-3 months',
    classSize: '1:6 ratio'
  },
  {
    id: 'financial-literacy',
    name: 'Financial Literacy',
    tagline: 'Master money management and investing',
    emoji: '📈',
    icon: TrendingUp,
    gradient: 'from-[#1E3A5F] to-[#2C5282]',
    color: '#1E3A5F',
    duration: '2-3 months',
    classSize: '1:6 ratio'
  }
];

// School Offerings Categories with full offerings
const SCHOOL_CATEGORIES = [
  {
    id: 'robotics',
    title: 'Robotics',
    subtitle: 'Complete Robotics Solutions',
    icon: Cpu,
    color: '#D63031',
    gradient: 'from-[#D63031] to-[#e84142]',
    offerings: [
      { id: 'robotics-curriculum-kits', title: 'Robotics Curriculum with Take-home Kits & Books' },
      { id: 'robotics-lab-setup', title: 'Robotics Curriculum with Lab Setup & Books' },
      { id: 'robotics-exhibition-prep', title: 'Robotics Exhibition Preparation' },
      { id: 'host-robotics-exhibition', title: 'Host a Robotics Exhibition in Your School' },
      { id: 'iit-bombay-competitions', title: 'Participate in Robotics Competitions at IIT Bombay' },
      { id: 'robotics-competition-prep', title: 'Preparation for Robotics Competitions' },
      { id: 'icse-group3-kits', title: 'Grade 9 & 10 ICSE Group 3 Subject Kits' },
      { id: 'afterschool-robotics', title: 'Afterschool Robotics Classes' },
      { id: 'robotics-summer-camp', title: 'Robotics Summer Camp' },
      { id: 'robotics-ai-seminar', title: 'Robotics & AI Seminar for Students' },
      { id: 'robotics-books', title: 'Robotics Books' },
      { id: 'robotics-kits', title: 'Robotics Kits' },
    ]
  },
  {
    id: 'financial-literacy',
    title: 'Financial Literacy & Entrepreneurship',
    subtitle: 'Business & Money Skills',
    icon: TrendingUp,
    color: '#1E3A5F',
    gradient: 'from-[#1E3A5F] to-[#2C5282]',
    offerings: [
      { id: 'entrepreneurship-workshop', title: 'Entrepreneurship 3 Day Workshop' },
      { id: 'skill-titans-olympiad', title: 'Skill Titans TV Show & Entrepreneurship Olympiad' },
      { id: 'fl-curriculum', title: 'Financial Literacy & Entrepreneurship Program as Part of Curriculum' },
      { id: 'ecell-opening', title: 'E-Cell Opening in School' },
      { id: 'fl-summer-camp', title: 'Financial Literacy & Entrepreneurship Summer Camp' },
    ]
  },
  {
    id: 'ai',
    title: 'AI & Machine Learning',
    subtitle: 'Future-Ready AI Skills',
    icon: Brain,
    color: '#D63031',
    gradient: 'from-[#D63031] to-[#1E3A5F]',
    offerings: [
      { id: 'ai-center-excellence', title: 'Launch an AI Center for Excellence' },
      { id: 'agentic-ai-workshop', title: 'Agentic AI Workshop for Students' },
      { id: 'ai-seminar', title: 'AI Seminar' },
      { id: 'agentic-ai-summer-camp', title: 'Agentic AI Summer Camp' },
      { id: 'ai-services-agency-course', title: 'Start AI Services Agency Course for College Students' },
    ]
  },
  {
    id: 'coding',
    title: 'Coding & Programming',
    subtitle: 'Build Future Developers',
    icon: Code,
    color: '#1E3A5F',
    gradient: 'from-[#1E3A5F] to-[#2C5282]',
    offerings: [
      { id: 'vibe-coding-seminar', title: 'Vibe Coding Seminar' },
      { id: 'coding-afterschool', title: 'Coding & Logic Building After School Classes' },
      { id: 'coding-summer-camp', title: 'Coding Summer Camp' },
    ]
  }
];

// Partner Schools with logos
const PARTNER_SCHOOLS = [
  'Greenlawns High School',
  'G.D. Somani Memorial School',
  'N.L. Dalmia High School',
  'Hiranandani Foundation School',
  'JBCN International School',
  'Seven Square Academy',
  'Goregaon Education Society English Medium School',
  'Sanjeevani World School',
  'Fravashi International Academy',
  'Maneckji Cooper Education Trust',
  'Excelsior School',
  'J.N. Petit School',
  'Seth Anandram Jaipuria School',
  'St. Kabir School',
  'St. Gregorios High School',
  'St. Anne\'s High School Fort',
  'St. Wilfred\'s School',
  'Manav Mandir High School',
  'Jankidevi Public School',
  'Guardian School',
  'Parle Tilak Vidyalaya',
  'JB Vachha High School',
  'Vedas International School',
  'C.N.M. & N.D. Parekh ICSE School',
  'Ram Ratna International School',
  'Navodaya Central School'
];

// School Case Studies
const CASE_STUDIES = [
  {
    school: 'Parle Tilak Vidyalaya ICSE',
    videoId: 'XGmUDHjPaq0',
    description: 'See how Parle Tilak Vidyalaya integrated robotics into their curriculum'
  },
  {
    school: 'Goregaon English Medium School',
    videoId: 'MM36G7rmAOU',
    description: 'Transforming education with hands-on learning'
  },
  {
    school: 'Maneckji Cooper Education Trust',
    videoId: 'vOik-WmE_n8',
    description: 'Building future-ready skills in students'
  },
  {
    school: 'Tayiah Biyah High School',
    videoId: 'dWo2wr02mq4',
    description: 'Empowering students through skill education'
  },
  {
    school: 'Greenlawns High School Warden Road',
    videoId: 'YoIu5akBkr0',
    description: 'Creating innovators and problem solvers'
  },
  {
    school: 'OLL Success Story',
    videoId: 'q6mHoHsdmhA',
    description: 'Student achievements and transformations'
  }
];

// Events
const OUR_EVENTS = [
  {
    id: 'techfest',
    title: 'OLL Robotics Competition at IIT Bombay Techfest 2025',
    subtitle: 'National Level Competition',
    videoId: 'B0n8-RYegVc',
    description: 'Our students compete at India\'s largest science and technology festival'
  },
  {
    id: 'skill-titans',
    title: 'Skill Titans - TV Show on CNBC TV18',
    subtitle: 'Funding Student Entrepreneurs',
    videoId: 'KJMH8EAB6NI',
    description: 'India\'s first show where school students pitch to real investors'
  }
];

// Age Group Selector Modal
const AgeGroupModal = ({ onClose, onSelect }) => {
  const groups = [
    {
      slug: 'explorers', label: 'Little Explorers', ages: '4 – 8',
      tagline: 'First steps into robotics & coding',
      color: '#00E5FF', gradient: 'linear-gradient(135deg, rgba(0,229,255,0.15) 0%, rgba(0,153,204,0.08) 100%)',
      icon: '🚀',
    },
    {
      slug: 'creators', label: 'Tech Creators', ages: '9 – 12',
      tagline: 'Build robots and write real code',
      color: '#D63031', gradient: 'linear-gradient(135deg, rgba(214,48,49,0.15) 0%, rgba(255,107,53,0.08) 100%)',
      icon: '⚙️',
    },
    {
      slug: 'innovators', label: 'Future Innovators', ages: '13 – 16',
      tagline: 'AI, 3D Design & advanced robotics',
      color: '#7C3AED', gradient: 'linear-gradient(135deg, rgba(124,58,237,0.15) 0%, rgba(214,48,49,0.08) 100%)',
      icon: '🤖',
    },
  ];

  return (
    <div
      data-testid="age-selector-modal"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(8,12,22,0.92)', backdropFilter: 'blur(16px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1.5rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0D1829', border: '1px solid rgba(0,229,255,0.2)',
          borderRadius: '2rem', padding: '2.5rem', maxWidth: 680, width: '100%',
          boxShadow: '0 0 80px rgba(0,229,255,0.08)',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}
        >
          <X size={16} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <p style={{ fontSize: '0.65rem', fontFamily: 'Outfit, sans-serif', letterSpacing: '0.2em', color: '#00E5FF', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
            Future Skills Summer Camp 2026
          </p>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.2rem, 3vw, 1.6rem)', fontWeight: 900, color: '#F8FAFC', marginBottom: '0.5rem' }}>
            Select Your Child's Age Group
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem', fontFamily: 'Outfit, sans-serif' }}>
            Each camp is designed for that specific age group's learning stage
          </p>
        </div>

        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
          {groups.map(g => (
            <button
              key={g.slug}
              data-testid={`age-group-${g.slug}`}
              onClick={() => onSelect(g.slug)}
              style={{
                background: g.gradient, border: `1px solid ${g.color}33`,
                borderRadius: '1.25rem', padding: '1.75rem 1.25rem',
                cursor: 'pointer', textAlign: 'center',
                transition: 'all 0.25s', fontFamily: 'Outfit, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = g.color; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = `0 8px 30px ${g.color}25`; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = `${g.color}33`; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{g.icon}</div>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: '0.85rem', color: g.color, marginBottom: '0.25rem' }}>
                Ages {g.ages}
              </div>
              <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#F8FAFC', marginBottom: '0.5rem' }}>
                {g.label}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94A3B8', lineHeight: 1.4 }}>
                {g.tagline}
              </div>
              <div style={{ marginTop: '1rem', display: 'inline-flex', alignItems: 'center', gap: 4, color: g.color, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Explore <ArrowRight size={12} />
              </div>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748B', marginTop: '1.5rem', fontFamily: 'Outfit, sans-serif' }}>
          ₹1,999 per child · May 2026 · Mumbai Centers + Online
        </p>
      </div>
    </div>
  );
};

const OfferingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('individuals');
  const [caseStudies, setCaseStudies] = useState([]);
  const [showAgeModal, setShowAgeModal] = useState(false);

  useEffect(() => {
    // Fetch case studies from backend
    axios.get(`${API}/case-studies`)
      .then(res => setCaseStudies(res.data || []))
      .catch(() => setCaseStudies([]));
  }, []);

  return (
    <>
      <Helmet>
        <title>Offerings | OLL - Skill Education for All</title>
        <meta name="description" content="Explore OLL's skill education offerings for individuals and schools. Robotics, Coding, AI, Entrepreneurship and more." />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        <Navbar showBookDemo onBookDemo={() => navigate('/student')} />

        {/* Hero */}
        <section className="bg-gradient-to-br from-[#1E3A5F] to-[#D63031] py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Our Offerings
            </h1>
            <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">
              Future-ready skill education for individuals and schools
            </p>

            {/* Section Toggle */}
            <div className="inline-flex bg-white/10 backdrop-blur-sm rounded-full p-1 gap-1">
              <button
                onClick={() => setActiveSection('individuals')}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  activeSection === 'individuals'
                    ? 'bg-white text-[#1E3A5F]'
                    : 'text-white hover:bg-white/10'
                }`}
                data-testid="tab-individuals"
              >
                <GraduationCap className="w-5 h-5 inline mr-2" />
                For Individuals
              </button>
              <button
                onClick={() => setActiveSection('schools')}
                className={`px-6 py-3 rounded-full font-medium transition-all ${
                  activeSection === 'schools'
                    ? 'bg-white text-[#1E3A5F]'
                    : 'text-white hover:bg-white/10'
                }`}
                data-testid="tab-schools"
              >
                <Building2 className="w-5 h-5 inline mr-2" />
                For Schools
              </button>
            </div>
          </div>
        </section>

        {/* INDIVIDUALS SECTION */}
        {activeSection === 'individuals' && (
          <>
            {/* Individual Courses */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Courses for Students & Adults
                  </h2>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Learn from expert educators in small batches. Online and offline options available.
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {INDIVIDUAL_COURSES.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
                      data-testid={`course-${course.id}`}
                    >
                      <div className={`h-40 bg-gradient-to-br ${course.gradient} flex items-center justify-center relative`}>
                        <span className="text-6xl">{course.emoji}</span>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#D63031] transition-colors">
                          {course.name}
                        </h3>
                        <p className="text-slate-600 text-sm mb-4">{course.tagline}</p>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {course.duration}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {course.classSize}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium" style={{ color: course.color }}>
                            Learn more
                          </span>
                          <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#D63031] group-hover:translate-x-1 transition-all" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>

                <div className="text-center mt-8">
                  <Button onClick={() => navigate('/student')} className="bg-[#D63031] hover:bg-[#b52828]">
                    Book a Free Demo Class
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </section>

            {/* SUMMER CAMPS SECTION */}
            <section className="py-16" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #0D1829 100%)' }}>
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                  <p style={{ fontFamily: 'Outfit, sans-serif', fontSize: '0.7rem', letterSpacing: '0.2em', color: '#D63031', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Exclusive · Limited Seats
                  </p>
                  <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.5rem, 4vw, 2.5rem)', fontWeight: 900, color: '#0D1829', marginBottom: '0.5rem' }}>
                    Summer Camps 2026
                  </h2>
                  <p style={{ color: '#475569', maxWidth: 480, margin: '0 auto', fontSize: '0.95rem', fontFamily: 'Outfit, sans-serif' }}>
                    Intensive 2-week camps where kids build real tech projects with expert mentors
                  </p>
                </div>

                {/* Summer Camp Card */}
                <div
                  data-testid="summer-camp-offering-card"
                  onClick={() => setShowAgeModal(true)}
                  style={{
                    position: 'relative',
                    background: 'linear-gradient(135deg, #080C16 0%, #1E3A5F 50%, #0D1829 100%)',
                    border: '1px solid rgba(0,229,255,0.25)',
                    borderRadius: '2rem',
                    padding: '3rem',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'all 0.4s',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.3)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#00E5FF'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,229,255,0.15), 0 8px 40px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(0,0,0,0.3)'; e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  {/* Circuit pattern */}
                  <div style={{ position: 'absolute', inset: 0, opacity: 0.15, pointerEvents: 'none' }}>
                    <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                      <defs>
                        <pattern id="circuit-card" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                          <path d="M60 0 L0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                          <circle cx="0" cy="0" r="2" fill="#00E5FF" />
                          <path d="M30 0 L30 20 M30 40 L30 60 M0 30 L20 30 M40 30 L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                          <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#circuit-card)" />
                    </svg>
                  </div>
                  {/* Red glow */}
                  <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />
                  {/* Cyan glow */}
                  <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

                  <div className="relative grid md:grid-cols-2 gap-8 items-center">
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: '999px', background: 'rgba(214,48,49,0.2)', border: '1px solid #D63031', color: '#FF6B6B', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', animation: 'pulse 2s infinite' }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D63031', display: 'inline-block' }} />
                          Limited Spots
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: '999px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00E5FF', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                          May 2026
                        </span>
                      </div>
                      <h3 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.25rem, 3.5vw, 2rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1.2, marginBottom: '0.75rem' }}>
                        Future Skills<br />
                        <span style={{ color: '#00E5FF' }}>Summer Camp 2026</span>
                      </h3>
                      <p style={{ color: '#94A3B8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.5rem', fontFamily: 'Outfit, sans-serif', maxWidth: 380 }}>
                        Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for ages 4–16. Online or at Mumbai centers.
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.75rem' }}>
                        {[
                          { icon: '🏙️', text: 'Mumbai Centers' },
                          { icon: '💻', text: 'Online Option' },
                          { icon: '👨‍👩‍👧', text: '10 Kids/Batch' },
                          { icon: '📅', text: '4 Batch Weeks' },
                        ].map(f => (
                          <span key={f.text} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#CBD5E1', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif' }}>
                            {f.icon} {f.text}
                          </span>
                        ))}
                      </div>
                      <button
                        data-testid="summer-camp-cta-btn"
                        onClick={(e) => { e.stopPropagation(); setShowAgeModal(true); }}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 10,
                          padding: '0.9rem 2rem', borderRadius: '999px',
                          background: '#D63031', color: '#fff',
                          fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.85rem',
                          border: 'none', cursor: 'pointer',
                          boxShadow: '0 0 24px rgba(214,48,49,0.4)',
                          letterSpacing: '0.05em',
                          transition: 'all 0.3s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.6)'; e.currentTarget.style.background = '#FF3366'; }}
                        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 24px rgba(214,48,49,0.4)'; e.currentTarget.style.background = '#D63031'; }}
                      >
                        Book for ₹1,999
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Right: Age group preview */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { ages: '4–8', label: 'Little Explorers', color: '#00E5FF', icon: '🚀' },
                        { ages: '9–12', label: 'Tech Creators', color: '#D63031', icon: '⚙️' },
                        { ages: '13–16', label: 'Future Innovators', color: '#7C3AED', icon: '🤖' },
                      ].map(g => (
                        <div
                          key={g.ages}
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: `1px solid ${g.color}33`,
                            borderRadius: '1rem',
                            padding: '1.25rem 0.75rem',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{g.icon}</div>
                          <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 900, fontSize: '0.75rem', color: g.color, marginBottom: '0.25rem' }}>Ages {g.ages}</div>
                          <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontFamily: 'Outfit, sans-serif', lineHeight: 1.3 }}>{g.label}</div>
                        </div>
                      ))}
                      <div style={{ gridColumn: '1 / -1', background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)', borderRadius: '0.75rem', padding: '0.75rem', textAlign: 'center' }}>
                        <div style={{ fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#00E5FF' }}>₹1,999</div>
                        <div style={{ fontSize: '0.7rem', color: '#94A3B8', fontFamily: 'Outfit, sans-serif' }}>per child · all inclusive</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* Age Group Modal */}
        {showAgeModal && (
          <AgeGroupModal
            onClose={() => setShowAgeModal(false)}
            onSelect={(slug) => { setShowAgeModal(false); navigate(`/summer-camp/${slug}`); }}
          />
        )}

        {/* SCHOOLS SECTION */}
        {activeSection === 'schools' && (
          <>
            {/* School Programs - All Expanded */}
            <section className="py-16">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Programs for Schools
                  </h2>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Comprehensive skill education solutions with curriculum, kits, and trained educators
                  </p>
                </div>

                {/* All Categories Expanded */}
                <div className="space-y-8">
                  {SCHOOL_CATEGORIES.map((category) => (
                    <div 
                      key={category.id}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100"
                      data-testid={`school-cat-${category.id}`}
                    >
                      {/* Category Header */}
                      <div className={`p-5 bg-gradient-to-r ${category.gradient} text-white`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <category.icon className="w-6 h-6" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{category.title}</h3>
                            <p className="text-white/80 text-sm">{category.subtitle} • {category.offerings.length} programs</p>
                          </div>
                        </div>
                      </div>

                      {/* Offerings Grid - Always Visible */}
                      <div className="p-6">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {category.offerings.map((offering) => (
                            <Link
                              key={offering.id}
                              to={`/school-offerings/${category.id}/${offering.id}`}
                              className="group flex items-center gap-3 p-4 rounded-xl bg-slate-50 border-2 border-transparent hover:border-[#D63031] hover:bg-red-50/50 transition-all cursor-pointer"
                              data-testid={`offering-${offering.id}`}
                            >
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${category.color}15` }}>
                                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" style={{ color: category.color }} />
                              </div>
                              <span className="text-slate-700 text-sm font-medium group-hover:text-[#D63031] transition-colors leading-tight">
                                {offering.title}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-center mt-10">
                  <Button onClick={() => navigate('/school')} size="lg" className="bg-[#D63031] hover:bg-[#b52828]">
                    Book a Meeting with Our Team
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </section>

            {/* Partner Schools */}
            <section className="py-16 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm mb-4">
                    <Award className="w-4 h-4" />
                    Trusted Partner Since 5 Years
                  </div>
                  <h2 className="text-3xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Schools We Work With
                  </h2>
                  <p className="text-white/70 max-w-2xl mx-auto">
                    500+ schools across India trust OLL for skill education
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 mb-8">
                  {PARTNER_SCHOOLS.map((school, idx) => (
                    <div 
                      key={idx}
                      className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm flex items-center gap-2"
                    >
                      <School className="w-4 h-4" />
                      {school}
                    </div>
                  ))}
                </div>

                {/* Main Testimonial Video */}
                <div className="max-w-4xl mx-auto mb-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2">
                    <div className="aspect-video rounded-xl overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        src="https://www.youtube.com/embed/OavfLmAdprc"
                        title="School Testimonials"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <p className="text-center text-white/60 text-sm mt-3 pb-2">
                      <Quote className="w-4 h-4 inline mr-1" />
                      Hear from our partner schools about their OLL experience
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* School Case Studies - Dynamic from Admin with Static Fallback */}
            <section className="py-16 bg-slate-50">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    School Case Studies
                  </h2>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    See the impact of OLL programs in schools across India
                  </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(caseStudies.length > 0 ? caseStudies : CASE_STUDIES.map(s => ({ 
                    id: s.school, 
                    school_name: s.school, 
                    video_id: s.videoId, 
                    description: s.description 
                  }))).map((study, idx) => (
                    <div 
                      key={study.id || idx}
                      className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                      data-testid={`case-study-${idx}`}
                    >
                      <div className="aspect-video relative group">
                        <img 
                          src={`https://img.youtube.com/vi/${study.video_id || study.videoId}/maxresdefault.jpg`}
                          alt={study.school_name || study.school}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://img.youtube.com/vi/${study.video_id || study.videoId}/hqdefault.jpg`;
                          }}
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          <a 
                            href={`https://www.youtube.com/watch?v=${study.video_id || study.videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                          >
                            <Play className="w-6 h-6 text-[#D63031] ml-1" />
                          </a>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-[#1E3A5F] mb-1">{study.school_name || study.school}</h3>
                        <p className="text-sm text-slate-600">{study.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Our Events */}
            <section className="py-16 bg-white">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    Our Events
                  </h2>
                  <p className="text-slate-600 max-w-2xl mx-auto">
                    Flagship events showcasing student achievements
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {OUR_EVENTS.map((event) => (
                    <div 
                      key={event.id}
                      className="bg-slate-50 rounded-2xl overflow-hidden shadow-sm"
                      data-testid={`event-${event.id}`}
                    >
                      <div className="aspect-video relative group">
                        <img 
                          src={`https://img.youtube.com/vi/${event.videoId}/maxresdefault.jpg`}
                          alt={event.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = `https://img.youtube.com/vi/${event.videoId}/hqdefault.jpg`;
                          }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                          <span className="inline-block px-3 py-1 bg-[#D63031] text-white text-xs rounded-full w-fit mb-2">
                            {event.subtitle}
                          </span>
                        </div>
                        <a 
                          href={`https://www.youtube.com/watch?v=${event.videoId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                        >
                          <Play className="w-8 h-8 text-[#D63031] ml-1" />
                        </a>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{event.title}</h3>
                        <p className="text-slate-600">{event.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CTA */}
            <section className="py-16 bg-gradient-to-br from-[#1E3A5F] to-[#2C5282]">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <Building2 className="w-16 h-16 text-white/80 mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Ready to Transform Your School?
                </h2>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto">
                  Schedule a meeting with our team to discuss the best programs for your school.
                </p>
                <Button 
                  size="lg"
                  onClick={() => navigate('/school')}
                  className="bg-white text-[#1E3A5F] hover:bg-slate-100"
                >
                  Book a Meeting
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </section>
          </>
        )}

        <Footer />
      </div>
    </>
  );
};

export default OfferingsPage;
