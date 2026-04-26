import { Link } from 'react-router-dom';
import { useState } from 'react';
import { 
import { ASSETS } from '../config/assets';
  Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube,
  ChevronDown, ChevronUp, Cpu, Code, Brain, TrendingUp, GraduationCap,
  FileText, Shield, RefreshCcw, HelpCircle, Building2
} from 'lucide-react';

// All Student Offerings
const STUDENT_OFFERINGS = [
  { name: 'Robotics', path: '/courses/robotics', description: 'Build & program robots' },
  { name: 'Coding & Programming', path: '/courses/coding', description: 'Learn to code from scratch' },
  { name: 'AI & Machine Learning', path: '/courses/ai', description: 'Future-ready AI skills' },
  { name: 'Entrepreneurship', path: '/courses/entrepreneurship', description: 'Business mindset development' },
  { name: 'Financial Literacy', path: '/courses/financial-literacy', description: 'Money management skills' },
];

// All School Offerings by Category
const SCHOOL_OFFERINGS = {
  robotics: {
    title: 'Robotics for Schools',
    icon: Cpu,
    items: [
      { name: 'Robotics Curriculum with Take-home Kits', path: '/school-offerings/robotics/robotics-curriculum-kits' },
      { name: 'Robotics Lab Setup', path: '/school-offerings/robotics/robotics-lab-setup' },
      { name: 'Robotics Exhibition Preparation', path: '/school-offerings/robotics/robotics-exhibition-prep' },
      { name: 'Host Robotics Exhibition', path: '/school-offerings/robotics/host-robotics-exhibition' },
      { name: 'IIT Bombay Competition Training', path: '/school-offerings/robotics/iit-bombay-competitions' },
      { name: 'Robotics Competition Prep', path: '/school-offerings/robotics/robotics-competition-prep' },
      { name: 'ICSE Group 3 Subject Kits', path: '/school-offerings/robotics/icse-group3-kits' },
      { name: 'Afterschool Robotics Classes', path: '/school-offerings/robotics/afterschool-robotics' },
      { name: 'Robotics Summer Camp', path: '/school-offerings/robotics/robotics-summer-camp' },
      { name: 'Robotics & AI Seminar', path: '/school-offerings/robotics/robotics-ai-seminar' },
      { name: 'Robotics Books', path: '/school-offerings/robotics/robotics-books' },
      { name: 'Robotics Kits', path: '/school-offerings/robotics/robotics-kits' },
    ]
  },
  coding: {
    title: 'Coding for Schools',
    icon: Code,
    items: [
      { name: 'Vibe Coding Seminar', path: '/school-offerings/coding/vibe-coding-seminar' },
      { name: 'Afterschool Coding Classes', path: '/school-offerings/coding/coding-afterschool' },
      { name: 'Coding Summer Camp', path: '/school-offerings/coding/coding-summer-camp' },
    ]
  },
  ai: {
    title: 'AI for Schools',
    icon: Brain,
    items: [
      { name: 'AI Center for Excellence', path: '/school-offerings/ai/ai-center-excellence' },
      { name: 'Agentic AI Workshop', path: '/school-offerings/ai/agentic-ai-workshop' },
      { name: 'AI Seminar', path: '/school-offerings/ai/ai-seminar' },
      { name: 'AI Summer Camp', path: '/school-offerings/ai/agentic-ai-summer-camp' },
      { name: 'AI Services Agency Course', path: '/school-offerings/ai/ai-services-agency-course' },
    ]
  },
  entrepreneurship: {
    title: 'Entrepreneurship for Schools',
    icon: TrendingUp,
    items: [
      { name: 'Entrepreneurship Workshop', path: '/school-offerings/financial-literacy/entrepreneurship-workshop' },
      { name: 'Skill Titans TV Show & Olympiad', path: '/school-offerings/financial-literacy/skill-titans-olympiad' },
      { name: 'Financial Literacy Curriculum', path: '/school-offerings/financial-literacy/fl-curriculum' },
      { name: 'E-Cell Setup', path: '/school-offerings/financial-literacy/ecell-opening' },
      { name: 'Entrepreneurship Summer Camp', path: '/school-offerings/financial-literacy/fl-summer-camp' },
    ]
  }
};

