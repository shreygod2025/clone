import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
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
import PhoneInput from '../components/PhoneInput';

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
  { value: 'young_adult', label: 'Young Adult (18-25)', description: 'Career Starters' },
  { value: 'homemaker', label: 'Homemaker', description: 'Life Skills & Upskilling' },
  { value: 'working_professional', label: 'Working Professional', description: 'Career Advancement' },
  { value: 'senior_citizen', label: 'Senior Citizen', description: 'Lifelong Learning' },
];

// Learning goals based on age group
const LEARNING_GOALS = {
  '6-9': [
    { value: 'regular_classes', label: 'Regular Weekly Classes' },
    { value: 'certification', label: 'Certification Courses' },
    { value: 'project_support', label: 'Project Support & Guidance' },
    { value: 'competition_prep', label: 'Competition Preparation' },
    { value: 'fun_learning', label: 'Fun & Interactive Learning' },
  ],
  '10-14': [
    { value: 'regular_classes', label: 'Regular Weekly Classes' },
    { value: 'certification', label: 'Certification Courses' },
    { value: 'project_support', label: 'Project / Assignment Support' },
    { value: 'competition_prep', label: 'Competition Preparation' },
    { value: 'resume_building', label: 'Resume / Portfolio Building' },
  ],
  '15-18': [
    { value: 'regular_classes', label: 'Regular Weekly Classes' },
    { value: 'certification', label: 'Certification Courses' },
    { value: 'project_support', label: 'Project / Research Support' },
    { value: 'competition_prep', label: 'Olympiad & Competition Prep' },
    { value: 'resume_building', label: 'Resume / College Application' },
  ],
  'young_adult': [
    { value: 'regular_classes', label: 'Skill Development Classes' },
    { value: 'certification', label: 'Professional Certification' },
    { value: 'project_support', label: 'Project / Portfolio Building' },
    { value: 'job_skills', label: 'Job-Ready Skills' },
    { value: 'freelancing', label: 'Freelancing & Side Income' },
  ],
  'homemaker': [
    { value: 'regular_classes', label: 'Regular Learning Classes' },
    { value: 'certification', label: 'Certification Courses' },
    { value: 'digital_literacy', label: 'Digital Literacy' },
    { value: 'income_generation', label: 'Generate Additional Income' },
    { value: 'child_support', label: 'Help Children with Studies' },
  ],
  'working_professional': [
    { value: 'regular_classes', label: 'Weekend/Evening Classes' },
    { value: 'certification', label: 'Professional Certification' },
    { value: 'career_switch', label: 'Career Switch to Tech' },
    { value: 'ai_skills', label: 'Learn AI & Automation' },
    { value: 'upskilling', label: 'Upskill for Promotions' },
  ],
  'senior_citizen': [
    { value: 'regular_classes', label: 'Regular Learning Sessions' },
    { value: 'digital_literacy', label: 'Digital Literacy' },
    { value: 'stay_updated', label: 'Stay Updated with Technology' },
    { value: 'connect_family', label: 'Connect with Family Online' },
    { value: 'new_hobby', label: 'Learn Something New' },
  ],
};

// Time slots organized by time of day
const TIME_SLOT_GROUPS = {
  morning: {
    label: 'Morning',
    sublabel: '9 AM - 12 PM',
    slots: ['09:00', '10:00', '11:00', '12:00']
  },
  afternoon: {
    label: 'Afternoon', 
    sublabel: '1 PM - 5 PM',
    slots: ['13:00', '14:00', '15:00', '16:00', '17:00']
  },
  evening: {
    label: 'Evening',
    sublabel: '6 PM - 9 PM', 
    slots: ['18:00', '19:00', '20:00', '21:00']
  }
};

