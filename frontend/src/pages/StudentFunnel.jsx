import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, BookOpen, MapPin, Target, Mail, HelpCircle, MessageCircle, Send, Building2, Home } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Learning Flow Steps - reordered: city before mode, contact after demo
const LEARNING_STEPS = [
  { id: 'age', title: 'Age Group' },
  { id: 'skill', title: 'What to learn?' },
  { id: 'city', title: 'Your City' },
  { id: 'mode', title: 'Learning Mode' },
  { id: 'select_center', title: 'Select Center' },  // Only shown if offline at center
  { id: 'goal', title: 'Learning Goal' },
  { id: 'demo_date', title: 'Select Date' },
  { id: 'demo_time', title: 'Select Time' },
  { id: 'contact', title: 'Contact Details' },
];

const AGE_OPTIONS = [
  { value: '6-8', label: '6-8 years', description: 'Early learners' },
  { value: '9-12', label: '9-12 years', description: 'Middle school' },
  { value: '13-16', label: '13-16 years', description: 'High school' },
  { value: '17+', label: '17+ years', description: 'Advanced learners' },
];

const SKILL_OPTIONS = [
  { value: 'robotics', label: '🤖 Robotics', description: 'Build and program robots' },
  { value: 'coding', label: '💻 Coding', description: 'Learn programming' },
  { value: 'ai', label: '🧠 AI & Machine Learning', description: 'Explore artificial intelligence' },
  { value: 'entrepreneurship', label: '💡 Entrepreneurship', description: 'Business & innovation' },
  { value: 'financial', label: '💰 Financial Literacy', description: 'Money management skills' },
];

