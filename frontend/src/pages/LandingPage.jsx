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
      description: 'Robotics, Coding, AI & more',
      icon: GraduationCap,
      path: '/student',
      gradient: 'from-[#1E3A5F] to-[#2C5282]'
    },
    {
      id: 'educator',
      title: 'Educator',
      subtitle: 'Join Our Network',
      description: 'Teach & grow with OLL',
      icon: Users,
      path: '/educator',
      gradient: 'from-[#D63031] to-[#e84142]'
    },
    {
      id: 'school',
      title: 'School',
      subtitle: 'Partner With Us',
      description: 'Complete skill programs',
      icon: Building2,
      path: '/school',
      gradient: 'from-[#1E3A5F] to-[#D63031]'
    }
  ];

  return (
    <div className="h-screen bg-slate-50 overflow-hidden flex flex-col">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 shrink-0">
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
          </div>
        )}
      </nav>

      {/* Main Content - Full Height */}
      <main className="flex-1 flex flex-col">
        {/* Tagline */}
        <div className="text-center py-6 md:py-8 px-4 shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Leading a Skill Learning Revolution
          </h1>
          <p className="text-base md:text-lg text-slate-500 mt-2">
            Choose your path
          </p>
        </div>

        {/* User Type Cards */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 px-4 md:px-8 pb-6 md:pb-8">
          {userTypes.map((type) => (
            <div
              key={type.id}
              onClick={() => navigate(type.path)}
              className={`relative rounded-3xl bg-gradient-to-br ${type.gradient} p-6 md:p-8 flex flex-col justify-between cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-xl hover:shadow-2xl min-h-[180px] md:min-h-0`}
              data-testid={`${type.id}-card`}
            >
              {/* Icon */}
              <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <type.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
              
              {/* Content */}
              <div className="mt-auto">
                <p className="text-white/70 text-sm font-medium">{type.subtitle}</p>
                <h2 className="text-2xl md:text-3xl font-bold text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {type.title}
                </h2>
                <p className="text-white/60 text-sm mt-2">{type.description}</p>
                <div className="flex items-center gap-2 text-white font-medium mt-4 group">
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
