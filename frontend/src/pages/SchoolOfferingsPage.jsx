import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, CheckCircle, Building2, Users, BookOpen, 
  Cpu, Code, Brain, Lightbulb, TrendingUp, Menu, X,
  GraduationCap, Award, Target, Clock, Phone
} from 'lucide-react';
import { Button } from '../components/ui/button';

const SCHOOL_OFFERINGS = [
  {
    id: 'robotics-lab',
    title: 'Robotics Lab Setup',
    subtitle: 'Complete Lab Infrastructure',
    description: 'Transform your school with a state-of-the-art robotics lab. We provide complete setup including equipment, curriculum, and trained educators.',
    icon: Cpu,
    color: '#D63031',
    gradient: 'from-red-500 to-orange-500',
    features: [
      'Complete lab equipment & kits',
      'Age-appropriate curriculum (Grade 1-12)',
      'Trained educators provided',
      'Annual maintenance support',
      'Student certifications'
    ],
    highlights: {
      students: '500+',
      duration: '1 Academic Year',
      support: '24/7'
    }
  },
  {
    id: 'coding-program',
    title: 'Coding & Programming',
    subtitle: 'School-Wide Program',
    description: 'Comprehensive coding curriculum from block-based programming to advanced languages. Perfect for integrating into your school timetable.',
    icon: Code,
    color: '#1E3A5F',
    gradient: 'from-blue-600 to-cyan-500',
    features: [
      'Scratch to Python pathway',
      'Web & App Development',
      'Integrated with academics',
      'Project-based learning',
      'Hackathons & competitions'
    ],
    highlights: {
      students: '1000+',
      duration: 'Year-round',
      support: 'Dedicated'
    }
  },
  {
    id: 'ai-ml-program',
    title: 'AI & Machine Learning',
    subtitle: 'Future-Ready Skills',
    description: 'Introduce your students to the world of Artificial Intelligence. Hands-on projects with real AI tools and platforms.',
    icon: Brain,
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-pink-500',
    features: [
      'AI fundamentals for all ages',
      'Machine Learning basics',
      'ChatGPT & AI tools training',
      'Data science introduction',
      'Real-world AI projects'
    ],
    highlights: {
      students: '300+',
      duration: '6 Months',
      support: 'Expert'
    }
  },
  {
    id: 'entrepreneurship',
    title: 'Entrepreneurship Program',
    subtitle: 'Business & Innovation',
    description: 'Nurture the next generation of entrepreneurs. Students learn ideation, business planning, and pitch their ideas to real investors.',
    icon: Lightbulb,
    color: '#F59E0B',
    gradient: 'from-yellow-500 to-orange-500',
    features: [
      'Idea generation workshops',
      'Business model canvas',
      'Financial literacy basics',
      'Pitch competitions',
      'Mentorship from founders'
    ],
    highlights: {
      students: '200+',
      duration: '1 Semester',
      support: 'Mentors'
    }
  },
  {
    id: 'financial-literacy',
    title: 'Financial Literacy',
    subtitle: 'Money Management',
    description: 'Essential life skills for managing money. From savings to investments, students learn practical financial concepts.',
    icon: TrendingUp,
    color: '#10B981',
    gradient: 'from-green-500 to-teal-500',
    features: [
      'Personal finance basics',
      'Savings & budgeting',
      'Introduction to investing',
      'Stock market simulation',
      'Real-world money projects'
    ],
    highlights: {
      students: '400+',
      duration: '3 Months',
      support: 'Interactive'
    }
  },
  {
    id: 'teacher-training',
    title: 'Teacher Training',
    subtitle: 'Train Your Own Staff',
    description: 'Empower your teachers to deliver skill education. Comprehensive training programs with certification.',
    icon: GraduationCap,
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-500',
    features: [
      'Skill-specific training',
      'Pedagogy workshops',
      'Hands-on practice sessions',
      'OLL Certification',
      'Ongoing support & updates'
    ],
    highlights: {
      students: 'N/A',
      duration: '2 Weeks',
      support: 'Continuous'
    }
  }
];

const SchoolOfferingsPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      <Helmet>
        <title>School Programs | OLL - Skill Education for Schools</title>
        <meta name="description" content="Partner with OLL for comprehensive skill education programs in your school. Robotics labs, coding curriculum, AI training, and more." />
        <meta name="keywords" content="school robotics lab, coding for schools, AI education, skill programs for schools, OLL school partnership" />
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
                  alt="OLL" 
                  className="h-10"
                />
              </Link>
              
              <div className="hidden md:flex items-center gap-8">
                <Link to="/courses" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Courses</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">About</Link>
                <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Centers</Link>
                <Button 
                  onClick={() => navigate('/school')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                  data-testid="book-meeting-btn"
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
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-3">
              <Link to="/courses" className="block py-2 text-slate-600">Courses</Link>
              <Link to="/about" className="block py-2 text-slate-600">About</Link>
              <Link to="/centers" className="block py-2 text-slate-600">Centers</Link>
              <Button 
                onClick={() => navigate('/school')}
                className="w-full bg-[#D63031] text-white mt-2"
              >
                Book a Meeting
              </Button>
            </div>
          )}
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
              Partner with OLL to bring world-class skill education to your students. 
              Complete programs, trained educators, and end-to-end support.
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

        {/* Stats Section */}
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

        {/* Offerings Grid */}
        <section id="offerings" className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our School Programs
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Choose from our comprehensive suite of skill education programs designed specifically for schools.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SCHOOL_OFFERINGS.map((offering) => (
                <Link
                  key={offering.id}
                  to={`/school-offerings/${offering.id}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
                  data-testid={`offering-${offering.id}`}
                >
                  {/* Header */}
                  <div className={`p-6 bg-gradient-to-br ${offering.gradient}`}>
                    <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                      <offering.icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">{offering.title}</h3>
                    <p className="text-white/70 text-sm">{offering.subtitle}</p>
                  </div>
                  
                  {/* Content */}
                  <div className="p-6">
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                      {offering.description}
                    </p>
                    
                    <ul className="space-y-2 mb-4">
                      {offering.features.slice(0, 3).map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-sm font-medium" style={{ color: offering.color }}>
                        Learn more
                      </span>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:translate-x-1 transition-transform" style={{ color: offering.color }} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-[#1E3A5F] to-[#2C5282]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <Award className="w-16 h-16 text-yellow-400 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Transform Your School?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Join 500+ schools that have already partnered with OLL. Our team will work with you to create a customized program that fits your school's needs.
            </p>
            <Button 
              size="lg"
              onClick={() => navigate('/school')}
              className="bg-white text-[#1E3A5F] hover:bg-slate-100"
            >
              <Phone className="w-5 h-5 mr-2" />
              Schedule a Call
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} OLL - One Life Learning. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </>
  );
};

export default SchoolOfferingsPage;
