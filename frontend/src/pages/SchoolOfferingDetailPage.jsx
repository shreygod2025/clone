import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, CheckCircle, Phone, Calendar, Users, Clock, 
  Award, Target, BookOpen, Play, Download, Menu, X,
  Cpu, Code, Brain, Lightbulb, TrendingUp, GraduationCap
} from 'lucide-react';
import { Button } from '../components/ui/button';

const OFFERINGS_DATA = {
  'robotics-lab': {
    id: 'robotics-lab',
    title: 'Robotics Lab Setup',
    subtitle: 'Complete Lab Infrastructure',
    description: 'Transform your school with a state-of-the-art robotics lab. We provide complete setup including equipment, curriculum, and trained educators.',
    longDescription: `Our Robotics Lab Setup program provides schools with everything needed to run a world-class robotics program. From hardware to curriculum to trained educators - we handle it all.

The program is designed to cater to students from Grade 1 to Grade 12, with age-appropriate modules that progressively build skills. Students start with basic robotics concepts and move on to advanced programming and AI-powered robots.`,
    icon: Cpu,
    color: '#D63031',
    gradient: 'from-red-500 to-orange-500',
    features: [
      'Complete lab equipment & robotics kits',
      'Age-appropriate curriculum (Grade 1-12)',
      'Trained OLL educators provided',
      'Annual maintenance & upgrade support',
      'Student certifications from OLL',
      'Inter-school robotics competitions',
      'Parent showcase events',
      'Dedicated lab manager support'
    ],
    curriculum: [
      { grade: 'Grade 1-3', topics: 'Basic mechanics, Simple machines, Block-based programming' },
      { grade: 'Grade 4-6', topics: 'Motors & sensors, Scratch programming, Mini projects' },
      { grade: 'Grade 7-9', topics: 'Arduino basics, Python programming, IoT projects' },
      { grade: 'Grade 10-12', topics: 'Advanced robotics, AI integration, Competition prep' }
    ],
    pricing: 'Custom pricing based on school size',
    duration: '1 Academic Year (Renewable)',
    support: '24/7 Technical Support',
    videoId: 'dQw4w9WgXcQ'
  },
  'coding-program': {
    id: 'coding-program',
    title: 'Coding & Programming',
    subtitle: 'School-Wide Program',
    description: 'Comprehensive coding curriculum from block-based programming to advanced languages. Perfect for integrating into your school timetable.',
    longDescription: `Our Coding & Programming program is designed to make every student code-literate. Starting from visual block-based programming, students progress through text-based languages like Python, JavaScript, and beyond.

The curriculum aligns with international CS education standards and prepares students for competitive exams, olympiads, and real-world tech careers.`,
    icon: Code,
    color: '#1E3A5F',
    gradient: 'from-blue-600 to-cyan-500',
    features: [
      'Scratch to Python learning pathway',
      'Web & Mobile App Development',
      'Integrated with academic timetable',
      'Project-based learning approach',
      'Monthly hackathons & competitions',
      'GitHub portfolio for each student',
      'Industry mentor sessions',
      'Coding olympiad preparation'
    ],
    curriculum: [
      { grade: 'Grade 1-3', topics: 'Scratch Jr, Logic building, Fun animations' },
      { grade: 'Grade 4-6', topics: 'Scratch, HTML basics, Simple games' },
      { grade: 'Grade 7-9', topics: 'Python, Web development, Data structures' },
      { grade: 'Grade 10-12', topics: 'Advanced Python, App development, Competitive coding' }
    ],
    pricing: 'Per-student pricing available',
    duration: 'Year-round Program',
    support: 'Dedicated Program Manager',
    videoId: 'dQw4w9WgXcQ'
  },
  'ai-ml-program': {
    id: 'ai-ml-program',
    title: 'AI & Machine Learning',
    subtitle: 'Future-Ready Skills',
    description: 'Introduce your students to the world of Artificial Intelligence. Hands-on projects with real AI tools and platforms.',
    longDescription: `The AI & Machine Learning program demystifies artificial intelligence for students of all ages. Through hands-on projects and real-world applications, students understand how AI works and create their own AI models.

Students learn to use industry-standard tools and platforms, preparing them for the AI-driven future job market.`,
    icon: Brain,
    color: '#8B5CF6',
    gradient: 'from-purple-600 to-pink-500',
    features: [
      'AI fundamentals for all age groups',
      'Machine Learning basics with projects',
      'ChatGPT & Generative AI training',
      'Data science introduction',
      'Real-world AI project building',
      'AI ethics & responsible use',
      'Cloud AI platforms training',
      'AI research paper writing'
    ],
    curriculum: [
      { grade: 'Grade 1-5', topics: 'AI awareness, Teachable Machine, AI games' },
      { grade: 'Grade 6-8', topics: 'ML basics, Image recognition, Chatbots' },
      { grade: 'Grade 9-10', topics: 'Python for AI, Neural networks, NLP basics' },
      { grade: 'Grade 11-12', topics: 'Deep learning, Computer vision, AI projects' }
    ],
    pricing: 'Module-based pricing',
    duration: '6 Months Program',
    support: 'AI Expert Support',
    videoId: 'dQw4w9WgXcQ'
  },
  'entrepreneurship': {
    id: 'entrepreneurship',
    title: 'Entrepreneurship Program',
    subtitle: 'Business & Innovation',
    description: 'Nurture the next generation of entrepreneurs. Students learn ideation, business planning, and pitch their ideas to real investors.',
    longDescription: `Our Entrepreneurship Program transforms students into innovative thinkers and future business leaders. Through a structured curriculum, students learn the complete journey from idea to execution.

The program culminates in a "Shark Tank" style pitch competition where students present their business ideas to real investors and entrepreneurs.`,
    icon: Lightbulb,
    color: '#F59E0B',
    gradient: 'from-yellow-500 to-orange-500',
    features: [
      'Idea generation & validation workshops',
      'Business model canvas training',
      'Financial literacy & planning',
      'Marketing & branding basics',
      'Pitch competitions with real investors',
      'Mentorship from successful founders',
      'Startup incubation support',
      'Networking with entrepreneur ecosystem'
    ],
    curriculum: [
      { grade: 'Grade 5-7', topics: 'Problem solving, Creative thinking, Mini business' },
      { grade: 'Grade 8-9', topics: 'Business planning, Market research, Prototyping' },
      { grade: 'Grade 10-11', topics: 'Financial planning, Marketing, Team building' },
      { grade: 'Grade 12', topics: 'Startup launch, Investor pitching, Scaling' }
    ],
    pricing: 'Semester-based pricing',
    duration: '1 Semester',
    support: 'Founder Mentors',
    videoId: 'dQw4w9WgXcQ'
  },
  'financial-literacy': {
    id: 'financial-literacy',
    title: 'Financial Literacy',
    subtitle: 'Money Management',
    description: 'Essential life skills for managing money. From savings to investments, students learn practical financial concepts.',
    longDescription: `Financial Literacy is a crucial life skill often missing from traditional education. Our program fills this gap by teaching students practical money management skills they'll use throughout their lives.

Through simulations, games, and real-world exercises, students learn about savings, budgeting, investing, and building wealth responsibly.`,
    icon: TrendingUp,
    color: '#10B981',
    gradient: 'from-green-500 to-teal-500',
    features: [
      'Personal finance fundamentals',
      'Savings & budgeting techniques',
      'Introduction to investing',
      'Stock market simulation games',
      'Cryptocurrency awareness',
      'Tax basics & compliance',
      'Real estate & asset building',
      'Financial goal planning'
    ],
    curriculum: [
      { grade: 'Grade 4-6', topics: 'Money basics, Saving habits, Needs vs wants' },
      { grade: 'Grade 7-8', topics: 'Budgeting, Banking basics, Compound interest' },
      { grade: 'Grade 9-10', topics: 'Stock market, Mutual funds, Portfolio building' },
      { grade: 'Grade 11-12', topics: 'Advanced investing, Tax planning, Wealth creation' }
    ],
    pricing: 'Flexible pricing',
    duration: '3 Months Program',
    support: 'Finance Expert Support',
    videoId: 'dQw4w9WgXcQ'
  },
  'teacher-training': {
    id: 'teacher-training',
    title: 'Teacher Training',
    subtitle: 'Train Your Own Staff',
    description: 'Empower your teachers to deliver skill education. Comprehensive training programs with certification.',
    longDescription: `The Teacher Training program enables schools to build internal capacity for skill education. We train your existing teachers to become certified OLL educators who can independently run skill programs.

This approach ensures sustainability and reduces dependency on external educators over time.`,
    icon: GraduationCap,
    color: '#EC4899',
    gradient: 'from-pink-500 to-rose-500',
    features: [
      'Skill-specific training modules',
      'Modern pedagogy workshops',
      'Hands-on practice sessions',
      'OLL Educator Certification',
      'Ongoing support & refresher courses',
      'Access to OLL curriculum & materials',
      'Community of trained educators',
      'Annual re-certification programs'
    ],
    curriculum: [
      { grade: 'Week 1', topics: 'Skill fundamentals, Teaching methodology, Tools training' },
      { grade: 'Week 2', topics: 'Hands-on practice, Live teaching, Feedback sessions' },
      { grade: 'Post-Training', topics: 'Ongoing support, Monthly check-ins, Resource updates' }
    ],
    pricing: 'Per-teacher pricing',
    duration: '2 Weeks Intensive',
    support: 'Continuous Support',
    videoId: 'dQw4w9WgXcQ'
  }
};

