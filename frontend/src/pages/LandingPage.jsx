import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GraduationCap, Users, Building2, ArrowRight, Zap } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useUserAuth } from '../context/UserAuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUserAuth();

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect logged-in students to their bookings page
  useEffect(() => {
    if (isLoggedIn && user?.user_type === 'student') {
      navigate('/my-bookings');
    }
  }, [isLoggedIn, user, navigate]);

  const handleSchoolClick = () => {
    navigate('/for-schools');
  };

  const userTypes = [
    {
      id: 'student',
      title: 'Learner',
      subtitle: 'Learn Future-Ready Skills',
      description: 'Robotics, Coding, AI & more',
      icon: GraduationCap,
      path: '/student',
      gradient: 'from-[#1E3A5F] to-[#2C5282]',
      onClick: () => navigate('/student')
    },
    {
      id: 'educator',
      title: 'Educator',
      subtitle: 'Join Our Network',
      description: 'Teach & grow with OLL',
      icon: Users,
      path: '/educator',
      gradient: 'from-[#D63031] to-[#e84142]',
      onClick: () => navigate('/educator')
    },
    {
      id: 'school',
      title: 'School',
      subtitle: 'Partner With Us',
      description: 'Complete skill programs',
      icon: Building2,
      path: '/school',
      gradient: 'from-[#1E3A5F] to-[#D63031]',
      onClick: handleSchoolClick
    }
  ];

  return (
    <>
      <Helmet>
        <title>OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship Classes</title>
        <meta name="description" content="OLL offers Robotics, AI, Coding, Entrepreneurship & Financial Literacy skill classes for students of all ages. Lab setups & programs for ICSE, CBSE, State Board schools. Book a free demo today!" />
        <meta name="keywords" content="OLL, robotics classes, AI classes, coding for kids, entrepreneurship classes, financial literacy, STEM education, robotics lab setup, ICSE robotics, CBSE robotics, skill education India, future skills, coding classes near me, robotics courses, E-cell for schools, online learning platform" />
        <link rel="canonical" href="https://oll.co" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/" />
        <meta property="og:title" content="OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship" />
        <meta property="og:description" content="Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Expert educators, flexible timings. Book a free demo!" />
        <meta property="og:image" content="https://oll.co/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="OLL - Online Live Learning" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://oll.co/" />
        <meta name="twitter:title" content="OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship" />
        <meta name="twitter:description" content="Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Book a free demo!" />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />
        
        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OLL - Online Live Learning",
            "alternateName": "OLL",
            "url": "https://oll.co",
            "logo": "https://framerusercontent.com/images/ywGyUzRzQVuUgpLwj6QkBXzo.png",
            "description": "India's leading platform for Robotics, Coding, AI, Entrepreneurship & Financial Literacy education for students. Lab setups and programs for ICSE, CBSE & State Board schools.",
            "sameAs": [
              "https://www.facebook.com/ollcompany",
              "https://www.instagram.com/oll.co_/",
              "https://www.linkedin.com/company/ollcompany/",
              "https://www.youtube.com/channel/UCwQyfX_lsVCLBUV5Or-rZ8g",
              "https://x.com/Onlinelivelearn"
            ],
            "address": {
              "@type": "PostalAddress",
              "addressLocality": "Mumbai",
              "addressRegion": "Maharashtra",
              "addressCountry": "IN"
            },
            "areaServed": "IN",
            "knowsAbout": ["Robotics", "Artificial Intelligence", "Coding", "Entrepreneurship", "Financial Literacy", "STEM Education"]
          })}
        </script>
        
        {/* Structured Data - Course List */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            "name": "OLL Skill Courses",
            "itemListElement": [
              {"@type": "Course", "position": 1, "name": "Robotics for Kids", "description": "Build robots and learn electronics, mechanics & programming", "provider": {"@type": "Organization", "name": "OLL"}},
              {"@type": "Course", "position": 2, "name": "AI & Machine Learning", "description": "Learn artificial intelligence concepts and build AI projects", "provider": {"@type": "Organization", "name": "OLL"}},
              {"@type": "Course", "position": 3, "name": "Coding & Programming", "description": "Learn coding from scratch - Python, Scratch, JavaScript", "provider": {"@type": "Organization", "name": "OLL"}},
              {"@type": "Course", "position": 4, "name": "Entrepreneurship", "description": "Business thinking, innovation and startup fundamentals", "provider": {"@type": "Organization", "name": "OLL"}},
              {"@type": "Course", "position": 5, "name": "Financial Literacy", "description": "Money management, investing basics and financial planning", "provider": {"@type": "Organization", "name": "OLL"}}
            ]
          })}
        </script>
      </Helmet>
      
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />

      {/* Main Content - Desktop: Centered with max height cards */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12">
        {/* Tagline */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E3A5F] leading-tight" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Learn Future Skills for a Brighter Future
          </h1>
          <p className="text-base md:text-lg text-slate-500 mt-2">
            Robotics • AI • Coding • Entrepreneurship • Financial Literacy
          </p>
        </div>

        {/* User Type Cards - Tall cards on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto w-full px-4">
          {userTypes.map((type) => (
            <div
              key={type.id}
              onClick={type.onClick}
              className={`relative rounded-2xl md:rounded-3xl bg-gradient-to-br ${type.gradient} p-6 md:p-8 flex flex-col cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl min-h-[180px] md:min-h-[400px]`}
              data-testid={`${type.id}-card`}
            >
              {/* Icon */}
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <type.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              
              {/* Content - pushed to bottom on desktop */}
              <div className="md:mt-auto">
                <p className="text-white/70 text-xs md:text-sm font-medium">{type.subtitle}</p>
                <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {type.title}
                </h2>
                <p className="text-white/60 text-sm md:text-base mt-2">{type.description}</p>
              </div>
              
              {/* Arrow positioned at bottom right */}
              <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Summer Camp Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #080C16 0%, #1E3A5F 45%, #0D1829 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '4rem 1.5rem',
        }}
      >
        {/* Circuit pattern */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.12, pointerEvents: 'none' }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="circuit-home" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M60 0 L0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                <circle cx="0" cy="0" r="2" fill="#00E5FF" />
                <path d="M30 0 L30 20 M30 40 L30 60 M0 30 L20 30 M40 30 L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#circuit-home)" />
          </svg>
        </div>
        <div style={{ position: 'absolute', top: '-60px', right: '5%', width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-40px', left: '5%', width: 240, height: 240, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,229,255,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="max-w-6xl mx-auto relative" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: '999px', background: 'rgba(214,48,49,0.2)', border: '1px solid #D63031', color: '#FF6B6B', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D63031', display: 'inline-block', animation: 'pulse 2s infinite' }} />
              Limited Seats
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 14px', borderRadius: '999px', background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.3)', color: '#00E5FF', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em' }}>
              May 2026 · Mumbai
            </span>
          </div>

          <p style={{ fontFamily: 'Unbounded, sans-serif', fontSize: '0.65rem', letterSpacing: '0.25em', color: '#00E5FF', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Future Skills Summer Camp 2026
          </p>
          <h2 style={{ fontFamily: 'Unbounded, sans-serif', fontSize: 'clamp(1.75rem, 5vw, 3.25rem)', fontWeight: 900, color: '#F8FAFC', lineHeight: 1.1, marginBottom: '1rem', maxWidth: 640 }}>
            Give Your Child the <span style={{ color: '#D63031' }}>Summer of the Future</span>
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '1rem', maxWidth: 500, lineHeight: 1.6, marginBottom: '1.75rem', fontFamily: 'Outfit, sans-serif' }}>
            Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for ages 4–16 at Mumbai centers or online.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '2rem', justifyContent: 'center' }}>
            {['Ages 4–8', 'Ages 9–12', 'Ages 13–16', 'Mumbai Centers', 'Online Option', '10 Kids/Batch'].map(tag => (
              <span key={tag} style={{ padding: '5px 14px', borderRadius: '999px', background: 'rgba(255,255,255,0.06)', color: '#CBD5E1', fontSize: '0.78rem', fontFamily: 'Outfit, sans-serif', border: '1px solid rgba(255,255,255,0.08)' }}>
                {tag}
              </span>
            ))}
          </div>

          <button
            onClick={() => navigate('/summer-camp')}
            data-testid="homepage-camp-book-btn"
            style={{
              background: '#D63031', color: '#fff',
              fontFamily: 'Unbounded, sans-serif', fontWeight: 700, fontSize: '0.9rem',
              padding: '1rem 2.5rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
              boxShadow: '0 0 30px rgba(214,48,49,0.4)',
              display: 'inline-flex', alignItems: 'center', gap: 8,
              transition: 'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.6)'; e.currentTarget.style.background = '#FF3366'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 0 30px rgba(214,48,49,0.4)'; e.currentTarget.style.background = '#D63031'; }}
          >
            Book Now
            <ArrowRight style={{ width: 18, height: 18 }} />
          </button>
        </div>
      </section>

      {/* Footer - Always visible */}
      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
