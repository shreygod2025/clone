import { useNavigate, Link } from 'react-router-dom';
import { GraduationCap, Users, Building2, ArrowRight, Menu, X } from 'lucide-react';
import { useState } from 'react';

const LandingPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userTypes = [
    {
      id: 'student',
      title: 'Student / Parent',
      subtitle: 'Learn Future-Ready Skills',
      description: 'Explore Robotics, Coding, AI, and more with personalized learning paths',
      icon: GraduationCap,
      image: 'https://images.unsplash.com/photo-1561346745-5db62ae43861?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3MjQyMTd8MHwxfHNlYXJjaHwxfHxoYXBweSUyMHN0dWRlbnQlMjBzdHVkeWluZyUyMGxhcHRvcHxlbnwwfHx8fDE3Njc4OTY2NTF8MA&ixlib=rb-4.1.0&q=85',
      path: '/student',
      color: 'from-blue-900/90'
    },
    {
      id: 'educator',
      title: 'Educator',
      subtitle: 'Join Our Teaching Network',
      description: 'Share your expertise and grow with OLL\'s expanding education ecosystem',
      icon: Users,
      image: 'https://images.pexels.com/photos/1181534/pexels-photo-1181534.jpeg',
      path: '/educator',
      color: 'from-slate-900/90'
    },
    {
      id: 'school',
      title: 'School',
      subtitle: 'Transform Your Institution',
      description: 'Bring future skills to your school with complete support and infrastructure',
      icon: Building2,
      image: 'https://images.pexels.com/photos/159213/hall-congress-architecture-building-159213.jpeg',
      path: '/school',
      color: 'from-indigo-900/90'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-10"
              />
            </Link>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">About</Link>
              <Link to="/blogs" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Blog</Link>
              <Link to="/faq" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">FAQ</Link>
              <Link to="/admin/login" className="btn-navy text-sm py-2 px-6" data-testid="admin-login-btn">
                Admin Login
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-3 animate-slide-up">
            <Link to="/about" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">About</Link>
            <Link to="/blogs" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">Blog</Link>
            <Link to="/faq" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">FAQ</Link>
            <Link to="/admin/login" className="block py-2 text-[#D63031] font-medium">Admin Login</Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-20">
        {/* Tagline */}
        <div className="text-center py-8 md:py-12 px-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Leading a Skill Learning Revolution
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto">
            Choose your path and start your journey with OLL
          </p>
        </div>

        {/* User Type Cards - Full Height on Desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 md:h-[calc(100vh-200px)] min-h-[600px]">
          {userTypes.map((type) => (
            <div
              key={type.id}
              className="funnel-card h-[300px] md:h-full"
              onClick={() => navigate(type.path)}
              data-testid={`${type.id}-card`}
            >
              {/* Background Image */}
              <img 
                src={type.image} 
                alt={type.title}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t ${type.color} via-transparent to-transparent z-10`} />
              
              {/* Content */}
              <div className="absolute inset-0 z-20 flex flex-col justify-end p-6 md:p-8">
                <div className="transform transition-transform duration-500 group-hover:translate-y-[-10px]">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-4">
                    <type.icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-white/80 text-sm font-medium mb-1">{type.subtitle}</p>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                    {type.title}
                  </h2>
                  <p className="text-white/70 text-sm md:text-base mb-4 max-w-xs">
                    {type.description}
                  </p>
                  <button className="inline-flex items-center gap-2 text-white font-semibold group/btn">
                    Get Started
                    <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Trusted by Leading Institutions
            </h2>
            <p className="text-slate-600">Empowering students across India with future-ready skills</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center justify-items-center opacity-60">
            <div className="glass-card p-4 rounded-xl">
              <p className="font-semibold text-[#1E3A5F]">Shark Tank India</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="font-semibold text-[#1E3A5F]">KBC Featured</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="font-semibold text-[#1E3A5F]">500+ Schools</p>
            </div>
            <div className="glass-card p-4 rounded-xl">
              <p className="font-semibold text-[#1E3A5F]">50,000+ Students</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
                alt="OLL" 
                className="h-10 mb-4"
              />
              <p className="text-white/70 text-sm">
                Leading a Skill Learning Revolution for students across India.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Programs</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>Robotics</li>
                <li>Coding</li>
                <li>AI & ML</li>
                <li>Entrepreneurship</li>
                <li>Financial Literacy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link to="/blogs" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>contact@oll.co</li>
                <li>+91 98765 43210</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-white/50 text-sm">
            © 2024 OLL. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
