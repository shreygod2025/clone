import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GraduationCap, Users, Building2, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useUserAuth } from '../context/UserAuthContext';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUserAuth();
  const [showSchoolDialog, setShowSchoolDialog] = useState(false);

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
        <title>OLL - Robotics, Coding & AI Classes for Kids | Book Demo</title>
        <meta name="description" content="OLL - India's #1 skill education platform. Learn Robotics, Coding, AI & Entrepreneurship. Expert tutors, flexible timings. Book a free demo today!" />
        <meta name="keywords" content="robotics classes India, coding classes for kids, AI courses, entrepreneurship education, skill development, STEM education, school programs, learn robotics, kids coding" />
        <link rel="canonical" href="https://oll.co" />
        
        {/* Open Graph */}
        <meta property="og:title" content="OLL - Robotics, Coding & AI Classes" />
        <meta property="og:description" content="Learn Robotics, Coding, AI & Entrepreneurship with India's #1 skill education platform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OLL - Skill Education Platform" />
        <meta name="twitter:description" content="Learn future-ready skills - Robotics, Coding, AI & more" />
        
        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OLL - Clonefutura Live Solutions",
            "alternateName": "OLL",
            "url": "https://oll.co",
            "description": "India's leading platform for Robotics, Coding, AI & Entrepreneurship education",
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
            }
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
            Leading a Skill Learning Revolution
          </h1>
          <p className="text-base md:text-lg text-slate-500 mt-2">
            Choose your path
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

      {/* School Options Dialog */}
      <Dialog open={showSchoolDialog} onOpenChange={setShowSchoolDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-[#1E3A5F]">
              Welcome, Schools!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-center text-slate-600 text-sm">What would you like to do?</p>
            
            <div className="grid gap-3">
              <Button
                onClick={() => {
                  setShowSchoolDialog(false);
                  navigate('/for-schools');
                }}
                variant="outline"
                className="h-auto py-4 flex items-center justify-between px-4 border-2 hover:border-[#1E3A5F] hover:bg-slate-50"
                data-testid="view-offerings-btn"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-[#1E3A5F]" />
                  <div className="text-left">
                    <div className="font-semibold text-[#1E3A5F]">View Our Offerings</div>
                    <div className="text-xs text-slate-500">Explore programs for your school</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </Button>
              
              <Button
                onClick={() => {
                  setShowSchoolDialog(false);
                  navigate('/school');
                }}
                className="h-auto py-4 flex items-center justify-between px-4 bg-[#D63031] hover:bg-[#b52828]"
                data-testid="book-meeting-btn"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-white" />
                  <div className="text-left">
                    <div className="font-semibold text-white">Book a Meeting</div>
                    <div className="text-xs text-white/70">Schedule a partnership discussion</div>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/70" />
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Footer - Always visible */}
      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
