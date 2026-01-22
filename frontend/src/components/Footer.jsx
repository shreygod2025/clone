import { Link } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin, Youtube,
  GraduationCap, Building2, Users, BookOpen, FileText, Shield, RefreshCcw, HelpCircle
} from 'lucide-react';

const Footer = ({ variant = 'full' }) => {
  const currentYear = new Date().getFullYear();

  // Compact footer for funnel pages
  if (variant === 'compact') {
    return (
      <footer className="bg-[#1E3A5F] text-white py-6 mt-auto">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p className="text-white/60 text-sm">
            © {currentYear} OLL - Open Learning Labs. All rights reserved.
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
    <footer className="bg-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
          {/* Brand & Description */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-[#D63031] to-[#e84142] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">O</span>
              </div>
              <span className="text-xl font-bold">OLL</span>
            </Link>
            <p className="text-slate-400 text-sm mb-4">
              India's leading skill education platform. Empowering students with Robotics, Coding, AI, and Entrepreneurship skills since 2020.
            </p>
            {/* Social Links */}
            <div className="flex gap-3">
              <a href="https://facebook.com/ollrobotics" target="_blank" rel="noopener noreferrer" 
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://instagram.com/ollrobotics" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com/company/ollrobotics" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://youtube.com/@ollrobotics" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
              <a href="https://twitter.com/ollrobotics" target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-[#D63031] transition-colors"
                aria-label="Twitter">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Programs */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Programs</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/courses/robotics" className="hover:text-white transition-colors">Robotics</Link></li>
              <li><Link to="/courses/coding" className="hover:text-white transition-colors">Coding & Programming</Link></li>
              <li><Link to="/courses/ai" className="hover:text-white transition-colors">AI & Machine Learning</Link></li>
              <li><Link to="/courses/entrepreneurship" className="hover:text-white transition-colors">Entrepreneurship</Link></li>
              <li><Link to="/courses/financial-literacy" className="hover:text-white transition-colors">Financial Literacy</Link></li>
            </ul>
          </div>

          {/* For Schools */}
          <div>
            <h4 className="font-semibold mb-4 text-white">For Schools</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/school-offerings" className="hover:text-white transition-colors">School Programs</Link></li>
              <li><Link to="/school-offerings/robotics/robotics-curriculum-kits" className="hover:text-white transition-colors">Robotics Curriculum</Link></li>
              <li><Link to="/school-offerings/ai/ai-center-excellence" className="hover:text-white transition-colors">AI Center Setup</Link></li>
              <li><Link to="/school-offerings/financial-literacy/skill-titans-olympiad" className="hover:text-white transition-colors">Skill Titans</Link></li>
              <li><Link to="/school" className="hover:text-white transition-colors">Book a Meeting</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/join-team" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/educator" className="hover:text-white transition-colors">Become an Educator</Link></li>
              <li><Link to="/growth-partner" className="hover:text-white transition-colors">Partner With Us</Link></li>
              <li><Link to="/blogs" className="hover:text-white transition-colors">Blog</Link></li>
            </ul>
          </div>

          {/* Support & Legal */}
          <div>
            <h4 className="font-semibold mb-4 text-white">Support</h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li><Link to="/support" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/faqs" className="hover:text-white transition-colors">FAQs</Link></li>
              <li><Link to="/centers" className="hover:text-white transition-colors">Learning Centers</Link></li>
              <li>
                <a href="mailto:support@oll.co" className="hover:text-white transition-colors flex items-center gap-1">
                  <Mail className="w-3 h-3" /> support@oll.co
                </a>
              </li>
              <li>
                <a href="tel:+919876543210" className="hover:text-white transition-colors flex items-center gap-1">
                  <Phone className="w-3 h-3" /> +91 98765 43210
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-500 text-sm">
              © {currentYear} OLL - Open Learning Labs Pvt. Ltd. All rights reserved.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-400">
              <Link to="/terms" className="hover:text-white transition-colors flex items-center gap-1">
                <FileText className="w-3 h-3" /> Terms & Conditions
              </Link>
              <Link to="/privacy" className="hover:text-white transition-colors flex items-center gap-1">
                <Shield className="w-3 h-3" /> Privacy Policy
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
