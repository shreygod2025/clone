import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  GraduationCap, Building2, ArrowRight, Users, BookOpen, 
  Cpu, Code, Brain, Lightbulb, TrendingUp, Clock, ChevronRight,
  Play, School, Award, Star, Quote
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
    gradient: 'from-red-500 to-orange-500',
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
    gradient: 'from-blue-600 to-cyan-500',
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
    gradient: 'from-purple-600 to-pink-500',
    color: '#8B5CF6',
    duration: '3-6 months',
    classSize: '1:4 ratio'
  },
  {
    id: 'entrepreneurship',
    name: 'Entrepreneurship',
    tagline: 'Learn to build and run a business',
    emoji: '💡',
    icon: Lightbulb,
    gradient: 'from-yellow-500 to-orange-500',
    color: '#F59E0B',
    duration: '2-3 months',
    classSize: '1:6 ratio'
  },
  {
    id: 'financial-literacy',
    name: 'Financial Literacy',
    tagline: 'Master money management and investing',
    emoji: '📈',
    icon: TrendingUp,
    gradient: 'from-green-500 to-teal-500',
    color: '#10B981',
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
    gradient: 'from-red-500 to-orange-500',
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
    color: '#10B981',
    gradient: 'from-green-500 to-teal-500',
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
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-pink-500',
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
    gradient: 'from-blue-600 to-cyan-500',
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

const OfferingsPage = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('individuals');
  const [caseStudies, setCaseStudies] = useState([]);

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
          </>
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
