import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, User, BookOpen, MapPin, Target, Phone, Mail, HelpCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 'learner', title: 'Who is learning?', icon: User },
  { id: 'age', title: 'Age Group', icon: User },
  { id: 'skill', title: 'What to learn?', icon: BookOpen },
  { id: 'mode', title: 'Learning Mode', icon: MapPin },
  { id: 'city', title: 'Location', icon: MapPin },
  { id: 'goal', title: 'Learning Goal', icon: Target },
  { id: 'contact', title: 'Contact Details', icon: Phone },
  { id: 'demo', title: 'Book Demo', icon: Calendar },
];

const LEARNER_OPTIONS = [
  { value: 'self', label: 'I am the student', description: 'Looking to learn myself' },
  { value: 'child', label: 'My child', description: 'Enrolling my child' },
];

const AGE_OPTIONS = [
  { value: '6-8', label: '6-8 years', description: 'Early learners' },
  { value: '9-12', label: '9-12 years', description: 'Middle school' },
  { value: '13-16', label: '13-16 years', description: 'High school' },
  { value: '17+', label: '17+ years', description: 'Advanced learners' },
];

const SKILL_OPTIONS = [
  { value: 'robotics', label: 'Robotics', description: 'Build and program robots', icon: '🤖' },
  { value: 'coding', label: 'Coding', description: 'Learn programming', icon: '💻' },
  { value: 'ai', label: 'AI & Machine Learning', description: 'Explore artificial intelligence', icon: '🧠' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', description: 'Business & innovation', icon: '💡' },
  { value: 'financial', label: 'Financial Literacy', description: 'Money management skills', icon: '📊' },
];

const MODE_OPTIONS = [
  { value: 'online', label: 'Online', description: 'Learn from anywhere' },
  { value: 'offline', label: 'Offline', description: 'In-person classes' },
];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

const GOAL_OPTIONS = [
  { value: 'fun', label: 'Fun Learning', description: 'Explore and enjoy' },
  { value: 'competitions', label: 'Competitions', description: 'Prepare for contests' },
  { value: 'career', label: 'Career Exposure', description: 'Future job readiness' },
  { value: 'school', label: 'School Support', description: 'Academic enhancement' },
];

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const StudentFunnel = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [showFAQ, setShowFAQ] = useState(false);
  const [formData, setFormData] = useState({
    learner_type: '',
    age_group: '',
    skill: '',
    learning_mode: '',
    city: '',
    learning_goal: '',
    name: '',
    email: '',
    phone: '',
    demo_date: null,
    demo_time: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const canProceed = () => {
    switch (STEPS[currentStep].id) {
      case 'learner': return formData.learner_type;
      case 'age': return formData.age_group;
      case 'skill': return formData.skill;
      case 'mode': return formData.learning_mode;
      case 'city': return formData.city;
      case 'goal': return formData.learning_goal;
      case 'contact': return formData.name && formData.email && formData.phone;
      case 'demo': return formData.demo_date && formData.demo_time;
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
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
      };
      await axios.post(`${API}/students/inquiry`, payload);
      setSubmitted(true);
      toast.success('Demo booked successfully! We will contact you soon.');
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
            Demo Booked Successfully!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest in OLL. Our team will reach out to you shortly to confirm your demo session.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-slate-500 mb-1">Scheduled for</p>
            <p className="font-semibold text-[#1E3A5F]">
              {formData.demo_date ? format(formData.demo_date, 'EEEE, MMMM d, yyyy') : ''} at {formData.demo_time}
            </p>
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
      case 'learner':
        return (
          <div className="space-y-4">
            {LEARNER_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card ${formData.learner_type === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('learner_type', option.value)}
                data-testid={`learner-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'age':
        return (
          <div className="grid grid-cols-2 gap-4">
            {AGE_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card ${formData.age_group === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('age_group', option.value)}
                data-testid={`age-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'skill':
        return (
          <div className="space-y-3">
            {SKILL_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card flex items-center gap-4 ${formData.skill === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('skill', option.value)}
                data-testid={`skill-${option.value}`}
              >
                <span className="text-3xl">{option.icon}</span>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] mb-1">{option.label}</h3>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'mode':
        return (
          <div className="grid grid-cols-2 gap-4">
            {MODE_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card text-center py-8 ${formData.learning_mode === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('learning_mode', option.value)}
                data-testid={`mode-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'city':
        return (
          <div className="grid grid-cols-3 gap-3">
            {CITIES.map(city => (
              <div
                key={city}
                className={`selection-card text-center py-4 ${formData.city === city ? 'selected' : ''}`}
                onClick={() => updateForm('city', city)}
                data-testid={`city-${city.toLowerCase()}`}
              >
                <span className="font-medium text-[#1E3A5F]">{city}</span>
              </div>
            ))}
          </div>
        );

      case 'goal':
        return (
          <div className="grid grid-cols-2 gap-4">
            {GOAL_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card ${formData.learning_goal === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('learning_goal', option.value)}
                data-testid={`goal-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1">{option.label}</h3>
                <p className="text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
              <Input
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="input-glass"
                data-testid="input-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="input-glass"
                data-testid="input-email"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
              <Input
                placeholder="Enter your phone number"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className="input-glass"
                data-testid="input-phone"
              />
            </div>
          </div>
        );

      case 'demo':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={formData.demo_date}
                  onSelect={(date) => updateForm('demo_date', date)}
                  disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                  className="rounded-xl border border-slate-200"
                  data-testid="demo-calendar"
                />
              </div>
            </div>
            {formData.demo_date && (
              <div className="animate-slide-up">
                <label className="block text-sm font-medium text-slate-700 mb-3">Select Time</label>
                <div className="grid grid-cols-4 gap-2">
                  {TIME_SLOTS.map(time => (
                    <div
                      key={time}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer transition-all ${
                        formData.demo_time === time 
                          ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => updateForm('demo_time', time)}
                      data-testid={`time-${time.replace(':', '')}`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm font-medium">{time}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

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
            <button 
              onClick={() => setShowFAQ(true)}
              className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] transition-colors"
              data-testid="faq-btn"
            >
              <HelpCircle className="w-5 h-5" />
              <span className="hidden sm:inline">Need Help?</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4">
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
                    }`} style={{ width: '20px' }} />
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
                onClick={currentStep === 0 ? () => navigate('/') : handleBack}
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
                  {submitting ? 'Booking...' : 'Book Demo'}
                  <Check className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* FAQ Modal */}
      {showFAQ && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 max-w-lg w-full max-h-[80vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Frequently Asked Questions
              </h3>
              <button onClick={() => setShowFAQ(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-[#1E3A5F] mb-2">What age groups do you cater to?</h4>
                <p className="text-sm text-slate-600">We offer programs for students aged 6 years and above, with customized curriculum for each age group.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-[#1E3A5F] mb-2">Do you offer online classes?</h4>
                <p className="text-sm text-slate-600">Yes, we offer both online and offline learning modes to suit your convenience.</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-semibold text-[#1E3A5F] mb-2">What is the demo session about?</h4>
                <p className="text-sm text-slate-600">The demo is a free 30-minute session where your child can experience our teaching methodology.</p>
              </div>
            </div>
            <Link 
              to="/faq" 
              className="mt-6 text-[#D63031] font-medium flex items-center gap-2 justify-center"
            >
              View All FAQs <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentFunnel;
