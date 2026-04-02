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
      gradient: 'from-[#D63031] to-[#c0392b]',
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
        <meta name="keywords" content="OLL, OLL India, robotics classes, AI classes, coding for kids, entrepreneurship classes, financial literacy, STEM education, robotics lab setup, ICSE robotics, CBSE robotics, skill education India, future skills, coding classes near me" />
        <link rel="canonical" href="https://oll.co/" />

        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/" />
        <meta property="og:title" content="OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship" />
        <meta property="og:description" content="Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Expert educators, flexible timings. Book a free demo!" />
        <meta property="og:image" content="https://static.prod-images.emergentagent.com/jobs/4048d873-d260-47ab-be01-5efb2f8a71c2/images/3484c900f20debbcd95f333ebd0b59a212adcaeebd3c2db1919581020c07de0c.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="OLL" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://oll.co/" />
        <meta name="twitter:title" content="OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship" />
        <meta name="twitter:description" content="Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Book a free demo!" />
        <meta name="twitter:image" content="https://static.prod-images.emergentagent.com/jobs/4048d873-d260-47ab-be01-5efb2f8a71c2/images/3484c900f20debbcd95f333ebd0b59a212adcaeebd3c2db1919581020c07de0c.png" />

        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OLL",
            "alternateName": ["OLL India", "OLL - Learn Future Skills"],
            "url": "https://oll.co",
            "logo": "https://oll.co/favicon.png",
            "description": "India's leading platform for Robotics, Coding, AI, Entrepreneurship & Financial Literacy education for students aged 4–16. Lab setups and programs for ICSE, CBSE & State Board schools. As seen on Shark Tank India and Kaun Banega Crorepati.",
            "foundingDate": "2020",
            "sameAs": [
              "https://www.facebook.com/ollcompany",
              "https://www.instagram.com/ollindia/",
              "https://www.linkedin.com/company/ollindia/",
              "https://www.youtube.com/@ollindia",
              "https://x.com/Onlinelivelearn"
            ],
            "address": { "@type": "PostalAddress", "addressLocality": "Mumbai", "addressRegion": "Maharashtra", "addressCountry": "IN" },
            "areaServed": "IN",
            "knowsAbout": ["Robotics", "Artificial Intelligence", "Coding", "Entrepreneurship", "Financial Literacy", "STEM Education", "3D Design", "Machine Learning"]
          })}
        </script>

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

      {/* Summer Camp — Offerings-style section */}
      <section style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #edf2f8 18%, #c2d4e8 38%, #4a7aaa 55%, #1e3a5f 72%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '4rem',
        paddingBottom: 0,
      }}>

        {/* Above-card header (light background area) */}
        <div style={{ textAlign: 'center', paddingBottom: '2.5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#D63031', marginBottom: '0.75rem', fontFamily: 'Nunito Sans, sans-serif',
          }}>
            Exclusive · Limited Seats
          </p>
          <h2 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 900,
            color: '#0F172A',
            lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}>
            Summer Camps 2026
          </h2>
          <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6, fontFamily: 'Nunito Sans, sans-serif' }}>
            Intensive 2-week camps where kids build real tech projects with expert mentors
          </p>
        </div>

        {/* Standout dark card */}
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0B1628 0%, #0f2040 50%, #0B1628 100%)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(0,229,255,0.15)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
            position: 'relative',
            overflow: 'hidden',
            padding: '2.5rem',
          }}>
            {/* Circuit overlay */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="circuit-card" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M60 0L0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                    <circle cx="0" cy="0" r="2" fill="#00E5FF" />
                    <path d="M30 0L30 20 M30 40L30 60 M0 30L20 30 M40 30L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                    <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit-card)" />
              </svg>
            </div>
            {/* Red glow */}
            <div style={{ position: 'absolute', top: '-60px', right: '8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="grid md:grid-cols-[1fr_280px] gap-8" style={{ position: 'relative' }}>
              {/* Left: content */}
              <div>
                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: '999px', background: 'rgba(214,48,49,0.25)', border: '1px solid #D63031', color: '#FF6B6B', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D63031', display: 'inline-block' }} />
                    Limited Spots
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: '999px', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)', color: '#00E5FF', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    May 2026
                  </span>
                </div>

                {/* Heading */}
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F8FAFC', display: 'block' }}>Future Skills</span>
                  <span style={{ background: 'linear-gradient(90deg, #00E5FF, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Summer Camp 2026
                  </span>
                </h3>

                <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.25rem', maxWidth: 400, fontFamily: 'Nunito Sans, sans-serif' }}>
                  Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for ages 4–16. Online or at Mumbai centers.
                </p>

                {/* Feature pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.75rem' }}>
                  {['Mumbai Centers', 'Online Option', '10 Kids/Batch', '4 Batch Weeks'].map(text => (
                    <span key={text} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: '0.75rem', fontFamily: 'Nunito Sans, sans-serif' }}>
                      {text}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate('/summer-camp')}
                  data-testid="homepage-camp-book-btn"
                  style={{
                    background: '#D63031', color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.85rem',
                    padding: '0.85rem 2rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 0 28px rgba(214,48,49,0.4)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.55)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 28px rgba(214,48,49,0.4)'; }}
                >
                  Book Summer Camp
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Right: age group cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                {[
                  { ages: 'Ages 4–8',   label: 'Little Explorers',  color: '#00E5FF', icon: '🌱' },
                  { ages: 'Ages 9–12',  label: 'Tech Creators',     color: '#D63031', icon: '⚡' },
                  { ages: 'Ages 13–16', label: 'Future Innovators', color: '#7C3AED', icon: '🚀' },
                ].map(g => (
                  <div key={g.ages}
                    onClick={() => navigate('/summer-camp')}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = g.color + '55'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '0.65rem', padding: '0.65rem 0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
                  >
                    <span style={{ fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                    <div>
                      <div style={{ color: g.color, fontSize: '0.78rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2, whiteSpace: 'nowrap' }}>{g.ages}</div>
                      <div style={{ color: '#64748B', fontSize: '0.7rem', fontFamily: "'Nunito Sans', sans-serif", marginTop: '0.1rem' }}>{g.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Always visible */}
      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
