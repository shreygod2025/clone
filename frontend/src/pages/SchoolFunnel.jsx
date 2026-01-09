import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Check, Building2, Users, Award, Wrench, HelpCircle, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PROGRAMS = [
  { value: 'stem', label: 'STEM / Robotics' },
  { value: 'ai', label: 'AI & Coding' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'financial', label: 'Financial Literacy' },
];

const SUPPORT_OPTIONS = [
  { value: 'curriculum', label: 'Curriculum Design' },
  { value: 'lab', label: 'Lab Setup' },
  { value: 'competitions', label: 'Competitions' },
  { value: 'training', label: 'Teacher Training' },
];

const SCHOOL_SIZES = [
  'Under 500 students',
  '500-1000 students',
  '1000-2000 students',
  '2000+ students'
];

const FEE_RANGES = [
  'Under ₹50,000/year',
  '₹50,000 - ₹1,00,000/year',
  '₹1,00,000 - ₹2,00,000/year',
  'Above ₹2,00,000/year'
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

const SchoolFunnel = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    school_name: '',
    contact_name: '',
    email: '',
    phone: '',
    location: '',
    school_size: '',
    fee_range: '',
    programs_interested: [],
    support_needed: [],
  });

  const toggleProgram = (program) => {
    setFormData(prev => ({
      ...prev,
      programs_interested: prev.programs_interested.includes(program)
        ? prev.programs_interested.filter(p => p !== program)
        : [...prev.programs_interested, program]
    }));
  };

  const toggleSupport = (support) => {
    setFormData(prev => ({
      ...prev,
      support_needed: prev.support_needed.includes(support)
        ? prev.support_needed.filter(s => s !== support)
        : [...prev.support_needed, support]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.school_name || !formData.email || !formData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/schools/inquiry`, formData);
      setSubmitted(true);
      toast.success('Inquiry submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-lg w-full text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Inquiry Submitted!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest in partnering with OLL. Our school partnerships team will contact you within 24-48 hours to schedule a discussion.
          </p>
          
          {/* Credibility Section */}
          <div className="bg-slate-50 rounded-xl p-6 mb-6 text-left">
            <h3 className="font-semibold text-[#1E3A5F] mb-4">Why Schools Choose OLL</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-[#1E3A5F]" />
                </div>
                <span className="text-sm text-slate-600">500+ Partner Schools</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Users className="w-4 h-4 text-[#1E3A5F]" />
                </div>
                <span className="text-sm text-slate-600">50,000+ Students Trained</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/10 flex items-center justify-center">
                  <Award className="w-4 h-4 text-[#1E3A5F]" />
                </div>
                <span className="text-sm text-slate-600">100+ Competition Winners</span>
              </div>
            </div>
          </div>
          
          <Button onClick={() => navigate('/')} className="btn-primary w-full" data-testid="back-to-home-btn">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-8"
              />
            </Link>
            <Link 
              to="/faq"
              className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] transition-colors"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Need Help?</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Bring Future Skills to Your School
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Partner with OLL to implement world-class skill education programs — without operational hassle.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-6 md:p-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* School Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                  <Building2 className="w-5 h-5" /> School Information
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">School Name *</label>
                  <Input
                    placeholder="Enter school name"
                    value={formData.school_name}
                    onChange={(e) => setFormData({...formData, school_name: e.target.value})}
                    className="input-glass"
                    data-testid="school-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person Name *</label>
                  <Input
                    placeholder="Enter contact person name"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({...formData, contact_name: e.target.value})}
                    className="input-glass"
                    data-testid="contact-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="Enter email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-glass"
                    data-testid="school-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                  <Input
                    placeholder="Enter phone number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-glass"
                    data-testid="school-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Location</label>
                  <select
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full h-12 px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none"
                    data-testid="school-location"
                  >
                    <option value="">Select City</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#1E3A5F] text-lg flex items-center gap-2">
                  <Wrench className="w-5 h-5" /> Requirements
                </h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">School Size</label>
                  <select
                    value={formData.school_size}
                    onChange={(e) => setFormData({...formData, school_size: e.target.value})}
                    className="w-full h-12 px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none"
                    data-testid="school-size"
                  >
                    <option value="">Select Size</option>
                    {SCHOOL_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Fee Range</label>
                  <select
                    value={formData.fee_range}
                    onChange={(e) => setFormData({...formData, fee_range: e.target.value})}
                    className="w-full h-12 px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none"
                    data-testid="school-fee-range"
                  >
                    <option value="">Select Fee Range</option>
                    {FEE_RANGES.map(fee => (
                      <option key={fee} value={fee}>{fee}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Programs Interested In</label>
                  <div className="space-y-2">
                    {PROGRAMS.map(program => (
                      <div key={program.value} className="flex items-center gap-3">
                        <Checkbox
                          id={program.value}
                          checked={formData.programs_interested.includes(program.value)}
                          onCheckedChange={() => toggleProgram(program.value)}
                          data-testid={`program-${program.value}`}
                        />
                        <label htmlFor={program.value} className="text-sm text-slate-600 cursor-pointer">
                          {program.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Support Needed</label>
                  <div className="space-y-2">
                    {SUPPORT_OPTIONS.map(support => (
                      <div key={support.value} className="flex items-center gap-3">
                        <Checkbox
                          id={support.value}
                          checked={formData.support_needed.includes(support.value)}
                          onCheckedChange={() => toggleSupport(support.value)}
                          data-testid={`support-${support.value}`}
                        />
                        <label htmlFor={support.value} className="text-sm text-slate-600 cursor-pointer">
                          {support.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-200">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate('/')}
                className="flex items-center gap-2"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
                data-testid="submit-inquiry-btn"
              >
                {submitting ? 'Submitting...' : 'Schedule Discussion'}
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>

          {/* Trust Section */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#D63031]">500+</div>
              <div className="text-sm text-slate-500">Partner Schools</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#D63031]">50,000+</div>
              <div className="text-sm text-slate-500">Students</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#D63031]">100+</div>
              <div className="text-sm text-slate-500">Cities</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-[#D63031]">95%</div>
              <div className="text-sm text-slate-500">Satisfaction</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchoolFunnel;
