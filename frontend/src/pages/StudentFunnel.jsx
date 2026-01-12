import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Calendar, Clock, BookOpen, MapPin, HelpCircle, MessageCircle, Building2, Home, Phone, Shield, Eye } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import axios from 'axios';
import SupportFlow from './SupportFlow';
import { useUserAuth } from '../context/UserAuthContext';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SKILL_OPTIONS = [
  { value: 'robotics', label: 'Robotics', icon: '🤖' },
  { value: 'coding', label: 'Coding', icon: '💻' },
  { value: 'ai', label: 'Artificial Intelligence', icon: '🧠' },
  { value: 'entrepreneurship', label: 'Entrepreneurship', icon: '💡' },
  { value: 'financial', label: 'Financial Literacy', icon: '📊' },
];

const AGE_OPTIONS = [
  { value: '6-9', label: '6-9 years', description: 'Foundation Level' },
  { value: '10-14', label: '10-14 years', description: 'Intermediate Level' },
  { value: '15-18', label: '15-18 years', description: 'Advanced Level' },
  { value: '18+', label: '18+ years', description: 'Adult Learners' },
];

const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const StudentFunnel = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { sendOTP, verifyOTP, updateUserBooking } = useUserAuth();
  
  const [flowType, setFlowType] = useState(null); // null, 'learn', 'support'
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
  const [centers, setCenters] = useState([]);
  const [bookingData, setBookingData] = useState(null);
  const [cameFromCoursePage, setCameFromCoursePage] = useState(false);
  
  // OTP State
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    age_group: '',
    skill: '',
    city: '',
    learning_mode: '',
    offline_type: '', // 'center' or 'home'
    selected_center: '',
    selected_center_name: '',
    demo_date: null,
    demo_time: '',
    name: '',
    phone: '',
    address: '',
  });

  // Check for pre-selected skill from URL params (coming from course page)
  useEffect(() => {
    const skillParam = searchParams.get('skill');
    if (skillParam && SKILL_OPTIONS.find(s => s.value === skillParam)) {
      setFlowType('learn');
      setFormData(prev => ({ ...prev, skill: skillParam }));
      setCameFromCoursePage(true);
      // Start from age step (step 2 in 0-indexed, which is step 3 in display) since skill is pre-selected
      // Skip both skill (step 0) and action (step 1) steps - go directly to age group
      setCurrentStep(2);
    }
  }, [searchParams]);

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      try {
        const response = await axios.get(`${API}/cities`);
        setCities(response.data.filter(c => c.is_active));
      } catch (error) {
        console.error('Failed to fetch cities');
      }
    };
    fetchCities();
  }, []);

  // Fetch centers when city changes and mode is "center"
  useEffect(() => {
    const fetchCenters = async () => {
      if (formData.city && formData.offline_type === 'center') {
        try {
          const response = await axios.get(`${API}/centers/by-city/${formData.city}`);
          setCenters(response.data);
        } catch (error) {
          console.error('Failed to fetch centers');
        }
      }
    };
    fetchCenters();
  }, [formData.city, formData.offline_type]);

  // Dynamic steps - SKILL FIRST, then AGE, then ACTION CHOICE (removed learner type)
  const getActiveSteps = () => {
    const steps = [
      { id: 'skill', title: 'Choose a Skill' },
      { id: 'action', title: 'What would you like to do?' },
      { id: 'age', title: 'Select Age Group' },
      { id: 'mode', title: 'Learning Mode' },
    ];
    
    // Add city selection only if offline is selected
    if (formData.learning_mode === 'offline') {
      steps.push({ id: 'city', title: 'Select City' });
      
      // Add center selection step if offline at center
      if (formData.offline_type === 'center' && centers.length > 0) {
        steps.push({ id: 'center', title: 'Select Center' });
      }
    }
    
    steps.push(
      { id: 'schedule', title: 'Schedule Demo' },
      { id: 'contact', title: 'Contact Details' },
      { id: 'otp', title: 'Verify Phone' }
    );
    
    return steps;
  };

  const activeSteps = getActiveSteps();

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Auto-advance for single selection questions
  const handleSingleSelect = (field, value) => {
    updateForm(field, value);
    // Small delay for visual feedback before advancing
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 200);
  };

  const handleSendOTP = async () => {
    if (!formData.phone || formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setOtpLoading(true);
    try {
      const response = await axios.post(`${API}/auth/send-otp`, {
        phone: formData.phone,
        user_type: 'student'
      });
      setOtpSent(true);
      toast.success('OTP sent! Use 1111 for testing');
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyAndSubmit = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Please enter the OTP');
      return;
    }
    
    setSubmitting(true);
    try {
      // First verify OTP using context (this sets the user session)
      const otpResult = await verifyOTP(formData.phone, otp, 'student');
      
      if (!otpResult.success) {
        toast.error(otpResult.message || 'Invalid OTP');
        setSubmitting(false);
        return;
      }
      
      // OTP verified and user is now logged in, submit the inquiry
      const payload = {
        learner_type: 'self', // Default since we removed the selection
        age_group: formData.age_group,
        skill: formData.skill,
        city: formData.city,
        learning_mode: formData.learning_mode === 'online' 
          ? 'online' 
          : formData.offline_type === 'center' 
            ? 'offline_center' 
            : 'offline_home',
        learning_goal: 'general',
        name: formData.name,
        email: `${formData.phone}@student.oll`, // Auto-generate email from phone
        phone: formData.phone,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        demo_time: formData.demo_time,
        source: 'website'
      };
      
      const response = await axios.post(`${API}/students/inquiry`, payload);
      
      // Store booking data for success screen
      setBookingData({
        ...response.data,
        skill_label: SKILL_OPTIONS.find(s => s.value === formData.skill)?.label,
        formatted_date: formData.demo_date ? format(formData.demo_date, 'EEEE, MMMM d, yyyy') : '',
        demo_time: formData.demo_time,
        learning_mode: formData.learning_mode,
        offline_type: formData.offline_type,
        city: formData.city,
        center_name: formData.selected_center_name
      });
      
      // Update user booking in context (user is already logged in from verifyOTP)
      updateUserBooking({ ...response.data, name: formData.name });
      
      setSubmitted(true);
      toast.success('Demo booked successfully!');
    } catch (error) {
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to complete booking');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const validateStep = () => {
    const stepId = activeSteps[currentStep].id;
    switch (stepId) {
      case 'skill':
        return formData.skill;
      case 'action':
        return true; // Action step auto-advances
      case 'age':
        return formData.age_group;
      case 'city':
        return formData.city;
      case 'mode':
        if (formData.learning_mode === 'offline') {
          return formData.offline_type;
        }
        return formData.learning_mode;
      case 'center':
        return formData.selected_center;
      case 'schedule':
        return formData.demo_date && formData.demo_time;
      case 'contact':
        return formData.name && formData.phone && formData.phone.length >= 10;
      case 'otp':
        return otp.length >= 4;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) {
      toast.error('Please complete all fields');
      return;
    }

    const stepId = activeSteps[currentStep].id;
    
    // If on contact step, move to OTP step and send OTP
    if (stepId === 'contact') {
      setCurrentStep(currentStep + 1);
      // Auto-send OTP
      handleSendOTP();
      return;
    }
    
    // If on OTP step, verify and submit
    if (stepId === 'otp') {
      await handleVerifyAndSubmit();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep === 0) {
      setFlowType(null);
      setCameFromCoursePage(false);
    } else {
      // Reset OTP state when going back from OTP step
      if (activeSteps[currentStep].id === 'otp') {
        setOtpSent(false);
        setOtp('');
      }
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle skill selection - simple advance (no modal)
  const handleSkillSelect = (skill) => {
    updateForm('skill', skill.value);
    setTimeout(() => setCurrentStep(prev => prev + 1), 200);
  };

  // Handle action choice - book demo or see details
  const handleActionChoice = (action) => {
    if (action === 'details') {
      // Navigate to course details page
      navigate(`/courses/${formData.skill}`);
    } else {
      // Book demo - continue with funnel
      setTimeout(() => setCurrentStep(prev => prev + 1), 200);
    }
  };

  const renderStepContent = () => {
    const stepId = activeSteps[currentStep].id;
    
    switch (stepId) {
      case 'skill':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SKILL_OPTIONS.map((skill) => (
              <div
                key={skill.value}
                className={`selection-card p-4 cursor-pointer ${formData.skill === skill.value ? 'selected' : ''}`}
                onClick={() => handleSkillSelect(skill)}
                data-testid={`skill-${skill.value}`}
              >
                <div className="text-3xl mb-2">{skill.icon}</div>
                <div className="font-semibold">{skill.label}</div>
              </div>
            ))}
          </div>
        );

      case 'action':
        const selectedSkill = SKILL_OPTIONS.find(s => s.value === formData.skill);
        return (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <div className="text-4xl mb-3">{selectedSkill?.icon}</div>
              <h3 className="text-xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                {selectedSkill?.label}
              </h3>
              <p className="text-slate-500 text-sm mt-1">What would you like to do?</p>
            </div>
            
            <div className="space-y-3">
              <div
                className="selection-card p-5 cursor-pointer flex items-center justify-between"
                onClick={() => handleActionChoice('details')}
                data-testid="action-see-details"
              >
                <div className="flex items-center gap-3">
                  <Eye className="w-5 h-5 text-[#1E3A5F]" />
                  <span className="font-medium">See Course Details</span>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </div>
              
              <div
                className="selection-card p-5 cursor-pointer flex items-center justify-between bg-[#1E3A5F]/5 border-[#1E3A5F]/30"
                onClick={() => handleActionChoice('book')}
                data-testid="action-book-demo"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#1E3A5F]" />
                  <span className="font-medium text-[#1E3A5F]">Book Free Demo</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#1E3A5F]" />
              </div>
            </div>
          </div>
        );

      case 'age':
        return (
          <div className="grid grid-cols-2 gap-3">
            {AGE_OPTIONS.map((age) => (
              <div
                key={age.value}
                className={`selection-card p-4 cursor-pointer ${formData.age_group === age.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('age_group', age.value)}
                data-testid={`age-${age.value}`}
              >
                <div className="font-semibold text-[#1E3A5F]">{age.label}</div>
                <div className="text-xs text-slate-500 mt-1">{age.description}</div>
              </div>
            ))}
          </div>
        );

      case 'mode':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div
                className={`selection-card p-5 cursor-pointer ${formData.learning_mode === 'online' ? 'selected' : ''}`}
                onClick={() => {
                  updateForm('learning_mode', 'online');
                  updateForm('offline_type', '');
                  updateForm('city', ''); // Clear city for online
                  // Auto-advance for online selection - skip city step
                  setTimeout(() => setCurrentStep(prev => prev + 1), 200);
                }}
                data-testid="mode-online"
              >
                <div className="text-3xl mb-2">💻</div>
                <div className="font-semibold">Online Classes</div>
                <div className="text-xs text-slate-500 mt-1">Learn from anywhere</div>
              </div>
              <div
                className={`selection-card p-5 cursor-pointer ${formData.learning_mode === 'offline' ? 'selected' : ''}`}
                onClick={() => updateForm('learning_mode', 'offline')}
                data-testid="mode-offline"
              >
                <div className="text-3xl mb-2">🏫</div>
                <div className="font-semibold">Offline Classes</div>
                <div className="text-xs text-slate-500 mt-1">In-person learning</div>
              </div>
            </div>

            {formData.learning_mode === 'offline' && (
              <div className="mt-6 pt-6 border-t border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">Where would you like to learn?</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    className={`selection-card p-4 cursor-pointer ${formData.offline_type === 'center' ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect('offline_type', 'center')}
                    data-testid="offline-center"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-6 h-6 text-[#1E3A5F]" />
                      <div>
                        <div className="font-medium">At OLL Center</div>
                        <div className="text-xs text-slate-500">Visit our learning center</div>
                      </div>
                    </div>
                  </div>
                  <div
                    className={`selection-card p-4 cursor-pointer ${formData.offline_type === 'home' ? 'selected' : ''}`}
                    onClick={() => handleSingleSelect('offline_type', 'home')}
                    data-testid="offline-home"
                  >
                    <div className="flex items-center gap-3">
                      <Home className="w-6 h-6 text-[#1E3A5F]" />
                      <div>
                        <div className="font-medium">At My Home</div>
                        <div className="text-xs text-slate-500">Educator visits you</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'city':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-2">Select your city for offline classes</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {cities.map((city) => (
                <div
                  key={city.id}
                  className={`selection-card p-3 cursor-pointer ${formData.city === city.name ? 'selected' : ''}`}
                  onClick={() => handleSingleSelect('city', city.name)}
                  data-testid={`city-${city.name.toLowerCase()}`}
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="font-medium text-sm">{city.name}</span>
                  </div>
                  {city.has_center && (
                    <div className="text-xs text-green-600 mt-1">Has Center</div>
                  )}
                </div>
              ))}
            </div>
            {cities.length === 0 && (
              <p className="text-center text-slate-500 py-4">Loading cities...</p>
            )}
          </div>
        );

      case 'center':
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 mb-4">Select a center in {formData.city}</p>
            <div className="space-y-3">
              {centers.map((center) => (
                <div
                  key={center.id}
                  className={`selection-card p-4 cursor-pointer ${formData.selected_center === center.id ? 'selected' : ''}`}
                  onClick={() => {
                    updateForm('selected_center', center.id);
                    updateForm('selected_center_name', center.name);
                    // Auto-advance after center selection
                    setTimeout(() => setCurrentStep(prev => prev + 1), 200);
                  }}
                  data-testid={`center-${center.id}`}
                >
                  <div className="font-semibold text-[#1E3A5F]">{center.name}</div>
                  <div className="text-sm text-slate-600 mt-1">{center.area}</div>
                  <div className="text-xs text-slate-500 mt-1">{center.address}</div>
                </div>
              ))}
            </div>
            {centers.length === 0 && (
              <p className="text-center text-slate-500 py-4">No centers available in this city. Please select &quot;At My Home&quot; option.</p>
            )}
          </div>
        );

      case 'schedule':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Date</label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={formData.demo_date}
                  onSelect={(date) => updateForm('demo_date', date)}
                  disabled={(date) => 
                    isBefore(date, startOfDay(new Date())) || 
                    date > addDays(new Date(), 30) ||
                    date.getDay() === 0
                  }
                  className="rounded-xl border shadow-sm"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Select Time</label>
              <div className="grid grid-cols-4 gap-2">
                {TIME_SLOTS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`p-3 rounded-xl border-2 transition-all ${
                      formData.demo_time === time
                        ? 'border-[#D63031] bg-red-50 text-[#D63031]'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                    onClick={() => updateForm('demo_time', time)}
                    data-testid={`time-${time}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
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
                data-testid="contact-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                WhatsApp Number
              </label>
              <Input
                type="tel"
                placeholder="Enter 10-digit number"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-glass"
                data-testid="contact-phone"
              />
              <p className="text-xs text-slate-500 mt-1">OTP will be sent to this number for verification</p>
            </div>
            
            {formData.offline_type === 'home' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Home Address <span className="text-slate-400 font-normal">(for home visit)</span>
                </label>
                <Textarea
                  placeholder="Enter your complete address including landmark, city, and pincode"
                  value={formData.address}
                  onChange={(e) => updateForm('address', e.target.value)}
                  className="input-glass min-h-[80px]"
                  data-testid="contact-address"
                />
              </div>
            )}
          </div>
        );

      case 'otp':
        return (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-[#1E3A5F] mb-1">Verify Your Number</h3>
              <p className="text-slate-500 text-xs sm:text-sm">
                OTP sent to <strong>{formData.phone}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Input
                  type="text"
                  placeholder="••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-xl sm:text-2xl text-center tracking-widest py-4 max-w-[160px] sm:max-w-[180px] mx-auto"
                  maxLength={4}
                  data-testid="otp-input"
                />
                <p className="text-xs text-slate-400 mt-2">
                  Use <strong>1111</strong> for testing
                </p>
              </div>

              {/* Confirm Button - Right below OTP input */}
              <Button
                onClick={handleVerifyAndSubmit}
                disabled={submitting || otp.length < 4}
                className="w-full max-w-[200px] mx-auto bg-[#D63031] hover:bg-[#b52828]"
                data-testid="confirm-booking-btn"
              >
                {submitting ? 'Confirming...' : 'Confirm Booking'}
              </Button>

              <button
                type="button"
                onClick={handleSendOTP}
                disabled={otpLoading}
                className="text-xs sm:text-sm text-[#D63031] hover:underline"
              >
                {otpLoading ? 'Sending...' : 'Resend OTP'}
              </button>
            </div>

            {/* Demo Summary Preview - Compact */}
            <div className="bg-slate-50 rounded-xl p-3 text-left mt-4">
              <h4 className="font-medium text-[#1E3A5F] mb-2 text-xs">Booking Summary</h4>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">{formData.demo_date ? format(formData.demo_date, 'EEE, MMM d') : ''} at {formData.demo_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="truncate">
                    {formData.learning_mode === 'online' 
                      ? 'Online' 
                      : formData.offline_type === 'center' 
                        ? `${formData.selected_center_name || 'Center'}, ${formData.city}` 
                        : `Home, ${formData.city}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span>{SKILL_OPTIONS.find(s => s.value === formData.skill)?.label}</span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Success Screen with Booking Details and Reschedule Option
  if (submitted && bookingData) {
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
              <Link 
                to="/my-bookings"
                className="text-[#D63031] hover:underline text-sm font-medium"
              >
                View My Bookings
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
          <div className="glass-card rounded-3xl p-8 md:p-12 max-w-lg w-full animate-slide-up">
            {/* Success Icon */}
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Demo Booked!
            </h2>
            <p className="text-slate-500 text-center mb-8">
              We&apos;ll send you a confirmation on WhatsApp
            </p>

            {/* Booking Details Card */}
            <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] rounded-2xl p-6 text-white mb-6">
              <h3 className="font-semibold text-lg mb-4">{bookingData.skill_label} Demo</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 opacity-80" />
                  <span>{bookingData.formatted_date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 opacity-80" />
                  <span>{bookingData.demo_time}</span>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 opacity-80" />
                  <span>
                    {bookingData.learning_mode === 'online' 
                      ? 'Online Class' 
                      : bookingData.offline_type === 'center' 
                        ? `${bookingData.center_name || 'OLL Center'}, ${bookingData.city}` 
                        : `At Home, ${bookingData.city}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/my-bookings')}
                className="w-full bg-[#D63031] hover:bg-[#b52828]"
                data-testid="view-bookings-btn"
              >
                View & Manage Bookings
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')} 
                className="w-full border-slate-300"
                data-testid="back-to-home-btn"
              >
                Back to Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-center text-sm text-slate-500 mt-6">
              Need to reschedule? <Link to="/my-bookings" className="text-[#D63031] hover:underline">Manage your booking</Link>
            </p>
          </div>
        </main>

        <footer className="bg-[#1E3A5F] mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
              <Link to="/about" className="hover:text-white">About OLL</Link>
              <Link to="/centers" className="hover:text-white">Our Centers</Link>
              <Link to="/blogs" className="hover:text-white">Blog</Link>
              <Link to="/faq" className="hover:text-white">FAQs</Link>
            </div>
          </div>
        </footer>
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
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm"
                  data-testid="funnel-login-btn"
                >
                  Login
                </Button>
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
                    <h2 className="font-semibold text-[#1E3A5F] text-lg">I have a query / need support</h2>
                    <p className="text-slate-500 text-sm">Get help from our team</p>
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
              <Link to="/blogs" className="hover:text-white">Blog</Link>
              <Link to="/faq" className="hover:text-white">FAQs</Link>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Support Flow - using SupportFlow component for all queries
  if (flowType === 'support') {
    return <SupportFlow onBack={() => setFlowType(null)} />;
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
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/login')}
                className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm"
              >
                Login
              </Button>
              <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors text-sm">
                View Centers
              </Link>
            </div>
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
              {/* Hide Continue button on OTP and action steps since they have their own navigation */}
              {activeSteps[currentStep].id !== 'otp' && activeSteps[currentStep].id !== 'action' && (
                <Button
                  onClick={handleNext}
                  disabled={submitting || otpLoading}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-btn"
                >
                  {activeSteps[currentStep].id === 'contact'
                    ? 'Verify Phone'
                    : 'Continue'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-[#1E3A5F] mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex justify-center gap-6 text-sm text-white/80">
            <Link to="/about" className="hover:text-white">About OLL</Link>
            <Link to="/centers" className="hover:text-white">Our Centers</Link>
            <Link to="/blogs" className="hover:text-white">Blog</Link>
            <Link to="/faq" className="hover:text-white">FAQs</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StudentFunnel;