const formatTimeDisplay = (time) => {
  const hour = parseInt(time.split(':')[0]);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:00 ${ampm}`;
};

const StudentFunnel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { sendOTP, verifyOTP, updateUserBooking, isLoggedIn, user } = useUserAuth();
  
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
  const [otpSentViaWhatsApp, setOtpSentViaWhatsApp] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    age_group: '',
    learning_goal: '',
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
    countryCode: '+91',
    address: '',
    address_line2: '', // apartment/building number
    address_landmark: '', // additional comments/landmark
  });
  
  // Address search state
  const [addressSearch, setAddressSearch] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [searchingAddress, setSearchingAddress] = useState(false);
  
  // Booking confirmation animation state
  const [showBookingAnimation, setShowBookingAnimation] = useState(false);

  // Pre-fill form data for logged-in users
  useEffect(() => {
    if (isLoggedIn && user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        phone: user.phone || prev.phone,
        age_group: user.age_group || prev.age_group,
      }));
    }
  }, [isLoggedIn, user]);

  // Check for pre-selected skill from URL params (coming from course page)
  useEffect(() => {
    const skillParam = searchParams.get('skill');
    const supportParam = searchParams.get('support');
    
    // Auto-open support flow if coming from bookings page via state or query param
    if (supportParam === 'true' || location.state?.openSupport) {
      setFlowType('support');
      return;
    }
    
    if (skillParam && SKILL_OPTIONS.find(s => s.value === skillParam)) {
      setFlowType('learn');
      setFormData(prev => ({ ...prev, skill: skillParam }));
      setCameFromCoursePage(true);
      // For logged-in users with age_group, skip to mode step (step 3)
      // For non-logged-in or users without age_group, go to age step (step 2)
      if (isLoggedIn && user?.age_group) {
        setCurrentStep(3); // Go to mode selection
      } else {
        setCurrentStep(2); // Go to age group selection
      }
    }
  }, [searchParams, isLoggedIn, user, location.state]);

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

  // Dynamic steps - SKILL FIRST, then AGE, GOAL, MODE, SCHEDULE, then PHONE/OTP at end
  const getActiveSteps = () => {
    const steps = [
      { id: 'skill', title: 'Choose a Skill' },
      { id: 'action', title: 'What would you like to do?' },
      { id: 'age', title: 'Select Age Group' },
      { id: 'learning_goal', title: 'Your Learning Goal' },
      { id: 'mode', title: 'Learning Mode' },
    ];
    
    // Add city selection only if offline is selected
    if (formData.learning_mode === 'offline') {
      steps.push({ id: 'city', title: 'Select City' });
      
      // Add center selection step if offline at center
      if (formData.offline_type === 'center' && centers.length > 0) {
        steps.push({ id: 'center', title: 'Select Center' });
      }
      
      // Add address step if offline at home
      if (formData.offline_type === 'home') {
        steps.push({ id: 'address', title: 'Your Address' });
      }
    }
    
    steps.push({ id: 'schedule', title: 'Schedule Demo' });
    
    // Only add phone, name, and OTP steps if user is NOT logged in
    if (!isLoggedIn) {
      steps.push(
        { id: 'phone', title: 'Your Phone Number' },
        { id: 'name', title: 'Your Name' },
        { id: 'otp', title: 'Verify & Confirm' }
      );
    }
    
    return steps;
  };

  const activeSteps = getActiveSteps();
  
  // Guard against accessing invalid step index
  const currentStepData = activeSteps[currentStep] || activeSteps[activeSteps.length - 1];

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
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }
    
    setOtpLoading(true);
    try {
      // Send phone with country code
      const fullPhone = formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;
      const response = await axios.post(`${API}/auth/send-otp`, {
        phone: fullPhone,
        user_type: 'student'
      });
      setOtpSent(true);
      setOtpSentViaWhatsApp(response.data.sent === true);
      // Show appropriate message based on whether OTP was actually sent
      if (response.data.sent) {
        toast.success('OTP sent to your WhatsApp! Valid for 10 minutes.');
      } else {
        toast.error('Failed to send OTP. Please try again.');
      }
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
    
    // Show booking animation immediately
    setShowBookingAnimation(true);
    setSubmitting(true);
    
    try {
      // Use full phone with country code
      const fullPhone = formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;
      
      // First verify OTP using context (this sets the user session)
      const otpResult = await verifyOTP(fullPhone, otp, 'student');
      
      if (!otpResult.success) {
        toast.error(otpResult.message || 'Invalid OTP');
        setSubmitting(false);
        setShowBookingAnimation(false);
        return;
      }
      
      // Use name from form if provided, otherwise from user record, or generate placeholder
      const userName = formData.name || otpResult.user?.name || `Student ${formData.phone.slice(-4)}`;
      
      // Build full address for home visits
      let fullAddress = formData.address;
      if (formData.address_line2) {
        fullAddress += `, ${formData.address_line2}`;
      }
      if (formData.address_landmark) {
        fullAddress += ` (${formData.address_landmark})`;
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
        learning_goal: formData.learning_goal || 'general',
        name: userName,
        email: `${formData.phone}@student.oll`, // Auto-generate email from phone
        phone: fullPhone,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        demo_time: formData.demo_time,
        address: fullAddress,
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
        center_name: formData.selected_center_name,
        address: fullAddress
      });
      
      // Update user booking in context (user is already logged in from verifyOTP)
      updateUserBooking({ ...response.data, name: formData.name });
      
      // Small delay to show the checkmark animation completing
      setTimeout(() => {
        setShowBookingAnimation(false);
        setSubmitted(true);
        toast.success('Demo booked successfully!');
      }, 1500);
    } catch (error) {
      setShowBookingAnimation(false);
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
    const stepId = currentStepData?.id;
    if (!stepId) return true;
    
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
      case 'address':
        return formData.address; // Main address is required
      case 'schedule':
        return formData.demo_date && formData.demo_time;
      case 'phone':
        return formData.phone && formData.phone.length >= 10;
      case 'name':
        return formData.name && formData.name.trim().length >= 2;
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

    const stepId = currentStepData?.id;
    if (!stepId) return;
    
    // If logged in and on schedule step, submit directly (no contact/OTP needed)
    if (isLoggedIn && stepId === 'schedule') {
      await handleSubmitForLoggedInUser();
      return;
    }
    
    // If on phone step, auto-send OTP and move to name step
    if (stepId === 'phone') {
      handleSendOTP(); // Send OTP in background
      setCurrentStep(currentStep + 1);
      return;
    }
    
    // If on name step, move to OTP step
    if (stepId === 'name') {
      setCurrentStep(currentStep + 1);
      return;
    }
    
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

  // Submit booking for logged-in users (no OTP needed) - called from schedule step
  const handleBookForLoggedInUser = async () => {
    setShowBookingAnimation(true);
    setSubmitting(true);
    try {
      // Build full address for home visits
      let fullAddress = formData.address;
      if (formData.address_line2) {
        fullAddress += `, ${formData.address_line2}`;
      }
      if (formData.address_landmark) {
        fullAddress += ` (${formData.address_landmark})`;
      }
      
      const payload = {
        learner_type: 'self',
        age_group: formData.age_group,
        skill: formData.skill,
        city: formData.city,
        learning_mode: formData.learning_mode === 'online' 
          ? 'online' 
          : formData.offline_type === 'center' 
            ? 'offline_center' 
            : 'offline_home',
        learning_goal: formData.learning_goal || 'general',
        name: user?.name || formData.name,
        email: `${user?.phone || formData.phone}@student.oll`,
        phone: user?.phone || formData.phone,
        demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        demo_time: formData.demo_time,
        address: fullAddress,
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
        center_name: formData.selected_center_name,
        address: fullAddress
      });
      
      // Update user booking in context
      updateUserBooking({ ...response.data, name: user?.name || formData.name });
      
      // Small delay to show the checkmark animation
      setTimeout(() => {
        setShowBookingAnimation(false);
        setSubmitted(true);
        toast.success('Demo booked successfully!');
      }, 1500);
    } catch (error) {
      setShowBookingAnimation(false);
      if (error.response?.data?.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error('Failed to complete booking');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Legacy function - keep for backward compatibility
  const handleSubmitForLoggedInUser = async () => {
    setSubmitting(true);
    try {
      const payload = {
        learner_type: 'self',
        age_group: formData.age_group,
        skill: formData.skill,
        city: formData.city,
        learning_mode: formData.learning_mode === 'online' 
          ? 'online' 
          : formData.offline_type === 'center' 
            ? 'offline_center' 
            : 'offline_home',
        learning_goal: 'general',
        name: user?.name || formData.name,
        email: `${user?.phone || formData.phone}@student.oll`,
        phone: user?.phone || formData.phone,
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
      
      // Update user booking in context
      updateUserBooking({ ...response.data, name: user?.name || formData.name });
      
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

  const handleBack = () => {
    if (currentStep === 0) {
      setFlowType(null);
      setCameFromCoursePage(false);
    } else if (cameFromCoursePage && currentStep === 2) {
      // If came from course page and at age step, go back to course details
      navigate(`/courses/${formData.skill}`);
    } else {
      // Reset OTP state when going back from OTP step
      if (currentStepData?.id === 'otp') {
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
    const stepId = currentStepData?.id;
    if (!stepId) return null;
    
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
              {/* Book Demo - Primary Action (Above) */}
              <div
                className="selection-card p-5 cursor-pointer flex items-center justify-between bg-[#D63031]/5 border-[#D63031]/30"
                onClick={() => handleActionChoice('book')}
                data-testid="action-book-demo"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-[#D63031]" />
                  <span className="font-medium text-[#D63031]">Book Free Demo Class</span>
                </div>
                <ArrowRight className="w-4 h-4 text-[#D63031]" />
              </div>
              
              {/* See Details - Secondary Action (Below) */}
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

      case 'learning_goal':
        const goals = LEARNING_GOALS[formData.age_group] || LEARNING_GOALS['10-14'];
        return (
          <div className="space-y-4">
            <p className="text-sm text-slate-600 text-center mb-4">What do you want to achieve?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {goals.map((goal) => (
                <div
                  key={goal.value}
                  className={`selection-card p-4 cursor-pointer ${formData.learning_goal === goal.value ? 'selected' : ''}`}
                  onClick={() => handleSingleSelect('learning_goal', goal.value)}
                  data-testid={`goal-${goal.value}`}
                >
                  <div className="font-semibold text-[#1E3A5F]">{goal.label}</div>
                </div>
              ))}
            </div>
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

      case 'address':
        return (
          <div className="space-y-5">
            <div className="text-center mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-100 flex items-center justify-center mx-auto mb-3">
                <Home className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-[#1E3A5F]">Where should we visit?</h3>
              <p className="text-slate-500 text-sm mt-1">Enter your home address for the demo class</p>
            </div>
            
            {/* Address Search with Google-like autocomplete */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Search Address *
              </label>
              <div className="relative">
                <Input
                  placeholder="Search for your locality, area, or landmark..."
                  value={addressSearch}
                  onChange={async (e) => {
                    const query = e.target.value;
                    setAddressSearch(query);
                    
                    // Simple autocomplete simulation - in production, use Google Places API
                    if (query.length >= 3) {
                      setSearchingAddress(true);
                      // Simulate address suggestions based on city
                      setTimeout(() => {
                        const suggestions = [
                          `${query}, ${formData.city}`,
                          `${query} Main Road, ${formData.city}`,
                          `${query} Colony, ${formData.city}`,
                          `Near ${query}, ${formData.city}`,
                        ];
                        setAddressSuggestions(suggestions);
                        setSearchingAddress(false);
                      }, 300);
                    } else {
                      setAddressSuggestions([]);
                    }
                  }}
                  className="pr-10"
                  data-testid="address-search"
                />
                {searchingAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
                  </div>
                )}
              </div>
              
              {/* Address Suggestions Dropdown */}
              {addressSuggestions.length > 0 && !formData.address && (
                <div className="mt-2 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
                  {addressSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-3"
                      onClick={() => {
                        updateForm('address', suggestion);
                        setAddressSearch(suggestion);
                        setAddressSuggestions([]);
                      }}
                    >
                      <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Selected Address Display */}
              {formData.address && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm text-green-800 font-medium">{formData.address}</p>
                      <button
                        type="button"
                        className="text-xs text-green-600 hover:underline mt-1"
                        onClick={() => {
                          updateForm('address', '');
                          setAddressSearch('');
                        }}
                      >
                        Change address
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Apartment / Building Number */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Flat / Apartment / Building No.
              </label>
              <Input
                placeholder="e.g., Flat 302, Tower B, Sunshine Apartments"
                value={formData.address_line2}
                onChange={(e) => updateForm('address_line2', e.target.value)}
                data-testid="address-line2"
              />
            </div>
            
            {/* Landmark / Additional Info */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Landmark / Additional Comments (Optional)
              </label>
              <Textarea
                placeholder="e.g., Near City Mall, Behind the petrol pump, Ring the doorbell twice..."
                value={formData.address_landmark}
                onChange={(e) => updateForm('address_landmark', e.target.value)}
                className="min-h-[80px]"
                data-testid="address-landmark"
              />
            </div>
            
            {formData.address && (
              <Button
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="w-full bg-[#D63031] hover:bg-[#b52828]"
                data-testid="continue-address-btn"
              >
                Continue
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
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
              <div className="space-y-4">
                {Object.entries(TIME_SLOT_GROUPS).map(([key, group]) => (
                  <div key={key} className="bg-slate-50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-slate-700">{group.label}</span>
                      <span className="text-xs text-slate-500">{group.sublabel}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {group.slots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          className={`p-2 rounded-lg border-2 transition-all text-sm ${
                            formData.demo_time === time
                              ? 'border-[#D63031] bg-red-50 text-[#D63031] font-medium'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                          onClick={() => updateForm('demo_time', time)}
                          data-testid={`time-${time}`}
                        >
                          {formatTimeDisplay(time)}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Booking Summary & Book Button */}
            {formData.demo_date && formData.demo_time && (
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <h4 className="font-medium text-[#1E3A5F] text-sm">Booking Summary</h4>
                <div className="text-sm text-slate-600 space-y-1">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-slate-400" />
                    <span>{SKILL_OPTIONS.find(s => s.value === formData.skill)?.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{format(formData.demo_date, 'EEEE, MMMM d, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{formatTimeDisplay(formData.demo_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>
                      {formData.learning_mode === 'online' 
                        ? 'Online' 
                        : formData.offline_type === 'center' 
                          ? `${formData.selected_center_name || 'Center'}, ${formData.city}` 
                          : `Home visit, ${formData.city}`}
                    </span>
                  </div>
                </div>
                
                {isLoggedIn ? (
                  <Button
                    onClick={handleBookForLoggedInUser}
                    disabled={submitting}
                    className="w-full bg-[#D63031] hover:bg-[#b52828] mt-2"
                    data-testid="book-demo-btn"
                  >
                    {submitting ? 'Booking...' : 'Book Demo'}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    className="w-full bg-[#D63031] hover:bg-[#b52828] mt-2"
                    data-testid="continue-to-phone-btn"
                  >
                    Continue to Book
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-blue-100 flex items-center justify-center mx-auto">
              <Phone className="w-7 h-7 text-blue-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#1E3A5F] mb-1">Enter Your Phone Number</h3>
              <p className="text-slate-500 text-sm">We&apos;ll send you an OTP to verify</p>
            </div>

            <div className="max-w-xs mx-auto">
              <PhoneInput
                value={formData.phone}
                onChange={(value) => updateForm('phone', value)}
                countryCode={formData.countryCode}
                onCountryCodeChange={(code) => updateForm('countryCode', code)}
                placeholder="Enter phone number"
                data-testid="phone-input"
              />
            </div>

            <Button
              onClick={() => {
                if (formData.phone.length >= 10) {
                  handleSendOTP();
                  setCurrentStep(prev => prev + 1);
                } else {
                  toast.error('Please enter a valid 10-digit phone number');
                }
              }}
              disabled={otpLoading || formData.phone.length < 10}
              className="w-full max-w-xs mx-auto bg-[#D63031] hover:bg-[#b52828]"
              data-testid="verify-phone-btn"
            >
              {otpLoading ? 'Sending OTP...' : 'Verify Phone Number'}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <p className="text-xs text-slate-400">
              OTP will be sent via WhatsApp • Valid for 10 minutes
            </p>
          </div>
        );

      case 'name':
        return (
          <div className="space-y-5 text-center">
            <div className="w-14 h-14 rounded-xl bg-purple-100 flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#1E3A5F] mb-1">What&apos;s your name?</h3>
              <p className="text-slate-500 text-sm">So we know how to address you</p>
            </div>

            <div className="max-w-xs mx-auto">
              <Input
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="text-center text-lg py-3"
                data-testid="name-input"
                autoFocus
              />
            </div>

            <Button
              onClick={() => setCurrentStep(prev => prev + 1)}
              disabled={!formData.name || formData.name.trim().length < 2}
              className="w-full max-w-xs mx-auto bg-[#D63031] hover:bg-[#b52828]"
              data-testid="continue-name-btn"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            
            {otpSent && (
              <p className="text-xs text-green-600">
                <Check className="w-3 h-3 inline mr-1" />
                OTP sent to your WhatsApp
              </p>
            )}
          </div>
        );

      case 'otp':
        return (
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-green-100 flex items-center justify-center mx-auto">
              <Shield className="w-7 h-7 text-green-600" />
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#1E3A5F] mb-1">Verify & Confirm</h3>
              <p className="text-slate-500 text-sm">
                Enter OTP sent to <strong>{formData.countryCode} {formData.phone}</strong>
              </p>
            </div>

            <div className="space-y-3">
              <Input
                type="text"
                placeholder="••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-2xl text-center tracking-widest py-4 max-w-[180px] mx-auto"
                maxLength={4}
                data-testid="otp-input"
                autoFocus
              />

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
                onClick={() => {
                  setOtp('');
                  setOtpSent(false);
                  handleSendOTP();
                }}
                disabled={otpLoading}
                className="text-sm text-[#1E3A5F] hover:text-[#D63031] hover:underline transition-colors"
              >
                {otpLoading ? 'Sending...' : "Didn't receive OTP? Resend"}
              </button>
            </div>

            {/* Booking Summary */}
            <div className="bg-slate-50 rounded-xl p-3 text-left mt-4">
              <h4 className="font-medium text-[#1E3A5F] mb-2 text-xs">Booking for: {formData.name}</h4>
              <div className="text-xs text-slate-600 space-y-1">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>{SKILL_OPTIONS.find(s => s.value === formData.skill)?.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formData.demo_date ? format(formData.demo_date, 'EEE, MMM d') : ''} at {formatTimeDisplay(formData.demo_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {formData.learning_mode === 'online' 
                      ? 'Online' 
                      : formData.offline_type === 'center' 
                        ? `${formData.selected_center_name || 'Center'}, ${formData.city}` 
                        : `Home, ${formData.city}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Booking Animation Screen
  if (showBookingAnimation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          {/* Animated Checkmark Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            {/* Outer ring animation */}
            <div className="absolute inset-0 border-4 border-green-200 rounded-full animate-pulse"></div>
            {/* Inner circle with checkmark */}
            <div className="absolute inset-2 bg-green-500 rounded-full flex items-center justify-center animate-scale-in">
              <svg 
                className="w-16 h-16 text-white animate-draw-check" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7"
                  className="animate-check-draw"
                />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-[#1E3A5F] animate-fade-in">
            Confirming your booking...
          </h2>
          <p className="text-slate-500 text-sm mt-2 animate-fade-in">
            Please wait a moment
          </p>
        </div>
        
        <style>{`
          @keyframes scale-in {
            0% { transform: scale(0); opacity: 0; }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes check-draw {
            0% { stroke-dasharray: 0 100; }
            100% { stroke-dasharray: 100 0; }
          }
          @keyframes fade-in {
            0% { opacity: 0; transform: translateY(10px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          .animate-scale-in {
            animation: scale-in 0.5s ease-out forwards;
          }
          .animate-check-draw {
            stroke-dasharray: 0 100;
            animation: check-draw 0.8s ease-out 0.3s forwards;
          }
          .animate-fade-in {
            animation: fade-in 0.4s ease-out 0.5s both;
          }
        `}</style>
      </div>
    );
  }

  // Success Screen with Booking Details and Reschedule Option
  if (submitted && bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        {/* Header */}
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/my-bookings" className="flex items-center gap-2">
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
              <Link to={isLoggedIn ? "/my-bookings" : "/"} className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL" 
                  className="h-8"
                />
              </Link>
              <div className="flex items-center gap-4">
                {isLoggedIn ? (
                  <Button
                    onClick={() => navigate('/my-bookings')}
                    className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm flex items-center gap-2"
                  >
                    <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                      <Home className="w-3 h-3" />
                    </div>
                    My Bookings
                  </Button>
                ) : (
                  <Button
                    onClick={() => navigate('/login')}
                    className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm"
                    data-testid="funnel-login-btn"
                  >
                    Login
                  </Button>
                )}
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
      <Helmet>
        <title>Book Free Demo Class | Learn Robotics, AI, Coding | OLL</title>
        <meta name="description" content="Book a FREE demo class for Robotics, AI, Coding, Entrepreneurship or Financial Literacy at OLL. Expert educators, flexible timings, online or at centers across India. Ages 6-25." />
        <meta name="keywords" content="book robotics demo, free coding class, AI classes for kids, robotics classes near me, coding classes for children, STEM demo class, entrepreneurship course, skill classes India" />
        <link rel="canonical" href="https://oll.co/student" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/student" />
        <meta property="og:title" content="Book Free Demo Class | Learn Robotics, AI, Coding | OLL" />
        <meta property="og:description" content="Book a FREE demo for Robotics, AI, Coding, Entrepreneurship or Financial Literacy. Expert educators, flexible timings. Online or in-person classes." />
        <meta property="og:image" content="https://oll.co/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Book Free Demo Class | OLL - Future Skills Education" />
        <meta name="twitter:description" content="Book a FREE demo for Robotics, AI, Coding & more. Expert educators, flexible timings." />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />
      </Helmet>
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to={isLoggedIn ? "/my-bookings" : "/"} className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-8"
              />
            </Link>
            <div className="flex items-center gap-4">
              {isLoggedIn ? (
                <Button
                  onClick={() => navigate('/my-bookings')}
                  className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm flex items-center gap-2"
                >
                  <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                    <Home className="w-3 h-3" />
                  </div>
                  My Bookings
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/login')}
                  className="bg-[#1E3A5F] hover:bg-[#2d4a6f] text-white text-sm"
                >
                  Login
                </Button>
              )}
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
              {currentStepData?.title || 'Complete Booking'}
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
              {/* Hide Continue button on steps that have their own navigation */}
              {!['otp', 'action', 'phone', 'skill', 'age', 'learning_goal', 'mode', 'city', 'center'].includes(currentStepData?.id) && (
                isLoggedIn && currentStepData?.id === 'schedule' ? null : (
                  <Button
                    onClick={handleNext}
                    disabled={submitting || otpLoading}
                    className="btn-primary flex items-center gap-2"
                    data-testid="next-btn"
                  >
                    {currentStepData?.id === 'profile' ? 'Continue' : 'Next'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )
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