const SchoolOfferingDetailPage = () => {
  const navigate = useNavigate();
  const { offeringId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const offering = OFFERINGS_DATA[offeringId];
  
  if (!offering) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">Program not found</h1>
          <Button onClick={() => navigate('/school-offerings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Programs
          </Button>
        </div>
      </div>
    );
  }

  const IconComponent = offering.icon;

  return (
    <>
      <Helmet>
        <title>{offering.title} | OLL School Programs</title>
        <meta name="description" content={offering.description} />
        <link rel="canonical" href={`https://oll.co/school-offerings/${offering.id}`} />
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
                <Link to="/school-offerings" className="text-slate-600 hover:text-[#1E3A5F] font-medium">All Programs</Link>
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
          </div>
        </nav>

        {/* Hero Section */}
        <section className={`bg-gradient-to-br ${offering.gradient} py-16 md:py-20`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/school-offerings')}
              className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Programs
            </Button>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6">
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {offering.title}
                </h1>
                <p className="text-white/80 text-lg mb-6">
                  {offering.description}
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button 
                    size="lg"
                    onClick={() => navigate('/school')}
                    className="bg-white text-slate-900 hover:bg-slate-100"
                  >
                    <Phone className="w-5 h-5 mr-2" />
                    Get Started
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Brochure
                  </Button>
                </div>
              </div>
              
              <div className="hidden md:block">
                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Duration</div>
                      <div className="text-white font-medium">{offering.duration}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Support</div>
                      <div className="text-white font-medium">{offering.support}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Pricing</div>
                      <div className="text-white font-medium">{offering.pricing}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-8">
                {/* Description */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">About This Program</h2>
                  <div className="text-slate-600 whitespace-pre-line">
                    {offering.longDescription}
                  </div>
                </div>

                {/* Features */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">What's Included</h2>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {offering.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-slate-600">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Curriculum */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4">Curriculum Overview</h2>
                  <div className="space-y-4">
                    {offering.curriculum.map((item, idx) => (
                      <div key={idx} className="border-l-4 border-[#D63031] pl-4 py-2">
                        <div className="font-semibold text-[#1E3A5F]">{item.grade}</div>
                        <div className="text-slate-600 text-sm">{item.topics}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* CTA Card */}
                <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] rounded-2xl p-6 text-white">
                  <h3 className="text-xl font-bold mb-2">Ready to Get Started?</h3>
                  <p className="text-white/80 text-sm mb-4">
                    Schedule a call with our school partnerships team to discuss implementation.
                  </p>
                  <Button 
                    onClick={() => navigate('/school')}
                    className="w-full bg-white text-[#1E3A5F] hover:bg-slate-100"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Book a Meeting
                  </Button>
                </div>

                {/* Quick Info */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h3 className="font-bold text-[#1E3A5F] mb-4">Quick Info</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Duration</div>
                        <div className="font-medium text-slate-900">{offering.duration}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Users className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Support Level</div>
                        <div className="font-medium text-slate-900">{offering.support}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Target className="w-5 h-5 text-slate-600" />
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">Pricing</div>
                        <div className="font-medium text-slate-900">{offering.pricing}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-slate-100 rounded-2xl p-6">
                  <h3 className="font-bold text-[#1E3A5F] mb-2">Have Questions?</h3>
                  <p className="text-slate-600 text-sm mb-4">
                    Our team is here to help you choose the right program.
                  </p>
                  <Button variant="outline" className="w-full">
                    <Phone className="w-4 h-4 mr-2" />
                    Contact Us
                  </Button>
                </div>
              </div>
            </div>
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

export default SchoolOfferingDetailPage;
