import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowLeft, CheckCircle, Phone, Calendar, Users, Clock, 
  Award, Target, BookOpen, Play, Download, Menu, X,
  Cpu, Code, Brain, Lightbulb, TrendingUp, GraduationCap, School
} from 'lucide-react';
import { Button } from '../components/ui/button';

// All offerings data
const ALL_OFFERINGS = {
  // Robotics
  'robotics-curriculum-kits': {
    category: 'robotics',
    title: 'Robotics Curriculum with Take-home Kits & Books',
    description: 'Complete robotics curriculum with kits that students can take home for practice.',
    features: ['Age-appropriate kits for each grade', 'Comprehensive workbooks', 'Video tutorials', 'Parent involvement activities', 'Progress tracking'],
    ideal: 'Schools wanting hands-on learning without lab setup',
    duration: '1 Academic Year'
  },
  'robotics-lab-setup': {
    category: 'robotics',
    title: 'Robotics Curriculum with Lab Setup & Books',
    description: 'Full lab infrastructure with equipment, curriculum, and trained educators.',
    features: ['Complete lab equipment', 'Multiple workstations', 'Advanced robotics kits', 'Trained educators', 'Maintenance support'],
    ideal: 'Schools ready to invest in infrastructure',
    duration: '1 Academic Year'
  },
  'robotics-exhibition-prep': {
    category: 'robotics',
    title: 'Robotics Exhibition Preparation',
    description: 'Prepare students for robotics exhibitions and science fairs.',
    features: ['Project ideation workshops', 'Building & programming sessions', 'Presentation training', 'Judging criteria preparation', 'Mock exhibitions'],
    ideal: 'Schools participating in exhibitions',
    duration: '2-3 Months'
  },
  'host-robotics-exhibition': {
    category: 'robotics',
    title: 'Host a Robotics Exhibition in Your School',
    description: 'Turn your school into a robotics showcase venue.',
    features: ['Event planning & coordination', 'Equipment & setup', 'Judging panel', 'Certificates & prizes', 'Media coverage support'],
    ideal: 'Schools wanting to host events',
    duration: '1-2 Days Event'
  },
  'iit-bombay-competitions': {
    category: 'robotics',
    title: 'Participate in Robotics Competitions at IIT Bombay',
    description: 'Train students for national-level robotics competitions.',
    features: ['Competition-specific training', 'Practice sessions', 'Travel coordination', 'Team mentorship', 'Post-competition analysis'],
    ideal: 'Advanced students ready for competition',
    duration: '3-4 Months'
  },
  'robotics-competition-prep': {
    category: 'robotics',
    title: 'Preparation for Robotics Competitions',
    description: 'General preparation for various robotics competitions.',
    features: ['Competition landscape overview', 'Skill building workshops', 'Mock competitions', 'Team formation', 'Strategy sessions'],
    ideal: 'Schools wanting competition exposure',
    duration: '2-3 Months'
  },
  'icse-group3-kits': {
    category: 'robotics',
    title: 'Grade 9 & 10 ICSE Group 3 Subject Kits',
    description: 'Specialized kits for ICSE curriculum Group 3 subjects.',
    features: ['Curriculum-aligned content', 'Practical experiments', 'Theory integration', 'Exam preparation', 'Board-approved materials'],
    ideal: 'ICSE schools',
    duration: '2 Academic Years'
  },
  'afterschool-robotics': {
    category: 'robotics',
    title: 'Afterschool Robotics Classes',
    description: 'Regular robotics classes after school hours.',
    features: ['Flexible timings', 'Small batch sizes', 'Progressive curriculum', 'Regular assessments', 'Parent updates'],
    ideal: 'Schools wanting extra-curricular programs',
    duration: 'Ongoing'
  },
  'robotics-summer-camp': {
    category: 'robotics',
    title: 'Robotics Summer Camp',
    description: 'Intensive summer program for robotics enthusiasts.',
    features: ['Daily sessions', 'Project-based learning', 'Fun activities', 'Final showcase', 'Certificate of completion'],
    ideal: 'Summer vacation engagement',
    duration: '2-4 Weeks'
  },
  'robotics-ai-seminar': {
    category: 'robotics',
    title: 'Robotics & AI Seminar for Students',
    description: 'One-day awareness seminar on robotics and AI.',
    features: ['Interactive demos', 'Hands-on activities', 'Career guidance', 'Q&A sessions', 'Take-home materials'],
    ideal: 'Introductory exposure',
    duration: '1 Day'
  },
  'robotics-books': {
    category: 'robotics',
    title: 'Robotics Books',
    description: 'Comprehensive robotics textbooks and workbooks.',
    features: ['Grade-wise content', 'Illustrated guides', 'Activity sheets', 'Assessment tools', 'Digital resources'],
    ideal: 'Self-paced learning',
    duration: 'N/A'
  },
  'robotics-kits': {
    category: 'robotics',
    title: 'Robotics Kits',
    description: 'Quality robotics kits for hands-on learning.',
    features: ['Multiple skill levels', 'Reusable components', 'Instruction manuals', 'Online support', 'Replacement parts available'],
    ideal: 'Practical learning',
    duration: 'N/A'
  },

  // Financial Literacy & Entrepreneurship
  'entrepreneurship-workshop': {
    category: 'financial-literacy',
    title: 'Entrepreneurship 3 Day Workshop',
    description: 'Intensive workshop to ignite entrepreneurial thinking.',
    features: ['Idea generation', 'Business model basics', 'Pitch training', 'Mentor sessions', 'Mini pitch competition'],
    ideal: 'Quick exposure to entrepreneurship',
    duration: '3 Days'
  },
  'skill-titans-olympiad': {
    category: 'financial-literacy',
    title: 'Skill Titans TV Show & Entrepreneurship Olympiad',
    description: 'Participate in India\'s first student entrepreneur TV show.',
    features: ['School-level selection', 'Regional rounds', 'TV appearance opportunity', 'Investor pitching', 'Prizes & recognition'],
    ideal: 'Aspiring young entrepreneurs',
    duration: '3-4 Months'
  },
  'fl-curriculum': {
    category: 'financial-literacy',
    title: 'Financial Literacy & Entrepreneurship Program',
    description: 'Comprehensive program integrated into school curriculum.',
    features: ['Weekly classes', 'Interactive simulations', 'Real-world projects', 'Assessments', 'Certification'],
    ideal: 'Long-term skill development',
    duration: '1 Academic Year'
  },
  'ecell-opening': {
    category: 'financial-literacy',
    title: 'E-Cell Opening in School',
    description: 'Establish an Entrepreneurship Cell in your school.',
    features: ['Setup support', 'Student council formation', 'Event calendar', 'Mentorship network', 'Inter-school connections'],
    ideal: 'Schools building entrepreneur culture',
    duration: 'Ongoing'
  },
  'fl-summer-camp': {
    category: 'financial-literacy',
    title: 'Financial Literacy & Entrepreneurship Summer Camp',
    description: 'Summer program combining money skills and business thinking.',
    features: ['Fun learning activities', 'Stock market games', 'Business plan creation', 'Market day event', 'Certificates'],
    ideal: 'Summer vacation engagement',
    duration: '2-3 Weeks'
  },

  // AI
  'ai-center-excellence': {
    category: 'ai',
    title: 'Launch an AI Center for Excellence',
    description: 'Establish a dedicated AI learning hub in your school.',
    features: ['Infrastructure setup', 'Hardware & software', 'Curriculum design', 'Trainer deployment', 'Industry partnerships'],
    ideal: 'Schools investing in future tech',
    duration: '1 Academic Year'
  },
  'agentic-ai-workshop': {
    category: 'ai',
    title: 'Agentic AI Workshop for Students',
    description: 'Hands-on workshop on building AI agents.',
    features: ['AI fundamentals', 'Agent building basics', 'Practical projects', 'Tool training', 'Take-home resources'],
    ideal: 'Tech-enthusiast students',
    duration: '2-3 Days'
  },
  'ai-seminar': {
    category: 'ai',
    title: 'AI Seminar',
    description: 'Awareness seminar on AI and its applications.',
    features: ['AI overview', 'Live demos', 'Career opportunities', 'Q&A', 'Resource kit'],
    ideal: 'Introductory exposure',
    duration: '1 Day'
  },
  'agentic-ai-summer-camp': {
    category: 'ai',
    title: 'Agentic AI Summer Camp',
    description: 'Intensive summer program on AI and automation.',
    features: ['Daily sessions', 'Project building', 'AI tools training', 'Final showcase', 'Certification'],
    ideal: 'Summer vacation engagement',
    duration: '2-4 Weeks'
  },
  'ai-services-agency-course': {
    category: 'ai',
    title: 'Start AI Services Agency Course',
    description: 'Learn to build and run an AI services business.',
    features: ['Business model training', 'AI tools mastery', 'Client management', 'Portfolio building', 'Mentorship'],
    ideal: 'College students',
    duration: '2-3 Months'
  },

  // Coding
  'vibe-coding-seminar': {
    category: 'coding',
    title: 'Vibe Coding Seminar',
    description: 'Fun and engaging coding awareness session.',
    features: ['Interactive demos', 'Simple coding activities', 'Career insights', 'Q&A', 'Follow-up resources'],
    ideal: 'Introductory exposure',
    duration: '1 Day'
  },
  'coding-afterschool': {
    category: 'coding',
    title: 'Coding & Logic Building After School Classes',
    description: 'Regular coding classes after school hours.',
    features: ['Progressive curriculum', 'Small batches', 'Project-based', 'Regular assessments', 'Parent updates'],
    ideal: 'Extra-curricular coding',
    duration: 'Ongoing'
  },
  'coding-summer-camp': {
    category: 'coding',
    title: 'Coding Summer Camp',
    description: 'Summer program for aspiring coders.',
    features: ['Scratch to Python', 'Game development', 'Web basics', 'Final project', 'Certification'],
    ideal: 'Summer vacation engagement',
    duration: '2-4 Weeks'
  },
};

