import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Award, Wrench, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 'school_name', title: 'School Name' },
  { id: 'board', title: 'Board' },
  { id: 'location', title: 'Location' },
  { id: 'school_size', title: 'School Size' },
  { id: 'fee_range', title: 'Fee Range' },
  { id: 'programs', title: 'Programs Interested In' },
  { id: 'support', title: 'Support Needed' },
  { id: 'contact', title: 'Contact Details' },
];

const BOARDS = [
  { value: 'cbse', label: 'CBSE', description: 'Central Board of Secondary Education' },
  { value: 'icse', label: 'ICSE', description: 'Indian Certificate of Secondary Education' },
  { value: 'igcse', label: 'IGCSE', description: 'International General Certificate' },
  { value: 'state', label: 'State Board', description: 'State Education Board' },
  { value: 'ib', label: 'IB', description: 'International Baccalaureate' },
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

const SCHOOL_SIZES = [
  { value: 'under_500', label: 'Under 500 students', description: 'Small school' },
  { value: '500_1000', label: '500-1000 students', description: 'Medium school' },
  { value: '1000_2000', label: '1000-2000 students', description: 'Large school' },
  { value: '2000_plus', label: '2000+ students', description: 'Very large school' },
];

const FEE_RANGES = [
  { value: 'under_50k', label: 'Under ₹50,000/year', description: 'Budget friendly' },
  { value: '50k_1l', label: '₹50,000 - ₹1,00,000/year', description: 'Mid range' },
  { value: '1l_2l', label: '₹1,00,000 - ₹2,00,000/year', description: 'Premium' },
  { value: 'above_2l', label: 'Above ₹2,00,000/year', description: 'Premium Plus' },
];

const PROGRAMS = [
  { value: 'stem', label: 'STEM / Robotics', description: 'Hands-on science & tech' },
  { value: 'coding', label: 'Coding & AI', description: 'Programming skills' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', description: 'Business mindset' },
  { value: 'financial', label: 'Financial Literacy', description: 'Money management' },
];

const SUPPORT_OPTIONS = [
  { value: 'curriculum', label: 'Curriculum Design', description: 'Course structure & content' },
  { value: 'lab', label: 'Lab Setup', description: 'Infrastructure & equipment' },
  { value: 'competitions', label: 'Competitions', description: 'Events & championships' },
  { value: 'training', label: 'Teacher Training', description: 'Faculty development' },
];

const SchoolFunnel = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    school_name: '',
    board: '',
    location: '',
    school_size: '',
    fee_range: '',
    programs_interested: [],
    support_needed: [],
    contact_name: '',
    phone: '',
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].includes(value)
        ? prev[key].filter(v => v !== value)
        : [...prev[key], value]
    }));
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'school_name': return formData.school_name.trim();
      case 'board': return formData.board;
      case 'location': return formData.location;
      case 'school_size': return formData.school_size;
      case 'fee_range': return formData.fee_range;
      case 'programs': return formData.programs_interested.length > 0;
      case 'support': return formData.support_needed.length > 0;
      case 'contact': return formData.contact_name && formData.phone;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      navigate('/');
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: formData.school_name,
        contact_name: formData.contact_name,
        email: `${formData.phone}@school.oll`,
        phone: formData.phone,
        location: formData.location,
        school_size: formData.school_size,
        fee_range: formData.fee_range,
        programs_interested: formData.programs_interested,
        support_needed: formData.support_needed,
        board: formData.board,
      });
      setSubmitted(true);
      toast.success('Inquiry submitted successfully!');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
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
            Thank you for your interest in partnering with OLL. Our school partnerships team will contact you within 24-48 hours.
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

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'school_name':
        return (
          <div className="space-y-4">
            <p className="text-slate-600 mb-4">Enter your school's name</p>
            <Input
              placeholder="e.g., Delhi Public School"
              value={formData.school_name}
              onChange={(e) => updateForm('school_name', e.target.value)}
              className="input-glass text-lg h-14"
              data-testid="school-name-input"
              autoFocus
            />
          </div>
        );

      case 'board':
        return (
          <div className="space-y-3">
            {BOARDS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-5 ${formData.board === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('board', option.value)}
                data-testid={`board-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] text-lg">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'location':
        return (
          <div className="grid grid-cols-3 gap-3">
            {CITIES.map(city => (
              <div
                key={city}
                className={`selection-card text-center py-4 ${formData.location === city ? 'selected' : ''}`}
                onClick={() => updateForm('location', city)}
                data-testid={`city-${city.toLowerCase()}`}
              >
                <span className="font-medium text-[#1E3A5F]">{city}</span>
              </div>
            ))}
          </div>
        );

      case 'school_size':
        return (
          <div className="grid grid-cols-2 gap-4">
            {SCHOOL_SIZES.map(option => (
              <div
                key={option.value}
                className={`selection-card p-5 ${formData.school_size === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('school_size', option.value)}
                data-testid={`size-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F]">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'fee_range':
        return (
          <div className="grid grid-cols-2 gap-4">
            {FEE_RANGES.map(option => (
              <div
                key={option.value}
                className={`selection-card p-5 ${formData.fee_range === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('fee_range', option.value)}
                data-testid={`fee-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F]">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'programs':
        return (
          <div className="space-y-3">
            <p className="text-slate-600 mb-2">Select all that apply</p>
            {PROGRAMS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-5 flex items-center gap-4 ${formData.programs_interested.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleArrayItem('programs_interested', option.value)}
                data-testid={`program-${option.value}`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  formData.programs_interested.includes(option.value) 
                    ? 'bg-[#D63031] border-[#D63031]' 
                    : 'border-slate-300'
                }`}>
                  {formData.programs_interested.includes(option.value) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{option.label}</h3>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'support':
        return (
          <div className="space-y-3">
            <p className="text-slate-600 mb-2">Select all that apply</p>
            {SUPPORT_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-5 flex items-center gap-4 ${formData.support_needed.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleArrayItem('support_needed', option.value)}
                data-testid={`support-${option.value}`}
              >
                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  formData.support_needed.includes(option.value) 
                    ? 'bg-[#D63031] border-[#D63031]' 
                    : 'border-slate-300'
                }`}>
                  {formData.support_needed.includes(option.value) && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F]">{option.label}</h3>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person Name</label>
              <Input
                placeholder="Enter your name"
                value={formData.contact_name}
                onChange={(e) => updateForm('contact_name', e.target.value)}
                className="input-glass"
                data-testid="contact-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className="input-glass"
                data-testid="contact-phone"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-8"
              />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-8 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {STEPS.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`step-indicator ${
                    index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending'
                  }`}>
                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  {index < STEPS.length - 1 && (
                    <div className={`w-full h-1 mx-1 rounded ${
                      index < currentStep ? 'bg-[#1E3A5F]' : 'bg-slate-200'
                    }`} style={{ width: '16px' }} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>

          {/* Step Card */}
          <div className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in">
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {STEPS[currentStep].title}
            </h2>
            
            {renderStep()}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              
              {currentStep < STEPS.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-btn"
                >
                  Next
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canProceed() || submitting}
                  className="btn-primary flex items-center gap-2"
                  data-testid="submit-btn"
                >
                  {submitting ? 'Submitting...' : 'Submit Inquiry'}
                  <Send className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SchoolFunnel;