const GOAL_OPTIONS = [
  { value: 'fun', label: '🎮 Fun Learning', description: 'Explore and enjoy' },
  { value: 'competitions', label: '🏆 Competitions', description: 'Prepare for contests' },
  { value: 'career', label: '🚀 Career Exposure', description: 'Future job readiness' },
  { value: 'school', label: '📚 School Support', description: 'Academic enhancement' },
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
  const [searchParams] = useSearchParams();
  const [flowType, setFlowType] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [cities, setCities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [cityHasCenter, setCityHasCenter] = useState(false);
  
  const [formData, setFormData] = useState({
    learner_type: 'self',
    age_group: '',
    skill: '',
    city: '',
    learning_mode: '',
    offline_type: '', // 'home' or 'center'
    selected_center: '', // center id when offline at center
    selected_center_name: '', // center name for display
    address: '', // home address when offline at home
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

  // Handle pre-selected skill from URL (from course pages)
  useEffect(() => {
    const preSelectedSkill = searchParams.get('skill');
    if (preSelectedSkill && SKILL_OPTIONS.find(s => s.value === preSelectedSkill)) {
      setFlowType('learning');
      setFormData(prev => ({ ...prev, skill: preSelectedSkill }));
      // Skip to step after skill selection (city step, index 2)
      setCurrentStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchCitiesAndCenters();
  }, []);

  const fetchCitiesAndCenters = async () => {
    try {
      const [citiesRes, centersRes] = await Promise.all([
        axios.get(`${API}/cities`),
        axios.get(`${API}/centers`)
      ]);
      setCities(citiesRes.data.filter(c => c.is_active));
      setCenters(centersRes.data.filter(c => c.is_active));
    } catch (error) {
      // Fallback to default cities
      setCities([
        { name: 'Mumbai', has_center: false },
        { name: 'Delhi', has_center: false },
        { name: 'Bangalore', has_center: false },
        { name: 'Chennai', has_center: false },
        { name: 'Kolkata', has_center: false },
        { name: 'Hyderabad', has_center: false },
        { name: 'Pune', has_center: false },
        { name: 'Ahmedabad', has_center: false }
      ]);
    }
  };

  // Check if selected city has a center
  useEffect(() => {
    if (formData.city) {
      const hasCenterInCity = centers.some(c => c.city === formData.city);
      setCityHasCenter(hasCenterInCity);
    }
  }, [formData.city, centers]);

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Get active steps - filter based on mode selection
  const activeSteps = LEARNING_STEPS.filter(step => {
    // Only show select_center step if user chose "offline at center"
    if (step.id === 'select_center') {
      return formData.learning_mode === 'offline' && formData.offline_type === 'center';
    }
    return true;
  });

  // Get centers for selected city
  const cityCenters = centers.filter(c => c.city === formData.city);

  const handleNext = () => {
    const step = activeSteps[currentStep];
    
    // Validation
    if (step.id === 'age' && !formData.age_group) {
      toast.error('Please select an age group');
      return;
    }
    if (step.id === 'skill' && !formData.skill) {
      toast.error('Please select what you want to learn');
      return;
    }
    if (step.id === 'city' && !formData.city) {
      toast.error('Please select your city');
      return;
    }
    if (step.id === 'mode' && !formData.learning_mode) {
      toast.error('Please select a learning mode');
      return;
    }
    if (step.id === 'mode' && formData.learning_mode === 'offline' && !formData.offline_type) {
      toast.error('Please select offline learning type');
      return;
    }
    if (step.id === 'select_center' && !formData.selected_center) {
      toast.error('Please select a center');
      return;
    }
    if (step.id === 'goal' && !formData.learning_goal) {
      toast.error('Please select your learning goal');
      return;
    }
    if (step.id === 'demo_date' && !formData.demo_date) {
      toast.error('Please select a demo date');
      return;
    }
    if (step.id === 'demo_time' && !formData.demo_time) {
      toast.error('Please select a time slot');
      return;
    }
    if (step.id === 'contact') {
      if (!formData.name || !formData.phone) {
        toast.error('Please fill all required fields');
        return;
      }
      // Require address if offline at home
      if (formData.learning_mode === 'offline' && formData.offline_type === 'home' && !formData.address) {
        toast.error('Please enter your address');
        return;
      }
      handleSubmit();
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setFlowType(null);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await axios.post(`${API}/students/inquiry`, {
        learner_type: formData.learner_type,
        age_group: formData.age_group,
        skill: formData.skill,
        learning_mode: formData.learning_mode === 'offline' ? `offline_${formData.offline_type}` : 'online',
        city: formData.city,
        learning_goal: formData.learning_goal,
        name: formData.name,
        email: formData.email || `${formData.phone}@oll.student`,
        phone: formData.phone,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        demo_time: formData.demo_time,
        address: formData.address || '',
        selected_center: formData.selected_center || '',
        selected_center_name: formData.selected_center_name || '',
      });
      setSubmitted(true);
      toast.success('Demo booked successfully!');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportData.name || !supportData.email || !supportData.category || !supportData.message) {
      toast.error('Please fill all fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/support/ticket`, supportData);
      setSubmitted(true);
      toast.success('Your query has been submitted!');
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Check if city is in our list
  const isCityInList = cities.some(c => c.name === formData.city);

  // Render step content
  const renderStepContent = () => {
    const step = activeSteps[currentStep];
    
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

      case 'city':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {cities.map(city => (
                <div
                  key={city.name}
                  className={`selection-card text-center py-3 sm:py-4 px-2 ${formData.city === city.name ? 'selected' : ''}`}
                  onClick={() => updateForm('city', city.name)}
                  data-testid={`city-${city.name.toLowerCase()}`}
                >
                  <span className="font-medium text-[#1E3A5F] text-sm sm:text-base">{city.name}</span>
                  {city.has_center && (
                    <span className="block text-xs text-[#D63031] mt-1">Has Center</span>
                  )}
                </div>
              ))}
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-2">Don't see your city?</p>
              <Input
                placeholder="Enter your city"
                value={!isCityInList ? formData.city : ''}
                onChange={(e) => updateForm('city', e.target.value)}
                className="max-w-xs mx-auto"
                data-testid="city-other"
              />
            </div>
          </div>
        );
        
      case 'mode':
        // Check if selected city is in our list
        const showOfflineOptions = cities.some(c => c.name === formData.city);
        
        return (
          <div className="space-y-4">
            {/* Online Option - Always available */}
            <div
              className={`selection-card text-center py-6 sm:py-8 px-3 ${formData.learning_mode === 'online' ? 'selected' : ''}`}
              onClick={() => {
                updateForm('learning_mode', 'online');
                updateForm('offline_type', '');
              }}
              data-testid="mode-online"
            >
              <h3 className="font-semibold text-[#1E3A5F] mb-1 text-sm sm:text-base">🌐 Online Classes</h3>
              <p className="text-xs sm:text-sm text-slate-500">Learn from anywhere via video call</p>
            </div>

            {/* Offline Options - Only if city is in our list */}
            {showOfflineOptions ? (
              <>
                {/* Offline at Home */}
                <div
                  className={`selection-card text-center py-6 sm:py-8 px-3 ${formData.learning_mode === 'offline' && formData.offline_type === 'home' ? 'selected' : ''}`}
                  onClick={() => {
                    updateForm('learning_mode', 'offline');
                    updateForm('offline_type', 'home');
                  }}
                  data-testid="mode-offline-home"
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Home className="w-5 h-5 text-[#1E3A5F]" />
                    <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">Offline at Your Home</h3>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500">Educator comes to your location</p>
                </div>

                {/* Offline at Center - Only if city has center */}
                {cityHasCenter && (
                  <div
                    className={`selection-card text-center py-6 sm:py-8 px-3 ${formData.learning_mode === 'offline' && formData.offline_type === 'center' ? 'selected' : ''}`}
                    onClick={() => {
                      updateForm('learning_mode', 'offline');
                      updateForm('offline_type', 'center');
                    }}
                    data-testid="mode-offline-center"
                  >
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <Building2 className="w-5 h-5 text-[#D63031]" />
                      <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">Offline at OLL Center</h3>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500">Visit our learning center in {formData.city}</p>
                    <Link to="/centers" className="text-xs text-[#D63031] hover:underline mt-1 inline-block">
                      View Center Details →
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-700 text-sm">
                  Offline classes are currently not available in {formData.city || 'your city'}. 
                  You can continue with online classes.
                </p>
              </div>
            )}
          </div>
        );

      case 'select_center':
        return (
          <div className="space-y-3">
            <p className="text-center text-slate-600 mb-4">
              Select an OLL center in {formData.city}
            </p>
            {cityCenters.length > 0 ? (
              cityCenters.map(center => (
                <div
                  key={center.id}
                  className={`selection-card p-4 sm:p-5 ${formData.selected_center === center.id ? 'selected' : ''}`}
                  onClick={() => {
                    updateForm('selected_center', center.id);
                    updateForm('selected_center_name', center.name);
                  }}
                  data-testid={`center-${center.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#D63031]/10 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-[#D63031]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">{center.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{center.area}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{center.address}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
                <p className="text-amber-700 text-sm">
                  No centers available in {formData.city}. Please go back and select a different mode.
                </p>
              </div>
            )}
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

      case 'demo_date':
        return (
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={formData.demo_date}
              onSelect={(date) => updateForm('demo_date', date)}
              disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
              className="rounded-xl border border-slate-200 bg-white p-3"
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

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Your Name *</label>
              <Input
                placeholder="Enter your name"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="input-glass"
                data-testid="contact-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number *</label>
              <Input
                placeholder="Enter phone number"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value)}
                className="input-glass"
                data-testid="contact-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email (Optional)</label>
              <Input
                type="email"
                placeholder="Enter email"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="input-glass"
                data-testid="contact-email"
              />
            </div>
            
            {/* Summary */}
            <div className="bg-slate-50 rounded-xl p-4 mt-6">
              <h4 className="font-medium text-[#1E3A5F] mb-2">Demo Summary</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p>📅 {formData.demo_date ? format(formData.demo_date, 'EEEE, MMMM d, yyyy') : ''} at {formData.demo_time}</p>
                <p>📍 {formData.learning_mode === 'online' ? 'Online' : `Offline ${formData.offline_type === 'center' ? 'at OLL Center' : 'at Home'}`} in {formData.city}</p>
                <p>📚 {SKILL_OPTIONS.find(s => s.value === formData.skill)?.label}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Success Screen
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 md:p-12 max-w-lg w-full text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            {flowType === 'learn' ? 'Demo Booked!' : 'Query Submitted!'}
          </h2>
          <p className="text-slate-600 mb-6">
            {flowType === 'learn' 
              ? `Your demo is scheduled for ${formData.demo_date ? format(formData.demo_date, 'MMMM d') : ''} at ${formData.demo_time}. We'll send you a confirmation shortly.`
              : 'Our team will get back to you within 24 hours.'
            }
          </p>
          <Button onClick={() => navigate('/')} className="btn-primary w-full" data-testid="back-to-home-btn">
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Initial Flow Selection
  if (!flowType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
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
              <div className="flex items-center gap-4">
                <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">
                  Centers
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
          </div>
        </header>

        <main className="flex-1 pt-24 pb-8 px-4">
          <div className="max-w-lg mx-auto">
            <h1 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
              How can we help you?
            </h1>

            <div className="space-y-4">
              <div
                className="selection-card p-6 cursor-pointer"
                onClick={() => setFlowType('learn')}
                data-testid="learn-skill-option"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#D63031]/10 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-[#D63031]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#1E3A5F] text-lg">I want to learn a skill</h2>
                    <p className="text-slate-500 text-sm">Book a free demo class</p>
                  </div>
                </div>
              </div>

              <div
                className="selection-card p-6 cursor-pointer"
                onClick={() => setFlowType('support')}
                data-testid="support-option"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center">
                    <MessageCircle className="w-7 h-7 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-[#1E3A5F] text-lg">I have a question</h2>
                    <p className="text-slate-500 text-sm">Get support from our team</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <footer className="bg-[#1E3A5F] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
              <Link to="/about" className="hover:text-white">About OLL</Link>
              <Link to="/centers" className="hover:text-white">Our Centers</Link>
              <Link to="/faq" className="hover:text-white">FAQs</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Support Flow
  if (flowType === 'support') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
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
            </div>
          </div>
        </header>

        <main className="flex-1 pt-24 pb-8 px-4">
          <div className="max-w-lg mx-auto">
            <button 
              onClick={() => setFlowType(null)}
              className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              How can we help?
            </h1>

            <form onSubmit={handleSupportSubmit} className="glass-card rounded-2xl p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Name</label>
                <Input
                  placeholder="Enter your name"
                  value={supportData.name}
                  onChange={(e) => setSupportData({...supportData, name: e.target.value})}
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
                  data-testid="support-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {QUERY_CATEGORIES.map(cat => (
                    <div
                      key={cat.value}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all text-center ${
                        supportData.category === cat.value
                          ? 'border-[#D63031] bg-red-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSupportData({...supportData, category: cat.value})}
                    >
                      <span className="text-sm font-medium text-[#1E3A5F]">{cat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Your Question</label>
                <Textarea
                  placeholder="Describe your query..."
                  value={supportData.message}
                  onChange={(e) => setSupportData({...supportData, message: e.target.value})}
                  className="min-h-[120px]"
                  data-testid="support-message"
                />
              </div>
              <Button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Submitting...' : 'Submit Query'}
              </Button>
            </form>
          </div>
        </main>

        <footer className="bg-[#1E3A5F] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
              <Link to="/about" className="hover:text-white">About OLL</Link>
              <Link to="/centers" className="hover:text-white">Our Centers</Link>
              <Link to="/faq" className="hover:text-white">FAQs</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Learning Flow
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
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
            <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors text-sm">
              View Centers
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20 pb-8 px-4">
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

          <div className="glass-card rounded-3xl p-6 md:p-8 animate-slide-up">
            <h2 className="text-xl md:text-2xl font-bold text-[#1E3A5F] mb-6 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {activeSteps[currentStep].title}
            </h2>
            
            {renderStepContent()}

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-200">
              <Button
                variant="ghost"
                onClick={handleBack}
                className="flex items-center gap-2"
                data-testid="back-btn"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
                data-testid="next-btn"
              >
                {activeSteps[currentStep].id === 'contact' 
                  ? (submitting ? 'Booking...' : 'Book Demo')
                  : 'Continue'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#1E3A5F] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
            <Link to="/about" className="hover:text-white">About OLL</Link>
            <Link to="/centers" className="hover:text-white">Our Centers</Link>
            <Link to="/faq" className="hover:text-white">FAQs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentFunnel;
