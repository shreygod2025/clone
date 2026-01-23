import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Eye, Calendar, Award, School, GraduationCap, Users } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;

const HIGHLIGHTS = [
  { icon: School, value: '500+', label: 'Partner Schools' },
  { icon: Users, value: '50,000+', label: 'Students Trained' },
  { icon: Award, value: '100+', label: 'Exhibitions' },
  { icon: GraduationCap, value: '1,000+', label: 'Teachers Trained' },
];

const SchoolLandingPage = () => {
  const navigate = useNavigate();
  const [partnerSchools, setPartnerSchools] = useState([]);

  useEffect(() => {
    const fetchPartnerSchools = async () => {
      try {
        const response = await axios.get(`${API}/api/partner-schools`);
        setPartnerSchools(response.data || []);
      } catch (error) {
        // Fallback to default schools
        setPartnerSchools([
          'Greenlawns High School', 'G.D. Somani Memorial School', 'N.L. Dalmia High School',
          'Hiranandani Foundation School', 'JBCN International School', 'Seven Square Academy',
          'Sanjeevani World School', 'Fravashi International Academy', 'Maneckji Cooper Education Trust',
          'Excelsior School', 'J.N. Petit School', 'Seth Anandram Jaipuria School', 'St. Kabir School',
        ]);
      }
    };
    fetchPartnerSchools();
  }, []);

  return (
    <>
      <Helmet>
        <title>For Schools | OLL - Transform Education with Future Skills</title>
        <meta name="description" content="Partner with OLL to bring Robotics, AI, Coding and Entrepreneurship programs to your school." />
        <link rel="canonical" href="https://oll.co/for-schools" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        
        {/* Hero Section - Compact */}
        <section className="pt-16 pb-8 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Transform Your School with <span className="text-[#D63031]">Future Skills</span>
            </h1>
            <p className="text-base md:text-lg text-slate-600 max-w-2xl mx-auto mb-6">
              Join 500+ schools across India in preparing students for the future
            </p>

            {/* Action Cards - Compact */}
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/school-offerings')}
                className="group bg-white border-2 border-slate-200 hover:border-[#1E3A5F] rounded-xl p-4 text-left transition-all hover:shadow-md"
                data-testid="view-details-btn"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#1E3A5F]/10 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h3 className="font-bold text-[#1E3A5F] text-sm md:text-base">View Details</h3>
                    <p className="text-xs text-slate-500 hidden sm:block">Explore offerings</p>
                  </div>
                </div>
                <div className="flex items-center text-[#1E3A5F] text-xs font-medium">
                  Programs & Case Studies
                  <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              <button
                onClick={() => navigate('/school')}
                className="group bg-gradient-to-br from-[#D63031] to-[#b52828] text-white rounded-xl p-4 text-left transition-all hover:shadow-md hover:scale-[1.02]"
                data-testid="book-meeting-btn"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm md:text-base">Book Meeting</h3>
                    <p className="text-xs text-white/70 hidden sm:block">Schedule a call</p>
                  </div>
                </div>
                <div className="flex items-center text-xs font-medium">
                  Talk to our team
                  <ArrowRight className="w-3 h-3 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            </div>

            {/* Stats - Compact horizontal */}
            <div className="flex justify-center gap-6 mt-6 flex-wrap">
              {HIGHLIGHTS.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <stat.icon className="w-5 h-5 text-[#D63031]" />
                  <span className="font-bold text-[#1E3A5F]">{stat.value}</span>
                  <span className="text-sm text-slate-500">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Partner Schools - Dynamic */}
        <section className="py-8 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-xl md:text-2xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Trusted by Leading Schools
            </h2>
            <div className="flex flex-wrap justify-center gap-2">
              {partnerSchools.map((school, idx) => (
                <span 
                  key={idx} 
                  className="px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-xs md:text-sm"
                >
                  {typeof school === 'string' ? school : school.name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Award className="w-12 h-12 text-[#D63031] mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-3" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Transform Your School?
            </h2>
            <p className="text-slate-600 mb-6 max-w-xl mx-auto">
              Join the future of education with OLL
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/school-offerings')}
                className="px-6 py-2.5 border-2 border-[#1E3A5F] text-[#1E3A5F] rounded-full font-medium hover:bg-[#1E3A5F] hover:text-white transition-colors flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
              <button
                onClick={() => navigate('/school')}
                className="px-6 py-2.5 bg-[#D63031] text-white rounded-full font-medium hover:bg-[#b52828] transition-colors flex items-center justify-center gap-2"
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
