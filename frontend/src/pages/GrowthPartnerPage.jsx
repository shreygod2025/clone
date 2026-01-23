import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Check, Users, Building2, GraduationCap, Briefcase, DollarSign, Award, BookOpen, School, UserCheck, Handshake, ChevronRight, Phone, Mail, MapPin, User } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ROLE_OPTIONS = [
  { 
    value: 'open_center', 
    label: 'Open an OLL Center', 
    description: 'Start your own OLL learning center in your city',
    icon: Building2
  },
  { 
    value: 'distributor', 
    label: 'Distribute OLL Products to Schools', 
    description: 'Partner with schools to bring OLL programs',
    icon: School
  },
  { 
    value: 'trainer', 
    label: 'Become an Independent Trainer', 
    description: 'Teach OLL curriculum as a certified trainer',
    icon: GraduationCap
  },
];

const LOOKING_FOR = [
  {
    icon: GraduationCap,
    title: 'Experienced Teachers',
    description: 'Currently working teachers, tuition teachers, or retired educators with passion for teaching'
  },
  {
    icon: Handshake,
    title: 'Well Connected with Schools',
    description: 'Individuals with strong relationships with schools, principals, or education administrators'
  },
  {
    icon: UserCheck,
    title: 'Personalised Teaching Experience',
    description: 'Those who understand and value personalized, student-centric teaching approaches'
  },
  {
    icon: Award,
    title: 'Expertise in Their Field',
    description: 'Specialists in robotics, coding, AI, entrepreneurship, or financial literacy'
  },
];

const BENEFITS = [
  {
    icon: Award,
    title: 'Utilize Reputed Brand',
    description: "Leverage OLL's reputed brand built over 5 years, and its products developed with expertise for your growth."
  },
  {
    icon: DollarSign,
    title: 'Revenue Share',
    description: 'Earn a share of revenue for your efforts in finding and onboarding schools to OLL programs.'
  },
  {
    icon: BookOpen,
    title: 'Training & Support',
    description: 'Get comprehensive training on OLL curriculum and ongoing support from our expert team.'
  },
  {
    icon: Users,
    title: 'Growing Network',
    description: 'Join a community of like-minded educators and entrepreneurs across India.'
  },
];

const GrowthPartnerPage = () => {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    role: '',
    experience: '',
    details: '',
  });

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone || !formData.role) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/growth-partners`, {
        name: formData.name,
        email: formData.email || '',
        phone: formData.phone,
        city: formData.city,
        interest_type: formData.role,
        details: `Experience: ${formData.experience || 'Not specified'}\n${formData.details}`,
        source: 'growth_partner_page'
      });
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-[#1E3A5F] mb-2">Application Submitted!</h2>
          <p className="text-slate-500 mb-6">
            Thank you for your interest in partnering with OLL. Our team will review your application and get back to you within 48 hours.
          </p>
          <Button onClick={() => navigate('/')} className="bg-[#1E3A5F] hover:bg-[#152c4a]">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <Helmet>
        <title>Growth Partner Program | OLL - Open an OLL Center</title>
        <meta name="description" content="Become an OLL Growth Partner. Open a learning center, distribute OLL programs to schools, or become a certified trainer. Join India's leading skill education franchise." />
      </Helmet>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL" 
              className="h-10"
            />
          </Link>
          <Link to="/about" className="text-sm text-slate-600 hover:text-[#1E3A5F]">
            About Us
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 sm:py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Briefcase className="w-4 h-4" />
            Growth Partner Program
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Partner with OLL
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Join India's leading skill education platform and help shape the future of learning. 
            Build a rewarding career while making a difference in students' lives.
          </p>
          <a href="#apply" className="inline-flex items-center gap-2 bg-[#D63031] hover:bg-[#b52828] text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all">
            Apply Now
            <ChevronRight className="w-5 h-5" />
          </a>
        </div>
      </section>

      {/* Who We're Looking For */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Who Are We Looking For?
          </h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
            We're seeking passionate individuals who share our vision for quality education
          </p>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LOOKING_FOR.map((item, idx) => (
              <div key={idx} className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-6 border border-slate-100 hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
                  <item.icon className="w-7 h-7 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#1E3A5F] mb-2">{item.title}</h3>
                <p className="text-slate-500 text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Benefits for Partners
          </h2>
          <p className="text-slate-600 text-center max-w-2xl mx-auto mb-12">
            Enjoy exclusive advantages when you partner with OLL
          </p>
          
          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {BENEFITS.map((item, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[#1E3A5F] mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section id="apply" className="py-16 px-4 bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Apply to Become a Partner
          </h2>
          <p className="text-slate-600 text-center mb-8">
            Fill out the form below and our team will get in touch with you
          </p>

          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 space-y-6">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Your Role *</label>
              <div className="space-y-3">
                {ROLE_OPTIONS.map((role) => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => setFormData({...formData, role: role.value})}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      formData.role === role.value 
                        ? 'border-emerald-500 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                    data-testid={`role-${role.value}`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      formData.role === role.value ? 'bg-emerald-500' : 'bg-slate-100'
                    }`}>
                      <role.icon className={`w-5 h-5 ${formData.role === role.value ? 'text-white' : 'text-slate-500'}`} />
                    </div>
                    <div>
                      <p className={`font-semibold ${formData.role === role.value ? 'text-emerald-700' : 'text-slate-700'}`}>
                        {role.label}
                      </p>
                      <p className="text-sm text-slate-500">{role.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Details */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="pl-10 h-12"
                    data-testid="input-name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '').slice(0, 10)})}
                    className="pl-10 h-12"
                    data-testid="input-phone"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="pl-10 h-12"
                    data-testid="input-email"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="Your city"
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="pl-10 h-12"
                    data-testid="input-city"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relevant Experience</label>
              <Input
                placeholder="e.g., 5 years teaching, School connections, etc."
                value={formData.experience}
                onChange={(e) => setFormData({...formData, experience: e.target.value})}
                className="h-12"
                data-testid="input-experience"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tell us more about yourself</label>
              <Textarea
                placeholder="Share your background, why you're interested, and any questions..."
                value={formData.details}
                onChange={(e) => setFormData({...formData, details: e.target.value})}
                className="min-h-[100px]"
                data-testid="input-details"
              />
            </div>

            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full bg-[#D63031] hover:bg-[#b52828] h-12 text-lg"
              data-testid="submit-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </Button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-[#1E3A5F] text-white">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-white/60 text-sm">
            © 2024 Clonefutura Live Solutions. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GrowthPartnerPage;
