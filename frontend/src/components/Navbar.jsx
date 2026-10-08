import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogIn, GraduationCap, Users, Handshake, BookOpen, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import { useUserAuth } from '../context/UserAuthContext';

const LMS_URL = 'https://lms.oll.co';

const Navbar = ({ showBookDemo = false, onBookDemo, bookDemoLabel = 'Book Free Demo', variant = 'default' }) => {
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

  // Workshop variant — Father's Day style (yellow + blue, single Enroll CTA)
  if (variant === 'workshop') {
    return (
      <nav style={{
        background: 'rgba(255,248,224,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(30,58,95,0.08)',
        boxShadow: '0 1px 0 rgba(30,58,95,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 12 }} data-testid="workshop-nav-logo">
              <img
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
                alt="OLL Logo"
                style={{ height: 40, width: 'auto' }}
              />
            </Link>

            {/* Section breadcrumb — "Father's Day Workshop" */}
            <div className="hidden sm:flex items-center gap-2" data-testid="workshop-nav-section">
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#FF7B6B', display: 'inline-block' }} />
              <span style={{ fontFamily: '"Fredoka", "Nunito", sans-serif', color: '#0F2960', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.01em' }}>
                Father&apos;s Day Workshop
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '2px 8px', borderRadius: 999, background: '#FFFFFF', border: '1.5px solid #FCE899', fontSize: '0.62rem', fontWeight: 700, color: '#C97A00', textTransform: 'uppercase', letterSpacing: '0.14em' }}>
                Sun 21 June
              </span>
            </div>

            <button
              onClick={() => {
                const el = document.querySelector('[data-testid="hero-enroll-btn"]');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                window.dispatchEvent(new CustomEvent('open-workshop-enroll'));
              }}
              data-testid="workshop-nav-enroll-btn"
              className="bg-[#1E40AF] hover:bg-[#1E3A8A] text-white font-bold px-5 sm:px-6 py-2.5 rounded-full shadow-lg shadow-blue-900/20 transition-all text-sm sm:text-base"
              style={{ fontFamily: '"Fredoka", "Nunito", sans-serif' }}
            >
              Enroll Now
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // Future Skills variant — clean nav, ONLY "Book Free Trial" (login hidden)
  if (variant === 'futureskills') {
    return (
      <nav style={{
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(15,30,51,0.08)',
        boxShadow: '0 1px 0 rgba(15,30,51,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
            <Link to="/future-skills" style={{ display: 'flex', alignItems: 'center' }} data-testid="fs-nav-logo">
              <img
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
                alt="OLL Logo"
                style={{ height: 44, width: 'auto' }}
              />
            </Link>
            <button
              onClick={() => (onBookDemo ? onBookDemo() : null)}
              data-testid="fs-nav-book-btn"
              className="bg-gradient-to-r from-[#D63031] to-[#1E3A5F] hover:from-[#B52828] hover:to-[#0F1E33] text-white font-bold px-5 sm:px-6 py-2.5 rounded-xl shadow-lg shadow-blue-900/20 transition-all text-sm sm:text-base"
            >
              {bookDemoLabel || 'Book Free Trial'}
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // AI Foundations variant — clean nav with sticky Book Now, login hidden
  if (variant === 'aifoundations') {
    return (
      <nav style={{
        background: 'rgba(255,255,255,0.94)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(15,30,51,0.08)',
        boxShadow: '0 1px 0 rgba(15,30,51,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
            <Link to="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
                alt="OLL Logo"
                style={{ height: 44, width: 'auto' }}
              />
            </Link>
            <button
              onClick={() => navigate('/ai-foundations/book?trial=1')}
              data-testid="aifoundations-nav-book-btn"
              className="bg-[#1E3A5F] text-white font-bold px-5 sm:px-6 py-2.5 rounded-xl shadow-lg shadow-blue-900/20 hover:bg-[#0F1E33] transition-all text-sm sm:text-base"
            >
              Book Free Trial
            </button>
          </div>
        </div>
      </nav>
    );
  }

  // Removed Blog and FAQ from navbar - moved to footer
  const navLinks = [
    { path: '/offerings', label: 'Offerings' },
    { path: '/shop', label: 'Shop' },
    { path: '/about', label: 'About' },
    { path: '/centers', label: 'Centers' },
    { path: '/techfest', label: 'Techfest', highlight: true },
    // In-app blog pages: served by React + <Helmet> for SEO. We moved
    // off the WordPress mirror so the editor-controlled posts here are
    // the canonical source (prerender/SSR via Helmet + canonical tag).
    { path: '/blogs', label: 'Blog' },
  ];

  const isActive = (path) => location.pathname === path;

  // Determine where logo/profile should navigate (used by multiple variants)
  const getHomeLink = () => {
    if (!isLoggedIn) return '/';
    if (isEducator) return '/educator-dashboard';
    return '/my-bookings';
  };

  const getProfileLink = () => {
    if (isEducator) return '/educator-dashboard';
    return '/my-bookings';
  };

  // ── Pill variant — floating glacial-blue pill (matches Robotics Beginner) ──
  if (variant === 'pill') {
    return (
      <>
        {/* Local CSS scoped to the pill nav — mirrors RoboticsBeginnerLanding */}
        <style>{`
          .oll-pillnav {
            position: fixed; top: 22px; left: 50%; transform: translateX(-50%);
            z-index: 60; display: flex; align-items: center; justify-content: space-between;
            gap: 1rem; padding: 0.55rem 0.65rem 0.55rem 1.5rem;
            width: min(1180px, calc(100vw - 32px));
            background: linear-gradient(135deg, rgba(255,255,255,0.94) 0%, rgba(224,242,254,0.88) 100%);
            backdrop-filter: blur(22px) saturate(180%);
            -webkit-backdrop-filter: blur(22px) saturate(180%);
            border: 1px solid rgba(255,255,255,0.75);
            border-radius: 999px;
            box-shadow: 0 20px 48px rgba(10,31,68,0.22), 0 0 0 1px rgba(15,30,80,0.04) inset;
            white-space: nowrap;
          }
          .oll-pillnav-links { display: flex; align-items: center; gap: 1.35rem; }
          .oll-pillnav-links a {
            font-family: 'Proxima Nova', 'Manrope', 'Inter', sans-serif;
            font-weight: 700; font-size: 0.9rem; color: #0A1F44; opacity: 0.75;
            text-decoration: none; transition: opacity 0.2s ease, color 0.2s ease;
          }
          .oll-pillnav-links a:hover { opacity: 1; color: #D63031; }
          .oll-pillnav-links a.active { opacity: 1; color: #D63031; }
          .oll-pillnav-links a.oll-pill-hl {
            background: #DC2626; color: #fff !important; opacity: 1 !important;
            padding: 0.4rem 0.85rem; border-radius: 999px;
            box-shadow: 0 8px 18px rgba(220,38,38,0.35);
          }
          .oll-pillnav-links a.oll-pill-hl:hover { background: #B91C1C; color: #fff !important; }
          .oll-pillnav-links a.oll-pill-hl.active { background: #B91C1C; color: #fff !important; }
          .oll-pillnav-actions { display: flex; align-items: center; gap: 0.5rem; }

          .oll-pill-btn-outline {
            background: transparent; color: #0A1F44;
            border: 1.5px solid rgba(10,31,68,0.35);
            padding: 0.55rem 1.05rem; border-radius: 999px;
            font-family: 'Proxima Nova', 'Manrope', sans-serif;
            font-weight: 700; font-size: 0.86rem;
            display: inline-flex; align-items: center; gap: 0.4rem;
            cursor: pointer; text-decoration: none;
            transition: all 0.2s ease;
          }
          .oll-pill-btn-outline:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }

          .oll-pill-btn-primary {
            background: linear-gradient(135deg, #D63031 0%, #B52828 100%);
            color: #fff; border: none;
            padding: 0.6rem 1.2rem; border-radius: 999px;
            font-family: 'Proxima Nova', 'Manrope', sans-serif;
            font-weight: 800; font-size: 0.86rem;
            display: inline-flex; align-items: center; gap: 0.4rem;
            cursor: pointer; text-decoration: none;
            box-shadow: 0 8px 22px rgba(214,48,49,0.35);
            transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.2s ease;
          }
          .oll-pill-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 28px rgba(214,48,49,0.45); }

          .oll-pill-profile {
            width: 40px; height: 40px; border-radius: 50%;
            display: inline-flex; align-items: center; justify-content: center;
            background: linear-gradient(135deg, #1E3A5F 0%, #0A1F44 100%);
            color: #fff; border: 1.5px solid rgba(255,255,255,0.6);
            box-shadow: 0 8px 18px rgba(10,31,68,0.25); cursor: pointer;
          }

          @media (max-width: 820px) {
            .oll-pillnav-links { gap: 0; }
            .oll-pillnav-links a:not(.oll-pill-hl) { display: none; }
            .oll-pillnav-links a.oll-pill-hl { padding: 0.35rem 0.7rem; font-size: 0.78rem; }
            .oll-pillnav { padding: 0.5rem 0.5rem 0.5rem 1rem; gap: 0.5rem; }
            .oll-pill-btn-outline, .oll-pill-btn-primary { padding: 0.55rem 0.9rem; font-size: 0.8rem; }
          }
          @media (max-width: 520px) {
            .oll-pill-hide-sm { display: none; }
          }
          /* Spacer so page content isn't hidden under the fixed pill */
          .oll-pillnav-spacer { height: 92px; }
        `}</style>

        <nav className="oll-pillnav" data-testid="pill-navbar" aria-label="Primary">
          <Link to={getHomeLink()} style={{ display: 'flex', alignItems: 'center' }} data-testid="pill-nav-logo">
            <img
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png"
              alt="OLL — Skill Education Platform"
              title="OLL — Robotics, Coding & AI Education"
              loading="eager"
              width="150"
              height="44"
              style={{ height: 40, width: 'auto' }}
            />
          </Link>

          {/* Center nav links */}
          <div className="oll-pillnav-links">
            {navLinks.map((link) => (
              link.external ? (
                <a
                  key={link.path}
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${link.highlight ? 'oll-pill-hl' : ''}`.trim()}
                  data-testid={`pill-nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`${isActive(link.path) ? 'active' : ''} ${link.highlight ? 'oll-pill-hl' : ''}`.trim()}
                  data-testid={`pill-nav-link-${link.label.toLowerCase()}`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Right side actions */}
          <div className="oll-pillnav-actions">
            <a
              href={LMS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="oll-pill-btn-outline"
              data-testid="pill-nav-lms-login"
              aria-label="LMS Login (opens in a new tab)"
            >
              <BookOpen size={14} /> <span className="oll-pill-hide-sm">LMS Login</span>
            </a>

            {isLoggedIn ? (
              <button
                onClick={() => navigate(getProfileLink())}
                className="oll-pill-profile"
                data-testid="pill-nav-profile"
                aria-label={`${user?.name?.split(' ')[0] || 'Profile'}`}
              >
                {isEducator ? <GraduationCap size={18} /> : <User size={18} />}
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="oll-pill-btn-primary"
                data-testid="pill-nav-login"
              >
                <LogIn size={14} /> <span className="oll-pill-hide-sm">Login</span>
                <ArrowRight size={14} className="oll-pill-hide-sm" />
              </button>
            )}
          </div>
        </nav>
        <div className="oll-pillnav-spacer" aria-hidden />
      </>
    );
  }

  // Determine where logo/profile should navigate

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
              link.external ? (
                <a
                  key={link.path}
                  href={link.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium transition-colors text-slate-600 hover:text-[#1E3A5F]"
                >
                  {link.label}
                </a>
              ) : (
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
              )
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
                    {bookDemoLabel}
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
                    {bookDemoLabel === 'Book Now' ? 'Book Now' : 'Book Demo'}
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
            link.external ? (
              <a
                key={link.path}
                href={link.path}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-2 px-2 rounded-lg text-slate-600 hover:text-[#1E3A5F] hover:bg-slate-50"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ) : (
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
            )
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
