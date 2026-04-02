import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogIn, GraduationCap, Users, Handshake } from 'lucide-react';
import { Button } from './ui/button';
import { useUserAuth } from '../context/UserAuthContext';

const Navbar = ({ showBookDemo = false, onBookDemo, variant = 'default' }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, logout } = useUserAuth();

  // Check if user is an educator
  const isEducator = user?.role === 'educator';
  
  // For About page, show different action buttons
  const isAboutVariant = variant === 'about';

  // Summer Camp variant — dark glass navbar, only Book Now
  if (variant === 'camp') {
    return (
      <nav style={{
        background: 'rgba(2,8,22,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,229,255,0.22)',
        boxShadow: '0 1px 0 rgba(0,229,255,0.08), 0 4px 30px rgba(0,0,0,0.5)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        overflow: 'hidden',
      }}>
        {/* HUD circuit grid in nav */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.09, pointerEvents: 'none' }} aria-hidden>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="nav-ckt" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <rect width="60" height="60" fill="none" stroke="#00E5FF" strokeWidth="0.7" opacity="0.5"/>
                <circle cx="0" cy="0" r="2.5" fill="#00E5FF" opacity="0.9"/>
                <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" opacity="0.5"/>
                <circle cx="30" cy="30" r="1" fill="#00E5FF" opacity="0.4"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#nav-ckt)"/>
          </svg>
        </div>
        {/* Bottom glow line */}
        <div style={{ position: 'absolute', bottom: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.4), transparent)' }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
                alt="OLL Logo"
                style={{ height: 44, width: 'auto', filter: 'brightness(0) invert(1)' }}
              />
            </a>
            <button
              onClick={() => navigate('/summer-camp/book')}
              data-testid="camp-nav-book-btn"
              style={{
                background: '#D63031',
                color: '#fff',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 700,
                fontSize: '0.85rem',
                padding: '0.6rem 1.5rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.2s, box-shadow 0.2s',
                letterSpacing: '0.01em',
                boxShadow: '0 0 20px rgba(214,48,49,0.35)',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 35px rgba(255,51,102,0.55)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 20px rgba(214,48,49,0.35)'; }}
            >
              Book Now
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // Removed Blog and FAQ from navbar - moved to footer
  const navLinks = [
    { path: '/offerings', label: 'Offerings' },
    { path: '/about', label: 'About' },
    { path: '/centers', label: 'Centers' },
  ];

  const isActive = (path) => location.pathname === path;

  // Determine where logo/profile should navigate
  const getHomeLink = () => {
    if (!isLoggedIn) return '/';
    if (isEducator) return '/educator-dashboard';
    return '/my-bookings';
  };

  const getProfileLink = () => {
    if (isEducator) return '/educator-dashboard';
    return '/my-bookings';
  };

  return (
    <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link to={getHomeLink()} className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL Logo - Skill Education Platform"
              title="OLL - Robotics, Coding & AI Education"
              loading="eager"
              width="150"
              height="52"
              className="h-12 w-auto"
            />
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(link => (
              <Link 
                key={link.path}
                to={link.path} 
                className={`font-medium transition-colors ${
                  isActive(link.path) 
                    ? 'text-[#D63031]' 
                    : 'text-slate-600 hover:text-[#1E3A5F]'
                }`}
              >
                {link.label}
              </Link>
            ))}
            
            {/* About page variant: Join Team & Partner With Us */}
            {isAboutVariant ? (
              <>
                <Button
                  onClick={() => navigate('/join-team')}
                  variant="outline"
                  className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
                  data-testid="join-team-btn"
                >
                  <Users className="w-4 h-4 mr-2" />
                  Join Team
                </Button>
                <Button
                  onClick={() => navigate('/growth-partner')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                  data-testid="partner-btn"
                >
                  <Handshake className="w-4 h-4 mr-2" />
                  Partner With Us
                </Button>
              </>
            ) : (
              <>
                {/* Login / Profile - Dark Blue Button */}
                {isLoggedIn ? (
                  <button
                    onClick={() => navigate(getProfileLink())}
                    className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] font-medium"
                    data-testid="profile-btn"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEducator ? 'bg-[#D63031]' : 'bg-[#1E3A5F]'
                    }`}>
                      {isEducator ? (
                        <GraduationCap className="w-4 h-4 text-white" />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="hidden lg:inline">{user?.name?.split(' ')[0] || 'Profile'}</span>
                  </button>
                ) : (
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white"
                    data-testid="login-btn"
                  >
                    <LogIn className="w-4 h-4 mr-2" />
                    Login
                  </Button>
                )}
                
                {/* Hide Book Demo for educators */}
                {showBookDemo && !isEducator && (
                  <Button 
                    onClick={onBookDemo}
                    className="bg-[#D63031] hover:bg-[#b52828] text-white ml-2"
                    data-testid="nav-book-demo-btn"
                  >
                    Book Free Demo
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 md:hidden">
            {isAboutVariant ? (
              <>
                <Button
                  onClick={() => navigate('/join-team')}
                  variant="outline"
                  size="sm"
                  className="text-xs px-2"
                >
                  Join Team
                </Button>
                <Button
                  onClick={() => navigate('/growth-partner')}
                  size="sm"
                  className="bg-[#D63031] text-xs px-2"
                >
                  Partner
                </Button>
              </>
            ) : (
              <>
                {isLoggedIn && (
                  <button
                    onClick={() => navigate(getProfileLink())}
                    className="p-2"
                    data-testid="mobile-profile-btn"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isEducator ? 'bg-[#D63031]' : 'bg-[#1E3A5F]'
                    }`}>
                      {isEducator ? (
                        <GraduationCap className="w-4 h-4 text-white" />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </button>
                )}
                {!isLoggedIn && (
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm px-3 py-1 h-8"
                    data-testid="mobile-login-btn"
                  >
                    Login
                  </Button>
                )}
                {showBookDemo && !isEducator && (
                  <Button 
                    onClick={onBookDemo}
                    className="bg-[#D63031] hover:bg-[#b52828] text-white text-sm px-3 py-1 h-8"
                    data-testid="mobile-book-demo-btn"
                  >
                    Book Demo
                  </Button>
                )}
              </>
            )}
            <button 
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="mobile-menu-btn"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-1 animate-slide-up">
          {navLinks.map(link => (
            <Link 
              key={link.path}
              to={link.path} 
              className={`block py-2 px-2 rounded-lg ${
                isActive(link.path) 
                  ? 'text-[#D63031] bg-red-50' 
                  : 'text-slate-600 hover:text-[#1E3A5F] hover:bg-slate-50'
              }`}
              onClick={() => setMobileMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-200 mt-2">
            {isLoggedIn ? (
              <Link 
                to="/my-bookings"
                className="block py-2 px-2 rounded-lg text-slate-600 hover:text-[#1E3A5F] hover:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                My Bookings
              </Link>
            ) : (
              <Link 
                to="/login"
                className="block py-2 px-2 rounded-lg text-[#1E3A5F] font-medium hover:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
