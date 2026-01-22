import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { GraduationCap, Users, Building2, ArrowRight, Eye, Calendar } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useUserAuth } from '../context/UserAuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';

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
    setShowSchoolDialog(true);
  };

  const userTypes = [
    {
      id: 'student',
      title: 'Student / Parent',
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
        <title>OLL - India&apos;s Leading Skill Education Platform | Robotics, Coding, AI</title>
        <meta name="description" content="OLL (Open Learning Labs) - India's #1 platform for Robotics, Coding, AI & Entrepreneurship education. Programs for students, educators & schools. Book a free demo today!" />
        <meta name="keywords" content="robotics classes India, coding classes for kids, AI courses, entrepreneurship education, skill development, STEM education, school programs, learn robotics, kids coding" />
        <link rel="canonical" href="https://oll.co" />
        
        {/* Open Graph */}
        <meta property="og:title" content="OLL - India's Leading Skill Education Platform" />
        <meta property="og:description" content="Learn Robotics, Coding, AI & Entrepreneurship with India's #1 skill education platform. Programs for all ages." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OLL - India's Leading Skill Education" />
        <meta name="twitter:description" content="Learn future-ready skills with OLL - Robotics, Coding, AI & more" />
        
        {/* Structured Data - Organization */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OLL - Open Learning Labs",
            "alternateName": "OLL",
            "url": "https://oll.co",
            "description": "India's leading platform for Robotics, Coding, AI & Entrepreneurship education",
            "sameAs": [
              "https://facebook.com/ollrobotics",
              "https://instagram.com/ollrobotics",
              "https://linkedin.com/company/ollrobotics",
              "https://youtube.com/@ollrobotics"
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
      
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Main Content */}
      <main className="flex-1 flex flex-col px-4 py-4 md:py-6">
        {/* Tagline */}
        <div className="text-center mb-4 md:mb-6 shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Leading a Skill Learning Revolution
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">
            Choose your path
          </p>
        </div>

        {/* User Type Cards - Flexible Grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6 max-w-7xl mx-auto w-full">
          {userTypes.map((type) => (
            <div
              key={type.id}
              onClick={type.onClick}
              className={`relative rounded-2xl md:rounded-3xl bg-gradient-to-br ${type.gradient} p-4 md:p-6 lg:p-8 flex flex-col cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl`}
              data-testid={`${type.id}-card`}
            >
              {/* Icon */}
              <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-2 md:mb-auto">
                <type.icon className="w-5 h-5 md:w-7 md:h-7 text-white" />
              </div>
              
              {/* Content */}
              <div>
                <p className="text-white/70 text-xs md:text-sm font-medium">{type.subtitle}</p>
                <h2 className="text-lg md:text-2xl lg:text-3xl font-bold text-white" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {type.title}
                </h2>
                <p className="text-white/60 text-xs md:text-sm mt-1">{type.description}</p>
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
                  navigate('/school-offerings');
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
      
      <Footer variant="compact" />
    </div>
    </>
  );
};

export default LandingPage;