const Footer = ({ variant = 'full' }) => {
  const currentYear = new Date().getFullYear();
  const [showAllOfferings, setShowAllOfferings] = useState(false);

  // Compact footer for funnel pages
  if (variant === 'compact') {
    return (
      <footer className="bg-[#1E3A5F] text-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            © {currentYear} OLL - Clonefutura Live Solutions. All rights reserved.
          </p>
          <div className="flex justify-center gap-4 mt-2 text-xs text-white/50">
            <Link to="/terms" className="hover:text-white">Terms</Link>
            <Link to="/privacy" className="hover:text-white">Privacy</Link>
            <Link to="/refund-policy" className="hover:text-white">Refund Policy</Link>
          </div>
        </div>
      </footer>
    );
  }

  // Full footer for main pages
  return (
    <footer className="bg-slate-900 text-white" itemScope itemType="https://schema.org/Organization">
      {/* View All Offerings Section - Expandable */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button 
            onClick={() => setShowAllOfferings(!showAllOfferings)}
            className="w-full py-4 flex items-center justify-between text-left hover:text-[#D63031] transition-colors"
            aria-expanded={showAllOfferings}
          >
            <span className="font-semibold text-lg">View All Offerings</span>
            {showAllOfferings ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          
          {showAllOfferings && (
            <div className="pb-8 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Student Offerings */}
              <div>
                <h4 className="font-semibold text-[#D63031] mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  For Learners
                </h4>
                <ul className="space-y-2">
                  {STUDENT_OFFERINGS.map((offering) => (
                    <li key={offering.path}>
                      <Link 
                        to={offering.path} 
                        className="text-slate-400 hover:text-white text-sm transition-colors block py-1"
                      >
                        {offering.name}
                        <span className="text-slate-500 text-xs ml-2">- {offering.description}</span>
                      </Link>
                    </li>
                  ))}
                  <li>
                    <Link to="/student" className="text-[#D63031] hover:text-white text-sm font-medium transition-colors">
                      Book a Free Demo →
                    </Link>
                  </li>
                </ul>
              </div>

              {/* School Offerings - Robotics & Coding */}
              <div>
                <h4 className="font-semibold text-[#D63031] mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  For Schools - Robotics & Coding
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Cpu className="w-3 h-3" /> Robotics
                    </h5>
                    <ul className="space-y-1">
                      {SCHOOL_OFFERINGS.robotics.items.slice(0, 6).map((item) => (
                        <li key={item.path}>
                          <Link to={item.path} className="text-slate-400 hover:text-white text-xs transition-colors block py-0.5">
                            {item.name}
                          </Link>
                        </li>
                      ))}
                      <li>
                        <Link to="/school-offerings" className="text-[#D63031] text-xs hover:text-white">
                          +{SCHOOL_OFFERINGS.robotics.items.length - 6} more...
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Code className="w-3 h-3" /> Coding
                    </h5>
                    <ul className="space-y-1">
                      {SCHOOL_OFFERINGS.coding.items.map((item) => (
                        <li key={item.path}>
                          <Link to={item.path} className="text-slate-400 hover:text-white text-xs transition-colors block py-0.5">
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* School Offerings - AI & Entrepreneurship */}
              <div>
                <h4 className="font-semibold text-[#D63031] mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  For Schools - AI & Business
                </h4>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Brain className="w-3 h-3" /> AI & Machine Learning
                    </h5>
                    <ul className="space-y-1">
                      {SCHOOL_OFFERINGS.ai.items.map((item) => (
                        <li key={item.path}>
                          <Link to={item.path} className="text-slate-400 hover:text-white text-xs transition-colors block py-0.5">
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h5 className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Entrepreneurship
                    </h5>
                    <ul className="space-y-1">
                      {SCHOOL_OFFERINGS.entrepreneurship.items.map((item) => (
                        <li key={item.path}>
                          <Link to={item.path} className="text-slate-400 hover:text-white text-xs transition-colors block py-0.5">
                            {item.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                <Link to="/school" className="inline-block mt-4 text-[#D63031] hover:text-white text-sm font-medium transition-colors">
                  Book a School Meeting →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand & Description */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4" itemProp="url">
              <img 
                src={ASSETS.OLL_LOGO_WHITE}
                alt="OLL Logo - Open Learning Labs"
                title="OLL - Skill Education Platform"
                loading="lazy"
                width="120"
                height="40"
                className="h-10 w-auto"
              />
            </Link>
            <p className="text-slate-400 text-sm mb-4" itemProp="description">
              India&apos;s leading skill education platform. Empowering students with Robotics, Coding, AI, and Entrepreneurship skills since 2020.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a href="https://www.facebook.com/ollcompany" target="_blank" rel="noopener noreferrer" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Facebook" itemProp="sameAs">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://www.instagram.com/oll.co_/" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Instagram" itemProp="sameAs">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://www.linkedin.com/company/ollcompany/" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="LinkedIn" itemProp="sameAs">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://www.youtube.com/channel/UCwQyfX_lsVCLBUV5Or-rZ8g" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="YouTube" itemProp="sameAs">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://x.com/Onlinelivelearn" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Twitter/X" itemProp="sameAs">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* For Students */}
          <div>
            <h4 className="font-semibold mb-4 text-white">For Learners</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/offerings" className="hover:text-white transition-colors">All Courses</Link></li>
              <li><Link to="/courses/robotics" className="hover:text-white transition-colors">Robotics</Link></li>
              <li><Link to="/courses/coding" className="hover:text-white transition-colors">Coding</Link></li>
              <li><Link to="/courses/ai" className="hover:text-white transition-colors">AI & ML</Link></li>
              <li><Link to="/student" className="hover:text-white transition-colors text-[#D63031]">Book Demo</Link></li>
            </ul>
          </div>

          {/* For Schools */}
          <div>
            <h4 className="font-semibold mb-4 text-white">For Schools</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/school-offerings" className="hover:text-white transition-colors">All Programs</Link></li>
              <li><Link to="/school-offerings/robotics/robotics-lab-setup" className="hover:text-white transition-colors">Lab Setup</Link></li>
              <li><Link to="/school-offerings/ai/ai-center-excellence" className="hover:text-white transition-colors">AI Center</Link></li>
              <li><Link to="/school-offerings/financial-literacy/skill-titans-olympiad" className="hover:text-white transition-colors">Skill Titans</Link></li>
              <li><Link to="/school" className="hover:text-white transition-colors text-[#D63031]">Book Meeting</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/join-team" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/educator" className="hover:text-white transition-colors">Become Educator</Link></li>
              <li><Link to="/growth-partner" className="hover:text-white transition-colors">Partner With Us</Link></li>
              <li><Link to="/blogs" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Support & Contact */}
          <div itemProp="contactPoint" itemScope itemType="https://schema.org/ContactPoint">
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/centers" className="hover:text-white transition-colors">Learning Centers</Link></li>
              <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
              <li>
                <a href="mailto:info@oll.co" className="hover:text-white transition-colors flex items-center gap-1" itemProp="email">
                  <Mail className="w-3 h-3" /> info@oll.co
                </a>
              </li>
              <li>
                <a href="tel:+919920188188" className="hover:text-white transition-colors flex items-center gap-1" itemProp="telephone">
                  <Phone className="w-3 h-3" /> +91 9920188188
                </a>
              </li>
              <li className="pt-2">
                <span className="text-slate-500 text-xs flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> Mumbai, India
                </span>
              </li>
            </ul>
            <meta itemProp="contactType" content="customer service" />
          </div>
        </div>
      </div>

      {/* Summer Camp Links */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[#D63031] font-semibold text-sm uppercase tracking-wider">Summer Camp 2026</span>
            <Link to="/summer-camp" className="text-slate-400 hover:text-white text-xs transition-colors">View all →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* By Location */}
            <div>
              <h5 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">By Location</h5>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li><Link to="/summer-camp/location/andheri-west" className="hover:text-white transition-colors">Andheri West, Mumbai</Link></li>
                <li><Link to="/summer-camp/location/mira-road" className="hover:text-white transition-colors">Mira Road, Mumbai</Link></li>
                <li><Link to="/summer-camp/location/dombivli" className="hover:text-white transition-colors">Dombivli, Mumbai</Link></li>
                <li><Link to="/summer-camp/location/dahisar" className="hover:text-white transition-colors">Dahisar, Mumbai</Link></li>
                <li><Link to="/summer-camp/location/online" className="hover:text-white transition-colors">Online – All India</Link></li>
              </ul>
            </div>
            {/* By Skill */}
            <div>
              <h5 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">By Skill</h5>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li><Link to="/summer-camp/skill/robotics" className="hover:text-white transition-colors">Robotics Summer Camp</Link></li>
                <li><Link to="/summer-camp/skill/coding" className="hover:text-white transition-colors">Coding & Python Camp</Link></li>
                <li><Link to="/summer-camp/skill/ai" className="hover:text-white transition-colors">AI & Machine Learning Camp</Link></li>
                <li><Link to="/summer-camp/skill/3d-design" className="hover:text-white transition-colors">3D Design & Printing Camp</Link></li>
                <li><Link to="/summer-camp/skill/financial-literacy" className="hover:text-white transition-colors">Financial Literacy Camp</Link></li>
              </ul>
            </div>
            {/* By Age */}
            <div>
              <h5 className="text-white/60 text-xs font-semibold uppercase tracking-widest mb-3">By Age Group</h5>
              <ul className="space-y-1.5 text-sm text-slate-400">
                <li><Link to="/summer-camp/age/4-6" className="hover:text-white transition-colors">Ages 4–6 (Little Explorers)</Link></li>
                <li><Link to="/summer-camp/age/6-8" className="hover:text-white transition-colors">Ages 6–8</Link></li>
                <li><Link to="/summer-camp/age/8-10" className="hover:text-white transition-colors">Ages 8–10</Link></li>
                <li><Link to="/summer-camp/age/10-12" className="hover:text-white transition-colors">Ages 10–12 (Tech Creators)</Link></li>
                <li><Link to="/summer-camp/age/12-14" className="hover:text-white transition-colors">Ages 12–14</Link></li>
                <li><Link to="/summer-camp/age/14-16" className="hover:text-white transition-colors">Ages 14–16 (Future Innovators)</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {currentYear} Clonefutura Live Solutions Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
              <Link to="/terms" className="hover:text-white transition-colors flex items-center gap-1">
                <FileText className="w-3 h-3" /> Terms
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
                <Shield className="w-3 h-3" /> Privacy
              </Link>
              <Link to="/refund-policy" className="hover:text-white transition-colors flex items-center gap-1">
                <RefreshCcw className="w-3 h-3" /> Refund Policy
              </Link>
              <Link to="/faqs" className="hover:text-white transition-colors flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> FAQs
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
