import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { 
  ArrowRight, Building2, Eye, Calendar, Award, CheckCircle, 
  Play, School, GraduationCap, Users, BookOpen, Cpu, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const PARTNER_SCHOOLS = [
  'Greenlawns High School', 'G.D. Somani Memorial School', 'N.L. Dalmia High School',
  'Hiranandani Foundation School', 'JBCN International School', 'Seven Square Academy',
  'Goregaon Education Society English Medium School', 'Sanjeevani World School',
  'Fravashi International Academy', 'Maneckji Cooper Education Trust', 'Excelsior School',
  'J.N. Petit School', 'Seth Anandram Jaipuria School', 'St. Kabir School',
];

const HIGHLIGHTS = [
  { icon: School, value: '500+', label: 'Partner Schools' },
  { icon: Users, value: '50,000+', label: 'Students Trained' },
  { icon: Award, value: '100+', label: 'Exhibitions' },
  { icon: GraduationCap, value: '1,000+', label: 'Teachers Trained' },
];

const OFFERINGS_PREVIEW = [
  { icon: Cpu, title: 'Robotics', desc: 'Lab setup, curriculum & competitions', color: '#D63031' },
  { icon: TrendingUp, title: 'Financial Literacy', desc: 'Entrepreneurship programs & workshops', color: '#1E3A5F' },
  { icon: BookOpen, title: 'AI & Coding', desc: 'Future-ready tech education', color: '#D63031' },
];

const SchoolLandingPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>For Schools | OLL - Transform Education with Future Skills</title>
        <meta name="description" content="Partner with OLL to bring Robotics, AI, Coding and Entrepreneurship programs to your school. Lab setup, teacher training & competitions." />
        <link rel="canonical" href="https://oll.co/for-schools" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
        <Navbar />
        
        {/* Hero Section */}
        <section className="pt-24 pb-16 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-[#1E3A5F]/10 text-[#1E3A5F] px-4 py-2 rounded-full text-sm font-medium mb-6">
                <Building2 className="w-4 h-4" />
                For Schools & Institutions
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Transform Your School with <span className="text-[#D63031]">Future Skills</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto mb-10">
                Join 500+ schools across India in preparing students for the future with Robotics, AI, Coding & Entrepreneurship programs
              </p>

              {/* Action Cards - Similar to learner flow */}
              <div className="max-w-2xl mx-auto grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => navigate('/school-offerings')}
                  className="group bg-white border-2 border-slate-200 hover:border-[#1E3A5F] rounded-2xl p-6 text-left transition-all hover:shadow-lg"
                  data-testid="view-details-btn"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center group-hover:bg-[#1E3A5F]/20 transition-colors">
                      <Eye className="w-7 h-7 text-[#1E3A5F]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#1E3A5F] text-lg">View Details</h3>
                      <p className="text-sm text-slate-500">Explore all our offerings</p>
                    </div>
                  </div>
                  <div className="flex items-center text-[#1E3A5F] text-sm font-medium">
                    See Programs & Case Studies
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                <button
                  onClick={() => navigate('/school')}
                  className="group bg-gradient-to-br from-[#D63031] to-[#b52828] text-white rounded-2xl p-6 text-left transition-all hover:shadow-lg hover:scale-[1.02]"
                  data-testid="book-meeting-btn"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Book a Meeting</h3>
                      <p className="text-sm text-white/70">Schedule a call with us</p>
                    </div>
                  </div>
                  <div className="flex items-center text-sm font-medium">
                    Talk to our team today
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              {HIGHLIGHTS.map((stat, idx) => (
                <div key={idx} className="bg-white rounded-xl p-4 text-center shadow-sm">
                  <stat.icon className="w-8 h-8 mx-auto mb-2 text-[#D63031]" />
                  <div className="text-2xl font-bold text-[#1E3A5F]">{stat.value}</div>
                  <div className="text-sm text-slate-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Offerings Preview */}
        <section className="py-12 bg-white">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              What We Offer
            </h2>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {OFFERINGS_PREVIEW.map((offering, idx) => (
                <div key={idx} className="bg-slate-50 rounded-2xl p-6 text-center hover:shadow-md transition-shadow">
                  <div 
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${offering.color}15` }}
                  >
                    <offering.icon className="w-8 h-8" style={{ color: offering.color }} />
                  </div>
                  <h3 className="font-bold text-[#1E3A5F] text-lg mb-2">{offering.title}</h3>
                  <p className="text-sm text-slate-600">{offering.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate('/school-offerings')}
                className="border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                View All Offerings
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* Partner Schools */}
        <section className="py-12 bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="max-w-6xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Trusted by Leading Schools
            </h2>
            <div className="flex flex-wrap justify-center gap-3">
              {PARTNER_SCHOOLS.map((school, idx) => (
                <span key={idx} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                  {school}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Award className="w-16 h-16 text-[#D63031] mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Transform Your School?
            </h2>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Join the future of education. Let's discuss how OLL can help your students excel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => navigate('/school-offerings')}
                variant="outline"
                className="border-2 border-[#1E3A5F] text-[#1E3A5F] hover:bg-[#1E3A5F] hover:text-white"
              >
                <Eye className="w-5 h-5 mr-2" />
                View Details
              </Button>
              <Button 
                size="lg"
                onClick={() => navigate('/school')}
                className="bg-[#D63031] hover:bg-[#b52828] text-white"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book a Meeting
              </Button>
            </div>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
};

export default SchoolLandingPage;