const CATEGORY_INFO = {
  'robotics': { icon: Cpu, color: '#D63031', gradient: 'from-red-500 to-orange-500', title: 'Robotics' },
  'financial-literacy': { icon: TrendingUp, color: '#10B981', gradient: 'from-green-500 to-teal-500', title: 'Financial Literacy & Entrepreneurship' },
  'ai': { icon: Brain, color: '#8B5CF6', gradient: 'from-purple-600 to-pink-500', title: 'AI & Machine Learning' },
  'coding': { icon: Code, color: '#1E3A5F', gradient: 'from-blue-600 to-cyan-500', title: 'Coding & Programming' },
};

const SchoolOfferingDetailPage = () => {
  const navigate = useNavigate();
  const { categoryId, offeringId } = useParams();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const offering = ALL_OFFERINGS[offeringId];
  const category = CATEGORY_INFO[categoryId];
  
  if (!offering || !category) {
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

  const IconComponent = category.icon;

  // Generate rich SEO keywords based on category and offering
  const seoKeywords = `${offering.title}, ${category.title} for schools, school ${category.title.toLowerCase()} program, ${category.title.toLowerCase()} curriculum India, OLL ${category.title.toLowerCase()}, school skill education`;

  return (
    <>
      <Helmet>
        <title>{offering.title} for Schools | OLL - India's #1 Skill Education</title>
        <meta name="description" content={`${offering.description} Best ${category.title.toLowerCase()} program for schools in India. Duration: ${offering.duration}. Ideal for: ${offering.ideal}. Book a demo today!`} />
        <meta name="keywords" content={seoKeywords} />
        <link rel="canonical" href={`https://oll.co/school-offerings/${categoryId}/${offeringId}`} />
        
        {/* Open Graph */}
        <meta property="og:title" content={`${offering.title} | OLL School Programs`} />
        <meta property="og:description" content={offering.description} />
        <meta property="og:type" content="product" />
        <meta property="og:url" content={`https://oll.co/school-offerings/${categoryId}/${offeringId}`} />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${offering.title} | OLL`} />
        <meta name="twitter:description" content={offering.description} />
        
        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": offering.title,
            "description": offering.description,
            "provider": {
              "@type": "Organization",
              "name": "OLL - Open Learning Labs",
              "sameAs": "https://oll.co"
            },
            "educationalLevel": "K-12",
            "isAccessibleForFree": false,
            "offers": {
              "@type": "Offer",
              "category": "Educational Program"
            }
          })}
        </script>
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
                <Button 
                  onClick={() => navigate('/school')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                >
                  <Phone className="w-4 h-4 mr-2" />
                  Book a Meeting
                </Button>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className={`bg-gradient-to-br ${category.gradient} py-16`}>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/school-offerings')}
              className="text-white/80 hover:text-white hover:bg-white/10 mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Programs
            </Button>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm mb-4">
                  <IconComponent className="w-4 h-4" />
                  {category.title}
                </div>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
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
                    <Target className="w-5 h-5 text-white" />
                    <div>
                      <div className="text-white/60 text-sm">Ideal For</div>
                      <div className="text-white font-medium">{offering.ideal}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Content */}
        <section className="py-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Features */}
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm mb-8">
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-6">What's Included</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {offering.features.map((feature, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] rounded-2xl p-8 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Interested in this program?</h3>
              <p className="text-white/80 mb-6">
                Schedule a call with our team to discuss implementation for your school.
              </p>
              <Button 
                size="lg"
                onClick={() => navigate('/school')}
                className="bg-white text-[#1E3A5F] hover:bg-slate-100"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book a Meeting
              </Button>
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
