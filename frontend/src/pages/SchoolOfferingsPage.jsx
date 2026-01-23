import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, CheckCircle, Building2, Users, BookOpen, 
  Cpu, Code, Brain, Lightbulb, TrendingUp, Menu, X,
  GraduationCap, Award, Target, Clock, Phone, Play, ChevronRight, School
} from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';
import Footer from '../components/Footer';
import SchoolCaseStudies from '../components/SchoolCaseStudies';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// School Offerings Data - Categories with sub-offerings
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
  },
];

// Partner Schools
const PARTNER_SCHOOLS = [
  'Greenlawns High School', 'G.D. Somani Memorial School', 'N.L. Dalmia High School',
  'Hiranandani Foundation School', 'JBCN International School', 'Seven Square Academy',
  'Goregaon Education Society English Medium School', 'Sanjeevani World School',
  'Fravashi International Academy', 'Maneckji Cooper Education Trust', 'Excelsior School',
  'J.N. Petit School', 'Seth Anandram Jaipuria School', 'St. Kabir School',
  'St. Gregorios High School', 'St. Anne\'s High School Fort', 'St. Wilfred\'s School',
  'Manav Mandir High School', 'Jankidevi Public School', 'Guardian School',
  'Parle Tilak Vidyalaya', 'JB Vachha High School', 'Vedas International School',
  'C.N.M. & N.D. Parekh ICSE School', 'Ram Ratna International School', 'Navodaya Central School'
];

// Events
const OUR_EVENTS = [
  {
    id: 'techfest',
    title: 'OLL Robotics Competition at IIT Bombay Techfest 2025',
    subtitle: 'National Level Competition',
    description: 'Our students compete at India\'s largest science and technology festival.',
    videoId: 'B0n8-RYegVc',
    image: 'https://img.youtube.com/vi/B0n8-RYegVc/maxresdefault.jpg'
  },
  {
    id: 'skill-titans',
    title: 'Skill Titans - TV Show on CNBC TV18',
    subtitle: 'Funding Student Entrepreneurs',
    description: 'India\'s first TV show where school students pitch their business ideas to real investors.',
    videoId: 'KJMH8EAB6NI',
    image: 'https://img.youtube.com/vi/KJMH8EAB6NI/maxresdefault.jpg'
  }
];

const SchoolOfferingsPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [caseStudies, setCaseStudies] = useState([]);
  const [partnerSchools, setPartnerSchools] = useState([]);

  useEffect(() => {
    // Fetch case studies from backend
    axios.get(`${API}/case-studies`)
      .then(res => setCaseStudies(res.data || []))
      .catch(() => setCaseStudies([]));
    
    // Fetch partner schools
    axios.get(`${API}/partner-schools`)
      .then(res => setPartnerSchools(res.data || []))
      .catch(() => setPartnerSchools(PARTNER_SCHOOLS));
  }, []);

  return (
    <>
      <Helmet>
        <title>School Programs | OLL - Robotics & AI for Schools</title>
        <meta name="description" content="Partner with OLL for skill education in your school. Robotics labs, coding curriculum, AI training, competitions & more." />
        <link rel="canonical" href="https://oll.co/school-offerings" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL Logo - Skill Education Platform"
                  title="OLL - School Programs"
                  loading="eager"
                  width="120"
                  height="40"
                  className="h-10 w-auto"
                />
              </Link>
              
              <div className="hidden md:flex items-center gap-8">
                <Link to="/offerings" className="text-slate-600 hover:text-[#1E3A5F] font-medium">Offerings</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium">About</Link>
                <Button 
                  onClick={() => navigate('/school')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Book a Meeting
                </Button>
              </div>

              <button 
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden bg-white border-t border-slate-100 py-4 px-4 space-y-3">
                <Link 
                  to="/offerings" 
                  className="block py-2 text-slate-600 hover:text-[#1E3A5F] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Offerings
                </Link>
                <Link 
                  to="/about" 
                  className="block py-2 text-slate-600 hover:text-[#1E3A5F] font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  About
                </Link>
                <Button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate('/school');
                  }}
                  className="w-full bg-[#D63031] hover:bg-[#b52828] text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Book a Meeting
                </Button>
              </div>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#1E3A5F] via-[#2C5282] to-[#D63031] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm mb-6">
              <Building2 className="w-4 h-4" />
              For Schools & Institutions
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Transform Your School with
              <br />
              <span className="text-yellow-400">Future-Ready Skills</span>
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto mb-8">
              Complete programs in Robotics, AI, Coding, Entrepreneurship & Financial Literacy.
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/school')}
                className="bg-white text-[#1E3A5F] hover:bg-slate-100"
              >
                <Phone className="w-5 h-5 mr-2" />
                Book a Meeting
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => document.getElementById('offerings').scrollIntoView({ behavior: 'smooth' })}
                className="border-white text-white hover:bg-white/10"
              >
                Explore Programs
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 bg-white border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">500+</div>
                <div className="text-slate-600 text-sm mt-1">Partner Schools</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-[#D63031]">1M+</div>
                <div className="text-slate-600 text-sm mt-1">Students Trained</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">50+</div>
                <div className="text-slate-600 text-sm mt-1">Cities Covered</div>
              </div>
              <div>
                <div className="text-3xl md:text-4xl font-bold text-[#D63031]">98%</div>
                <div className="text-slate-600 text-sm mt-1">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </section>

        {/* Offerings by Category - All Expanded */}
        <section id="offerings" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our School Programs
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Comprehensive skill education programs tailored for schools
              </p>
            </div>

            <div className="space-y-8">
              {SCHOOL_CATEGORIES.map((category) => (
                <div 
                  key={category.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100"
                  data-testid={`category-${category.id}`}
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
          </div>
        </section>

        {/* School Case Studies - Dynamic from Admin */}
        {caseStudies.length > 0 && (
          <section className="py-16 bg-slate-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  School Case Studies
                </h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Watch how OLL is transforming education in schools across India
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {caseStudies.map((study) => (
                  <div 
                    key={study.id}
                    className="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                    data-testid={`case-study-${study.id}`}
                  >
                    <div className="aspect-video relative group">
                      <img 
                        src={`https://img.youtube.com/vi/${study.video_id}/maxresdefault.jpg`} 
                        alt={study.school_name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.target.src = `https://img.youtube.com/vi/${study.video_id}/hqdefault.jpg`; }}
                      />
                      <a 
                        href={`https://www.youtube.com/watch?v=${study.video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                          <Play className="w-6 h-6 text-[#D63031] ml-1" />
                        </div>
                      </a>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#1E3A5F] mb-1">{study.school_name}</h3>
                      {study.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">{study.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Our Events */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our Events
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Flagship events that showcase student talent and achievements
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {OUR_EVENTS.map((event) => (
                <div 
                  key={event.id}
                  className="bg-slate-50 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                  data-testid={`event-${event.id}`}
                >
                  <div className="aspect-video relative group">
                    <img 
                      src={event.image} 
                      alt={event.title}
                      className="w-full h-full object-cover"
                      onError={(e) => { e.target.src = `https://img.youtube.com/vi/${event.videoId}/hqdefault.jpg`; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-6">
                      <div>
                        <span className="px-3 py-1 bg-[#D63031] text-white text-xs rounded-full">
                          {event.subtitle}
                        </span>
                      </div>
                    </div>
                    <a 
                      href={`https://www.youtube.com/watch?v=${event.videoId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                    >
                      <Play className="w-6 h-6 text-[#D63031] ml-1" />
                    </a>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{event.title}</h3>
                    <p className="text-slate-600 text-sm">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-gradient-to-br from-[#1E3A5F] to-[#2C5282]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Award className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Transform Your School?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Schedule a call with our team to discuss the best programs for your school.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/school')}
              className="bg-white text-[#1E3A5F] hover:bg-slate-100"
            >
              <Phone className="w-5 h-5 mr-2" />
              Book a Meeting
            </Button>
          </div>
        </section>

        {/* Schools We Work With - Names Section (moved to bottom after case studies) */}
        <section className="py-16 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Schools We Work With
              </h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Trusted by leading educational institutions across India
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 mb-12">
              {PARTNER_SCHOOLS.map((school, idx) => (
                <div 
                  key={idx}
                  className="px-6 py-3 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm"
                >
                  <School className="w-4 h-4 inline mr-2" />
                  {school}
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default SchoolOfferingsPage;
