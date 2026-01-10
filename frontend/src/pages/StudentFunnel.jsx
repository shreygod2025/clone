import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, BookOpen, MapPin, Target, Mail, HelpCircle, MessageCircle, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Learning Flow Steps
const LEARNING_STEPS = [
  { id: 'age', title: 'Age Group' },
  { id: 'skill', title: 'What to learn?' },
  { id: 'mode', title: 'Learning Mode' },
  { id: 'city', title: 'Location' }, // Only if offline
  { id: 'goal', title: 'Learning Goal' },
  { id: 'contact', title: 'Contact Details' },
  { id: 'demo_date', title: 'Select Date' },
  { id: 'demo_time', title: 'Select Time' },
];

const AGE_OPTIONS = [
  { value: '6-8', label: '6-8 years', description: 'Early learners' },
  { value: '9-12', label: '9-12 years', description: 'Middle school' },
  { value: '13-16', label: '13-16 years', description: 'High school' },
  { value: '17+', label: '17+ years', description: 'Advanced learners' },
];

const SKILL_OPTIONS = [
  { value: 'robotics', label: 'Robotics', description: 'Build and program robots' },
  { value: 'coding', label: 'Coding', description: 'Learn programming' },
  { value: 'ai', label: 'AI & Machine Learning', description: 'Explore artificial intelligence' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', description: 'Business & innovation' },
  { value: 'financial', label: 'Financial Literacy', description: 'Money management skills' },
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

const QUERY_CATEGORIES = [
  { value: 'courses', label: 'About Courses', description: 'Course details, curriculum' },
  { value: 'fees', label: 'Fees & Pricing', description: 'Fee structure, discounts' },
  { value: 'schedule', label: 'Schedule & Timing', description: 'Batch timings, duration' },
  { value: 'demo', label: 'Demo Session', description: 'Book or reschedule demo' },
  { value: 'other', label: 'Other Query', description: 'Any other question' },
];

const StudentFunnel = () => {
  const navigate = useNavigate();
  const [flowType, setFlowType] = useState(null); // 'learn' or 'support'
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    learner_type: 'self',
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
  const [supportData, setSupportData] = useState({
    name: '',
    email: '',
    category: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showQueryOption, setShowQueryOption] = useState(false);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Get active steps based on learning mode
  const getActiveSteps = () => {
    if (formData.learning_mode === 'online') {
      return LEARNING_STEPS.filter(s => s.id !== 'city');
    }
    return LEARNING_STEPS;
  };

  const activeSteps = getActiveSteps();

  const canProceed = () => {
    const step = activeSteps[currentStep];
    if (!step) return false;
    
    switch (step.id) {
      case 'age': return formData.age_group;
      case 'skill': return formData.skill;
      case 'mode': return formData.learning_mode;
      case 'city': return formData.city;
      case 'goal': return formData.learning_goal;
      case 'contact': return formData.name && formData.phone;
      case 'demo_date': return formData.demo_date;
      case 'demo_time': return formData.demo_time;
      default: return false;
    }
  };

  const handleNext = () => {
    if (currentStep < activeSteps.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setFlowType(null);
    }
  };

  const handleSubmitLearning = async () => {
    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        email: `${formData.phone}@student.oll`,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
      };
      await axios.post(`${API}/students/inquiry`, payload);
      setSubmitted(true);
      toast.success('Demo booked successfully!');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSupport = async () => {
    if (!supportData.name || !supportData.email || !supportData.category || !supportData.message) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/ticket`, {
        ...supportData,
        user_type: 'student',
        subject: `Query: ${supportData.category}`,
      });
      toast.success('Query submitted! We\'ll get back to you soon.');
      navigate('/');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Success Screen after demo booking
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
            Our team will reach out to you with the link to join your demo session.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-slate-500 mb-1">Scheduled for</p>
            <p className="font-semibold text-[#1E3A5F]">
              {formData.demo_date ? format(formData.demo_date, 'EEEE, MMMM d, yyyy') : ''} at {formData.demo_time}
            </p>
          </div>
          
          {!showQueryOption ? (
            <div className="space-y-3">
              <Button onClick={() => navigate('/')} className="btn-primary w-full" data-testid="back-to-home-btn">
                Back to Home
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowQueryOption(true)} 
                className="w-full flex items-center justify-center gap-2"
                data-testid="ask-query-btn"
              >
                <MessageCircle className="w-4 h-4" /> Have a Question?
              </Button>
            </div>
          ) : (
            <div className="text-left space-y-4 animate-slide-up">
              <h3 className="font-semibold text-[#1E3A5F]">Ask a Query</h3>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <select
                  value={supportData.category}
                  onChange={(e) => setSupportData({...supportData, category: e.target.value})}
                  className="w-full h-12 px-4 border border-slate-200 rounded-xl"
                  data-testid="query-category"
                >
                  <option value="">Select category</option>
                  {QUERY_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Question</label>
                <Textarea
                  placeholder="Type your question..."
                  value={supportData.message}
                  onChange={(e) => setSupportData({
                    ...supportData, 
                    message: e.target.value,
                    name: formData.name,
                    email: formData.email
                  })}
                  className="min-h-[100px]"
                  data-testid="query-message"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowQueryOption(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSubmitSupport} disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Sending...' : 'Submit'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Initial Selection Screen
  if (!flowType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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

        <main className="pt-12 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                How can we help you?
              </h1>
              <p className="text-slate-600">Select an option to continue</p>
            </div>

            <div className="space-y-4">
              <div
                className="selection-card flex items-center gap-4 p-6"
                onClick={() => setFlowType('learn')}
                data-testid="learn-skill-option"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#D63031]/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-7 h-7 text-[#D63031]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">I'm looking to learn a skill</h3>
                  <p className="text-sm text-slate-500">Explore courses and book a free demo</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
              </div>

              <div
                className="selection-card flex items-center gap-4 p-6"
                onClick={() => setFlowType('support')}
                data-testid="support-option"
              >
                <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center shrink-0">
                  <HelpCircle className="w-7 h-7 text-[#1E3A5F]" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">I have a query / need support</h3>
                  <p className="text-sm text-slate-500">Get help with your questions</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400 ml-auto" />
              </div>
            </div>

            <div className="mt-8 text-center">
              <Button variant="ghost" onClick={() => navigate('/')} className="text-slate-500">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Support Flow
  if (flowType === 'support') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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

        <main className="pt-12 pb-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="glass-card rounded-3xl p-6 md:p-8">
              <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                How can we help?
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Query Type</label>
                  <div className="grid grid-cols-1 gap-2">
                    {QUERY_CATEGORIES.map(cat => (
                      <div
                        key={cat.value}
                        className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          supportData.category === cat.value 
                            ? 'border-[#D63031] bg-red-50' 
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                        onClick={() => setSupportData({...supportData, category: cat.value})}
                        data-testid={`query-cat-${cat.value}`}
                      >
                        <h4 className="font-medium text-[#1E3A5F]">{cat.label}</h4>
                        <p className="text-sm text-slate-500">{cat.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                  <Input
                    placeholder="Enter your name"
                    value={supportData.name}
                    onChange={(e) => setSupportData({...supportData, name: e.target.value})}
                    className="input-glass"
                    data-testid="support-name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    value={supportData.email}
                    onChange={(e) => setSupportData({...supportData, email: e.target.value})}
                    className="input-glass"
                    data-testid="support-email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Your Message</label>
                  <Textarea
                    placeholder="Describe your query in detail..."
                    value={supportData.message}
                    onChange={(e) => setSupportData({...supportData, message: e.target.value})}
                    className="min-h-[120px]"
                    data-testid="support-message"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
                <Button variant="ghost" onClick={() => setFlowType(null)} className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </Button>
                <Button
                  onClick={handleSubmitSupport}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                  data-testid="submit-support-btn"
                >
                  {submitting ? 'Submitting...' : 'Submit Query'}
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Learning Flow - Multi-step form
  const renderStep = () => {
    const step = activeSteps[currentStep];
    if (!step) return null;

    switch (step.id) {
      case 'age':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {AGE_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-4 sm:p-5 ${formData.age_group === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('age_group', option.value)}
                data-testid={`age-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1 text-sm sm:text-base">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'skill':
        return (
          <div className="space-y-2 sm:space-y-3">
            {SKILL_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card flex items-center gap-3 sm:gap-4 p-3 sm:p-4 ${formData.skill === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('skill', option.value)}
                data-testid={`skill-${option.value}`}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1E3A5F] mb-0.5 text-sm sm:text-base">{option.label}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'mode':
        return (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {MODE_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card text-center py-6 sm:py-8 px-3 ${formData.learning_mode === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('learning_mode', option.value)}
                data-testid={`mode-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1 text-sm sm:text-base">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'city':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
            {CITIES.map(city => (
              <div
                key={city}
                className={`selection-card text-center py-3 sm:py-4 px-2 ${formData.city === city ? 'selected' : ''}`}
                onClick={() => updateForm('city', city)}
                data-testid={`city-${city.toLowerCase()}`}
              >
                <span className="font-medium text-[#1E3A5F] text-sm sm:text-base">{city}</span>
              </div>
            ))}
          </div>
        );

      case 'goal':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {GOAL_OPTIONS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-4 sm:p-5 ${formData.learning_goal === option.value ? 'selected' : ''}`}
                onClick={() => updateForm('learning_goal', option.value)}
                data-testid={`goal-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] mb-1 text-sm sm:text-base">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
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
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
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

      case 'demo_date':
        return (
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
        );

      case 'demo_time':
        return (
          <div>
            <p className="text-center text-slate-600 mb-4 text-sm sm:text-base">
              Selected: {formData.demo_date ? format(formData.demo_date, 'EEEE, MMMM d') : ''}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {TIME_SLOTS.map(time => (
                <div
                  key={time}
                  className={`p-3 sm:p-4 rounded-xl border-2 text-center cursor-pointer transition-all ${
                    formData.demo_time === time 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => updateForm('demo_time', time)}
                  data-testid={`time-${time.replace(':', '')}`}
                >
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 mx-auto mb-1" />
                  <span className="font-medium text-sm sm:text-base">{time}</span>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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

      <main className="pt-8 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar - Hidden on mobile */}
          <div className="mb-8 hidden sm:block">
            <div className="flex items-center justify-between mb-4">
              {activeSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`step-indicator ${
                    index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending'
                  }`}>
                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  {index < activeSteps.length - 1 && (
                    <div className={`w-full h-1 mx-1 rounded ${
                      index < currentStep ? 'bg-[#1E3A5F]' : 'bg-slate-200'
                    }`} style={{ width: '20px' }} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">
              Step {currentStep + 1} of {activeSteps.length}
            </p>
          </div>
          
          {/* Mobile Step Counter */}
          <div className="mb-4 sm:hidden text-center">
            <span className="text-sm text-slate-500">Step {currentStep + 1} of {activeSteps.length}</span>
          </div>

          {/* Step Card */}
          <div className="glass-card rounded-3xl p-6 md:p-8 animate-fade-in">
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {activeSteps[currentStep]?.title}
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
              
              {currentStep < activeSteps.length - 1 ? (
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
                  onClick={handleSubmitLearning}
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
    </div>
  );
};

export default StudentFunnel;
