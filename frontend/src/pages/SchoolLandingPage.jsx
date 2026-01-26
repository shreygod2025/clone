import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Eye, Calendar, Award, School, GraduationCap, Users, CheckCircle2, Sparkles, Target, Lightbulb } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const HIGHLIGHTS = [
  { icon: School, value: '500+', label: 'Partner Schools' },
  { icon: Users, value: '50,000+', label: 'Students Trained' },
  { icon: Award, value: '100+', label: 'Exhibitions' },
  { icon: GraduationCap, value: '1,000+', label: 'Teachers Trained' },
];

const PROGRAMS = [
  { 
    title: 'Robotics Lab Setup', 
    description: 'Complete robotics infrastructure with curriculum and teacher training',
    icon: '🤖'
  },
  { 
    title: 'STEM Curriculum', 
    description: 'Integrated learning modules for Science, Technology, Engineering & Math',
    icon: '🔬'
  },
  { 
    title: 'AI & Coding', 
    description: 'Future-ready programming and artificial intelligence courses',
    icon: '💻'
  },
  { 
    title: 'Entrepreneurship', 
    description: 'Innovation labs and business thinking programs for young minds',
    icon: '💡'
  },
];

const BENEFITS = [
  'NEP 2020 Aligned Curriculum',
  'Certified & Trained Educators',
  'Regular Progress Reports',
  'Exhibition & Competition Support',
  'Parent Engagement Programs',
  'Flexible Partnership Models',
];

const SchoolLandingPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>For Schools | Robotics Lab Setup, AI & STEM Programs | OLL</title>
        <meta name="description" content="Partner with OLL for Robotics Lab Setup, AI, Coding & STEM programs for ICSE, CBSE & State Board schools. NEP 2020 aligned curriculum, teacher training, E-cell setup. 500+ partner schools across India." />
        <meta name="keywords" content="school robotics lab, STEM programs for schools, ICSE robotics, CBSE robotics program, robotics lab setup India, school AI program, coding curriculum schools, E-cell for schools, NEP 2020 skill education, teacher training robotics, state board STEM" />
        <link rel="canonical" href="https://oll.co/for-schools" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/for-schools" />
        <meta property="og:title" content="For Schools | Robotics Lab Setup, AI & STEM Programs | OLL" />
        <meta property="og:description" content="Transform your school with Robotics, AI & STEM programs. NEP 2020 aligned, 500+ partner schools. Lab setup, teacher training & student programs." />
        <meta property="og:image" content="https://oll.co/og-image.png" />
        <meta property="og:site_name" content="OLL - Online Live Learning" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="For Schools | Robotics Lab & STEM Programs | OLL" />
        <meta name="twitter:description" content="Robotics Lab Setup, AI & STEM programs for ICSE, CBSE & State Board schools. 500+ partners." />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />
        
        {/* Structured Data - Local Business */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EducationalOrganization",
            "name": "OLL School Programs",
            "description": "Robotics Lab Setup, AI, Coding & STEM programs for ICSE, CBSE and State Board schools across India",
            "url": "https://oll.co/for-schools",
            "areaServed": "IN",
            "hasOfferCatalog": {
              "@type": "OfferCatalog",
              "name": "School Programs",
              "itemListElement": [
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Robotics Lab Setup"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "STEM Curriculum"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "AI & Coding Programs"}},
                {"@type": "Offer", "itemOffered": {"@type": "Service", "name": "Teacher Training"}}
              ]
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-20 md:pt-28 lg:pt-32 pb-16 md:pb-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-[#1E3A5F] mb-4 md:mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Transform Your School with <span className="text-[#D63031]">Future Skills</span>
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto mb-10 md:mb-12">
              Join 500+ schools across India in preparing students for the future with world-class skill education programs
            </p>

            {/* Action Cards */}
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              <button
                onClick={() => navigate('/school-offerings')}
                className="group bg-white border-2 border-slate-200 hover:border-[#1E3A5F] rounded-2xl p-6 md:p-8 text-left transition-all hover:shadow-lg"
                data-testid="view-details-btn"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center">
                    <Eye className="w-7 h-7 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E3A5F] text-lg md:text-xl">View Details</h3>
                    <p className="text-sm text-slate-500">Explore our offerings</p>
                  </div>
                </div>
                <div className="flex items-center text-[#1E3A5F] text-sm font-medium">
                  Programs, Pricing & Case Studies
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => navigate('/school')}
                className="group bg-gradient-to-br from-[#D63031] to-[#b52828] text-white rounded-2xl p-6 md:p-8 text-left transition-all hover:shadow-lg hover:scale-[1.02]"
                data-testid="book-meeting-btn"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                    <Calendar className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg md:text-xl">Book a Meeting</h3>
                    <p className="text-sm text-white/70">Schedule a call with us</p>
                  </div>
                </div>
                <div className="flex items-center text-sm font-medium">
                  Talk to our partnership team
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 md:py-16 bg-white/50">
          <div className="max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {HIGHLIGHTS.map((stat, idx) => (
                <div key={idx} className="text-center p-4">
                  <div className="w-12 h-12 mx-auto mb-3 bg-[#D63031]/10 rounded-xl flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-[#D63031]" />
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-[#1E3A5F]">{stat.value}</div>
                  <div className="text-sm text-slate-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Programs Section */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Programs We Offer
              </h2>
              <p className="text-slate-600">Comprehensive skill development solutions for K-12 schools</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PROGRAMS.map((program, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-6 border border-slate-100 hover:border-[#1E3A5F]/30 hover:shadow-lg transition-all"
                >
                  <div className="text-4xl mb-4">{program.icon}</div>
                  <h3 className="font-bold text-[#1E3A5F] mb-2">{program.title}</h3>
                  <p className="text-sm text-slate-500">{program.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why Partner Section */}
        <section className="py-16 md:py-24 px-4 bg-[#1E3A5F]/5">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  Why Schools Partner with OLL
                </h2>
                <p className="text-slate-600 mb-8">
                  We provide end-to-end solutions that make implementing future skills education seamless for your institution.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {BENEFITS.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                      <span className="text-slate-700 text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                  <Sparkles className="w-6 h-6 text-[#D63031]" />
                  <h3 className="font-bold text-[#1E3A5F] text-lg">Ready to Get Started?</h3>
                </div>
                <p className="text-slate-600 mb-6">
                  Schedule a free consultation with our school partnerships team to discuss how OLL can help transform your institution.
                </p>
                <button
                  onClick={() => navigate('/school')}
                  className="w-full bg-[#D63031] hover:bg-[#b52828] text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Schedule a Meeting
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Join the Future of Education
            </h2>
            <p className="text-slate-600 mb-8">
              Be part of the 500+ schools already transforming their students&apos; futures with OLL&apos;s skill education programs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => navigate('/school-offerings')}
                className="px-8 py-3 bg-white border-2 border-[#1E3A5F] text-[#1E3A5F] font-medium rounded-xl hover:bg-[#1E3A5F] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Programs
              </button>
              <button
                onClick={() => navigate('/school')}
                className="px-8 py-3 bg-[#D63031] text-white font-medium rounded-xl hover:bg-[#b52828] transition-colors flex items-center justify-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Book a Meeting
              </button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default SchoolLandingPage;
