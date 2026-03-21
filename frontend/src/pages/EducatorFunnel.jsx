import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, Briefcase, MapPin, Clock, Users, HelpCircle, Send, Calendar, IndianRupee, X, Shield, Video, Home, Building2, School } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import Navbar from '../components/Navbar';
import { useUserAuth } from '../context/UserAuthContext';
import PhoneInput from '../components/PhoneInput';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy', 'Other'];
const DEFAULT_GRADES = ['Pre-primary', 'Primary (1-5)', 'Middle (6-8)', 'High School (9-10)', 'Senior (11-12)'];
const DEFAULT_AVAILABILITY = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends'];

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];
const TIME_SLOTS = ['10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

const TEACHING_MODES = [
  { id: 'online', label: 'Online Classes', icon: Video, description: 'Teach via video call' },
  { id: 'offline_home', label: 'At Student\'s Home', icon: Home, description: 'Visit students for classes' },
  { id: 'offline_center', label: 'At OLL Center', icon: Building2, description: 'Teach at our learning centers' },
  { id: 'at_school', label: 'At a School', icon: School, description: 'Teach at partner schools' },
];

const EducatorFunnel = () => {
  const navigate = useNavigate();
  const { sendOTP } = useUserAuth();
  const [activeTab, setActiveTab] = useState('apply');
  const [requirements, setRequirements] = useState([]);
  const [centers, setCenters] = useState([]);
  const [formConfig, setFormConfig] = useState({
    skills: DEFAULT_SKILLS,
    grades: DEFAULT_GRADES,
    availability_options: DEFAULT_AVAILABILITY,
    experience_options: ['0-1 years', '1-3 years', '3-5 years', '5+ years'],
    required_fields: ['name', 'email', 'phone', 'skills'],
    optional_fields: ['experience', 'grades_comfortable', 'city', 'availability']
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [showRequirementForm, setShowRequirementForm] = useState(false);
  const [showOtherCity, setShowOtherCity] = useState(false);
  
  // OTP verification state
  const [step, setStep] = useState('form'); // form, otp, success
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  
  // Requirement OTP state
  const [reqStep, setReqStep] = useState('form'); // form, confirm, otp
  const [reqOtp, setReqOtp] = useState('');
  
  // General application form
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    skills: [],
    otherSkill: '', // Custom skill when "Other" is selected
    experience: '',
    grades_comfortable: [],
    city: '',
    other_city: '',
    teaching_mode: [],
    availability: [],
    demo_date: null,
    demo_time: '',
  });

  // Requirement-specific application form
  const [reqFormData, setReqFormData] = useState({
    name: '',
    email: '',
    phone: '',
    countryCode: '+91',
    experience: '',
    why_interested: '',
    available_days: [],
    demo_date: null,
    demo_time: '',
  });

  useEffect(() => {
    fetchRequirements();
    fetchFormConfig();
    fetchCenters();
  }, []);

  const fetchCenters = async () => {
    try {
      const response = await axios.get(`${API}/centers`);
      setCenters(response.data || []);
    } catch (error) {
      console.error('Failed to fetch centers');
    }
  };

  const fetchFormConfig = async () => {
    try {
      const response = await axios.get(`${API}/educator-config`);
      if (response.data) {
        setFormConfig(prev => ({
          ...prev,
          ...response.data
        }));
      }
    } catch (error) {
      console.error('Failed to fetch form config, using defaults');
    }
  };

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/requirements`);
      // Only show active requirements
      setRequirements(response.data.filter(r => r.is_active));
    } catch (error) {
      console.error('Failed to fetch requirements');
    } finally {
      setLoading(false);
    }
  };

  const toggleSkill = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const toggleGrade = (grade) => {
    setFormData(prev => ({
      ...prev,
      grades_comfortable: prev.grades_comfortable.includes(grade)
        ? prev.grades_comfortable.filter(g => g !== grade)
        : [...prev.grades_comfortable, grade]
    }));
  };

  const toggleAvailability = (slot) => {
    setFormData(prev => ({
      ...prev,
      availability: prev.availability.includes(slot)
        ? prev.availability.filter(a => a !== slot)
        : [...prev.availability, slot]
    }));
  };

  const toggleTeachingMode = (mode) => {
    setFormData(prev => ({
      ...prev,
      teaching_mode: prev.teaching_mode.includes(mode)
        ? prev.teaching_mode.filter(m => m !== mode)
        : [...prev.teaching_mode, mode]
    }));
  };

  const toggleReqDay = (day) => {
    setReqFormData(prev => ({
      ...prev,
      available_days: prev.available_days.includes(day)
        ? prev.available_days.filter(d => d !== day)
        : [...prev.available_days, day]
    }));
  };

  const handleCityChange = (e) => {
    const value = e.target.value;
    if (value === 'other') {
      setShowOtherCity(true);
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setShowOtherCity(false);
      setFormData(prev => ({ ...prev, city: value, other_city: '' }));
    }
  };

  // Check if city has OLL center
  const cityHasCenter = (cityName) => {
    return centers.some(c => c.city?.toLowerCase() === cityName?.toLowerCase() && c.is_active);
  };

  // Get available teaching modes based on city
  const getAvailableTeachingModes = () => {
    const selectedCity = showOtherCity ? formData.other_city : formData.city;
    const hasCenter = cityHasCenter(selectedCity);
    
    return TEACHING_MODES.map(mode => ({
      ...mode,
      disabled: mode.id === 'offline_center' && !hasCenter,
      tooltip: mode.id === 'offline_center' && !hasCenter ? 'No OLL center in your city' : null
    }));
  };

  // Step 1: Validate and send OTP
  const handleProceedToOTP = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || formData.skills.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    if (formData.phone.length < 10) {
      toast.error('Please enter a valid phone number');
      return;
    }
    if (!formData.demo_date || !formData.demo_time) {
      toast.error('Please select your preferred demo date and time');
      return;
    }
    if (formData.teaching_mode.length === 0) {
      toast.error('Please select at least one preferred teaching mode');
      return;
    }

    const fullPhone = formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;
    setOtpSending(true);
    const result = await sendOTP(fullPhone, 'educator');
    setOtpSending(false);

    if (result.success && result.sent) {
      toast.success('OTP sent to your WhatsApp!');
      setStep('otp');
    } else {
      toast.error(result.message || 'Failed to send OTP');
    }
  };

  // Step 2: Verify OTP and submit application
  const handleVerifyAndSubmit = async () => {
    if (!otp || otp.length < 4) {
      toast.error('Please enter the OTP');
      return;
    }

    const fullPhone = formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;
    
    // Build skills list with otherSkill if "Other" is selected
    let skillsList = formData.skills.filter(s => s !== 'Other');
    if (formData.skills.includes('Other') && formData.otherSkill) {
      skillsList.push(formData.otherSkill);
    }
    
    setSubmitting(true);
    try {
      const response = await axios.post(`${API}/educators/apply-verified`, {
        phone: fullPhone,
        otp: otp,
        application_data: {
          ...formData,
          skills: skillsList,
          phone: fullPhone,
          city: showOtherCity ? formData.other_city : formData.city,
          teaching_mode: formData.teaching_mode.join(', '),
          availability: formData.availability.join(', ') || 'Flexible',
          demo_ready: true,
          demo_date: formData.demo_date ? format(formData.demo_date, 'yyyy-MM-dd') : null,
        }
      });
      
      setSubmittedApplication(response.data.application);
      setStep('success');
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Old handleSubmit kept for backward compatibility
  const handleSubmit = async (e) => {
    e.preventDefault();
    handleProceedToOTP(e);
  };

  // Handle requirement-specific application
  const handleApplyToRequirement = (req) => {
    setSelectedRequirement(req);
    setReqFormData({
      name: '',
      email: '',
      phone: '',
      experience: '',
      why_interested: '',
      available_days: req.days || [],
      demo_date: null,
      demo_time: '',
    });
    setShowRequirementForm(true);
  };

  const handleRequirementSubmit = async (e) => {
    e.preventDefault();
    if (!reqFormData.name || !reqFormData.email || !reqFormData.phone) {
      toast.error('Please fill all required fields');
      return;
    }
    if (!reqFormData.demo_date || !reqFormData.demo_time) {
      toast.error('Please select your preferred demo date and time');
      return;
    }

    // Step 1: Show confirmation
    if (reqStep === 'form') {
      setReqStep('confirm');
      return;
    }

    // Step 2: Send OTP
    if (reqStep === 'confirm') {
      const fullPhone = reqFormData.countryCode === '+91' ? reqFormData.phone : `${reqFormData.countryCode}${reqFormData.phone}`;
      setOtpSending(true);
      try {
        await sendOTP(fullPhone);
        setReqStep('otp');
        toast.success('OTP sent to your phone');
      } catch (error) {
        toast.error('Failed to send OTP');
      } finally {
        setOtpSending(false);
      }
      return;
    }

    // Step 3: Verify OTP and submit
    if (reqStep === 'otp') {
      if (!reqOtp || reqOtp.length !== 4) {
        toast.error('Please enter the 4-digit OTP');
        return;
      }
      const fullPhone = reqFormData.countryCode === '+91' ? reqFormData.phone : `${reqFormData.countryCode}${reqFormData.phone}`;
      setSubmitting(true);
      try {
        // Verify OTP
        const verifyRes = await axios.post(`${API}/auth/verify-otp`, {
          phone: fullPhone,
          otp: reqOtp
        });
        
        if (!verifyRes.data?.verified) {
          toast.error('Invalid OTP');
          setSubmitting(false);
          return;
        }

        // Submit application (OTP already verified)
        await axios.post(`${API}/educators/apply`, {
          name: reqFormData.name,
          email: reqFormData.email,
          phone: fullPhone,
          skills: [selectedRequirement.skill],
          experience: reqFormData.experience,
          grades_comfortable: [],
          city: selectedRequirement.city,
          availability: reqFormData.available_days.join(', ') || 'Flexible',
          demo_ready: true,
          demo_date: reqFormData.demo_date ? format(reqFormData.demo_date, 'yyyy-MM-dd') : null,
          demo_time: reqFormData.demo_time,
          requirement_id: selectedRequirement.id,
          requirement_title: selectedRequirement.title,
          why_interested: reqFormData.why_interested || '',
        });
        setShowRequirementForm(false);
        setSelectedRequirement(null);
        setReqStep('form');
        setReqOtp('');
        toast.success('Application submitted successfully! We will contact you for a demo.');
      } catch (error) {
        if (error.response?.data?.detail?.includes('OTP')) {
          toast.error('Invalid OTP. Please try again.');
        } else {
          toast.error('Failed to submit. Please try again.');
        }
      } finally {
        setSubmitting(false);
      }
    }
  };

  const formatDays = (days) => {
    if (!days || days.length === 0) return 'Flexible';
    if (days.length === 7) return 'All Days';
    return days.map(d => d.substring(0, 3)).join(', ');
  };

  // Generate Jitsi meeting link for educator
  const generateMeetingLink = (appId) => {
    const meetCode = appId?.slice(-10) || 'demo-meet';
    return `https://meet.jit.si/OLLDemo${meetCode}`;
  };

  // OTP Verification Step
  if (step === 'otp') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full animate-slide-up">
          <button 
            onClick={() => setStep('form')}
            className="flex items-center gap-2 text-slate-600 hover:text-[#1E3A5F] mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Verify Your Phone
          </h1>
          <p className="text-slate-500 mb-6 text-center">
            OTP sent via <span className="text-green-600 font-medium">WhatsApp</span> to {formData.countryCode} {formData.phone}
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
              <Input
                type="text"
                placeholder="••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                className="text-2xl text-center tracking-widest"
                maxLength={4}
                data-testid="educator-otp"
              />
            </div>
            <Button 
              onClick={handleVerifyAndSubmit}
              disabled={submitting || otp.length < 4}
              className="w-full bg-[#D63031] hover:bg-[#b52828]"
              data-testid="verify-submit-btn"
            >
              {submitting ? 'Submitting...' : 'Verify & Submit Application'}
            </Button>
            <button
              onClick={async () => {
                setOtp('');
                const fullPhone = formData.countryCode === '+91' ? formData.phone : `${formData.countryCode}${formData.phone}`;
                const result = await sendOTP(fullPhone, 'educator');
                if (result.success && result.sent) {
                  toast.success('OTP resent!');
                }
              }}
              className="w-full text-sm text-slate-500 hover:text-[#1E3A5F]"
            >
              Resend OTP
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success Screen with demo details
  if (submitted || step === 'success') {
    const meetingLink = submittedApplication?.meeting_link || generateMeetingLink(submittedApplication?.id);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 md:p-10 max-w-lg w-full text-center animate-slide-up">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Application Submitted!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest in joining OLL. Our team will review your application.
          </p>
          
          {/* Demo Scheduled Info */}
          {(submittedApplication?.demo_date || formData.demo_date) && (
            <div className="bg-gradient-to-r from-[#1E3A5F]/5 to-[#D63031]/5 rounded-xl p-5 mb-6 text-left border border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-5 h-5 text-[#D63031]" />
                <span className="font-semibold text-[#1E3A5F]">Demo Scheduled</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-medium text-[#1E3A5F]">
                    {submittedApplication?.demo_date || format(formData.demo_date, 'EEEE, MMM d, yyyy')}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-slate-500">Time:</span>
                  <span className="font-medium text-[#1E3A5F]">
                    {submittedApplication?.demo_time || formData.demo_time}
                  </span>
                </p>
              </div>
              
              {/* Meeting Link */}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-500 mb-2">Demo Meeting Link:</p>
                <a
                  href={meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium text-sm bg-gradient-to-r from-[#1E3A5F] to-[#D63031] hover:from-[#D63031] hover:to-[#1E3A5F] transition-all"
                  data-testid="join-demo-link"
                >
                  <Video className="w-4 h-4" />
                  Join Demo
                </a>
                <p className="text-xs text-slate-400 mt-2 text-center">
                  Save this link to join your scheduled demo
                </p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full bg-[#1E3A5F] hover:bg-[#2d4a6f]"
              data-testid="login-btn"
            >
              Login to View Application
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
              data-testid="back-to-home-btn"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Helmet>
        <title>Become an Educator | Teach Robotics, AI, Coding Jobs | OLL</title>
        <meta name="description" content="Join OLL as an educator! Teach Robotics, Coding, AI, Entrepreneurship. Flexible hours, competitive pay ₹500-2000/session. Work from home or centers. Apply now!" />
        <meta name="keywords" content="robotics teacher jobs, coding instructor jobs, AI educator, STEM teacher jobs India, teach robotics online, freelance educator, work from home teaching, skill educator jobs, part time teaching" />
        <link rel="canonical" href="https://oll.co/educator" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/educator" />
        <meta property="og:title" content="Become an Educator | Teach Robotics, AI, Coding | OLL" />
        <meta property="og:description" content="Join OLL as an educator! Teach Robotics, Coding, AI. Flexible hours, competitive pay. Work from home or centers." />
        <meta property="og:image" content="https://oll.co/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Become an Educator | OLL - Teaching Jobs" />
        <meta name="twitter:description" content="Teach Robotics, Coding, AI at OLL. Flexible hours, great pay!" />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />
      </Helmet>
      <Navbar />

      {/* Main Content */}
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Join OLL as an Educator
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto text-sm sm:text-base">
              Share your expertise and be part of India&apos;s skill learning revolution. 
              We&apos;re looking for passionate educators to join our growing network.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-full">
              <TabsTrigger 
                value="apply" 
                className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm"
                data-testid="tab-apply"
              >
                General Application
              </TabsTrigger>
              <TabsTrigger 
                value="requirements" 
                className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm"
                data-testid="tab-requirements"
              >
                Open Positions ({requirements.length})
              </TabsTrigger>
            </TabsList>

            {/* Apply Form */}
            <TabsContent value="apply">
              <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-4 sm:p-6 md:p-8 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
                  {/* Personal Info */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg">Personal Information</h3>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Full Name *</label>
                      <Input
                        placeholder="Enter your name"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="input-glass h-10 sm:h-12"
                        data-testid="educator-name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Email *</label>
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="input-glass h-10 sm:h-12"
                        data-testid="educator-email"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Phone *</label>
                      <PhoneInput
                        value={formData.phone}
                        onChange={(val) => setFormData({...formData, phone: val})}
                        countryCode={formData.countryCode}
                        onCountryCodeChange={(code) => setFormData({...formData, countryCode: code})}
                        placeholder="Enter your phone"
                        data-testid="educator-phone"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">City</label>
                      <select
                        value={showOtherCity ? 'other' : formData.city}
                        onChange={handleCityChange}
                        className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none text-sm sm:text-base"
                        data-testid="educator-city"
                      >
                        <option value="">Select City</option>
                        {CITIES.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                        <option value="other">Other City</option>
                      </select>
                      
                      {/* Other City Input */}
                      {showOtherCity && (
                        <div className="mt-2">
                          <Input
                            placeholder="Enter your city name"
                            value={formData.other_city}
                            onChange={(e) => setFormData({...formData, other_city: e.target.value})}
                            className="input-glass h-10 sm:h-12"
                            data-testid="educator-other-city"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg">Professional Details</h3>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Skills You Can Teach *</label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {formConfig.skills.map(skill => (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => toggleSkill(skill)}
                            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                              formData.skills.includes(skill)
                                ? 'bg-[#D63031] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            data-testid={`skill-${skill.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                      {/* Other skill text input */}
                      {formData.skills.includes('Other') && (
                        <div className="mt-3">
                          <Input
                            placeholder="Please specify the skill"
                            value={formData.otherSkill}
                            onChange={(e) => setFormData({...formData, otherSkill: e.target.value})}
                            className="input-glass h-10 sm:h-11 text-sm sm:text-base"
                            data-testid="other-skill-input"
                          />
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Experience</label>
                      <Textarea
                        placeholder="Describe your teaching experience..."
                        value={formData.experience}
                        onChange={(e) => setFormData({...formData, experience: e.target.value})}
                        className="input-glass min-h-[80px] sm:min-h-[100px] text-sm sm:text-base"
                        data-testid="educator-experience"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Grades Comfortable With</label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {formConfig.grades.map(grade => (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => toggleGrade(grade)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                              formData.grades_comfortable.includes(grade)
                                ? 'bg-[#1E3A5F] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            data-testid={`grade-${grade.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Availability</label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {formConfig.availability_options.map(slot => (
                          <button
                            key={slot}
                            type="button"
                            onClick={() => toggleAvailability(slot)}
                            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all ${
                              formData.availability.includes(slot)
                                ? 'bg-[#1E3A5F] text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                            data-testid={`availability-${slot.toLowerCase().replace(/\s+/g, '-')}`}
                          >
                            {slot}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Teaching Mode Preference Section */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg mb-4">Preferred Teaching Mode *</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {getAvailableTeachingModes().map(mode => {
                      const IconComponent = mode.icon;
                      const isSelected = formData.teaching_mode.includes(mode.id);
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => !mode.disabled && toggleTeachingMode(mode.id)}
                          disabled={mode.disabled}
                          className={`p-4 rounded-xl border-2 text-left transition-all ${
                            mode.disabled 
                              ? 'border-slate-100 bg-slate-50 opacity-50 cursor-not-allowed'
                              : isSelected 
                                ? 'border-[#D63031] bg-red-50'
                                : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                          title={mode.tooltip || ''}
                          data-testid={`teaching-mode-${mode.id}`}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                              isSelected ? 'bg-[#D63031]/10' : 'bg-slate-100'
                            }`}>
                              <IconComponent className={`w-5 h-5 ${isSelected ? 'text-[#D63031]' : 'text-slate-500'}`} />
                            </div>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isSelected ? 'border-[#D63031] bg-[#D63031]' : 'border-slate-300'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                          <p className={`font-medium text-sm ${isSelected ? 'text-[#D63031]' : 'text-slate-700'}`}>
                            {mode.label}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">{mode.description}</p>
                          {mode.disabled && (
                            <p className="text-xs text-amber-600 mt-2">No center in your city</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Demo Class Section - Compulsory */}
                <div className="mt-6 pt-6 border-t border-slate-200">
                  <div className="mb-4">
                    <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg">Demo Class Schedule *</h3>
                    <p className="text-sm text-slate-500 mt-1">A demo class is required as part of your application. Please select your preferred date and time.</p>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 sm:p-6 space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Date Selection */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Preferred Date *</label>
                        <div className="flex justify-center bg-white rounded-xl p-2">
                          <CalendarComponent
                            mode="single"
                            selected={formData.demo_date}
                            onSelect={(date) => setFormData({...formData, demo_date: date})}
                            disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                            className="rounded-lg"
                            data-testid="demo-calendar"
                          />
                        </div>
                      </div>

                      {/* Time Selection */}
                      <div>
                        <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Preferred Time *</label>
                        <div className="grid grid-cols-2 gap-2">
                          {TIME_SLOTS.map(time => (
                            <button
                              key={time}
                              type="button"
                              className={`p-2 sm:p-3 rounded-lg border-2 text-center transition-all text-sm ${
                                formData.demo_time === time 
                                  ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                                  : 'border-slate-200 bg-white hover:border-slate-300'
                              }`}
                              onClick={() => setFormData({...formData, demo_time: time})}
                              data-testid={`demo-time-${time.replace(':', '')}`}
                            >
                              <Clock className="w-4 h-4 mx-auto mb-1" />
                              {time}
                            </button>
                          ))}
                        </div>
                        
                        {formData.demo_date && formData.demo_time && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg">
                            <p className="text-sm text-green-700">
                              <span className="font-medium">Selected:</span> {format(formData.demo_date, 'EEE, MMM d')} at {formData.demo_time}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-3 sm:gap-0 mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 w-full sm:w-auto"
                    data-testid="back-btn"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={otpSending || formData.teaching_mode.length === 0 || !formData.demo_date || !formData.demo_time}
                    className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                    data-testid="submit-application-btn"
                  >
                    {otpSending ? 'Sending OTP...' : 'Continue & Verify Phone'}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* Open Requirements */}
            <TabsContent value="requirements">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031] mx-auto"></div>
                  </div>
                ) : requirements.length === 0 ? (
                  <div className="glass-card rounded-3xl p-8 text-center">
                    <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-semibold text-[#1E3A5F] mb-2">No Open Positions</h3>
                    <p className="text-slate-500 mb-4">Check back later for new opportunities or submit a general application.</p>
                    <Button 
                      onClick={() => setActiveTab('apply')} 
                      className="btn-primary"
                      data-testid="apply-anyway-btn"
                    >
                      Submit General Application
                    </Button>
                  </div>
                ) : (
                  requirements.map(req => (
                    <div key={req.id} className="glass-card rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1E3A5F] text-lg mb-2">{req.title}</h3>
                          
                          {/* Basic Info */}
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-sm text-slate-500 mb-3">
                            <span className="flex items-center gap-1">
                              <Briefcase className="w-4 h-4" /> {req.skill}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {req.city}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" /> {req.positions} positions
                            </span>
                          </div>
                          
                          {/* Additional Details */}
                          <div className="flex flex-wrap gap-2 mb-3">
                            {req.days && req.days.length > 0 && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs sm:text-sm">
                                <Calendar className="w-3 h-3" /> {formatDays(req.days)}
                              </span>
                            )}
                            {req.timing_from && req.timing_to && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs sm:text-sm">
                                <Clock className="w-3 h-3" /> {req.timing_from} - {req.timing_to}
                              </span>
                            )}
                            {req.pay_per_session && (
                              <span className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded text-xs sm:text-sm">
                                <IndianRupee className="w-3 h-3" /> ₹{req.pay_per_session}/{req.pay_type === 'per_session' ? 'session' : 'month'}
                              </span>
                            )}
                          </div>
                          
                          <p className="text-slate-600 text-sm">{req.description}</p>
                        </div>
                        <Button
                          onClick={() => handleApplyToRequirement(req)}
                          className="btn-primary shrink-0 w-full sm:w-auto"
                          data-testid={`apply-req-${req.id}`}
                        >
                          Apply for This Position
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
            alt="OLL" 
            className="h-8 mx-auto mb-4"
          />
          <div className="flex justify-center gap-6 text-sm text-white/80 mb-4">
            <Link to="/about" className="hover:text-white">About Us</Link>
            <Link to="/faq" className="hover:text-white">FAQs</Link>
            <Link to="/blogs" className="hover:text-white">Blog</Link>
          </div>
          <p className="text-white/70 text-sm">
            © 2024 OLL. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Requirement-Specific Application Modal */}
      <Dialog open={showRequirementForm} onOpenChange={(open) => {
        setShowRequirementForm(open);
        if (!open) {
          setReqStep('form');
          setReqOtp('');
        }
      }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#1E3A5F]">
              {reqStep === 'confirm' ? 'Confirm Application' : reqStep === 'otp' ? 'Verify Phone' : `Apply: ${selectedRequirement?.title}`}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRequirement && reqStep === 'confirm' && (
            <div className="space-y-4">
              {/* Requirement Confirmation */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                <h4 className="font-semibold text-[#1E3A5F] mb-3">Position Details</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Role:</strong> {selectedRequirement.title}</p>
                  <p><strong>Skill:</strong> {selectedRequirement.skill}</p>
                  <p><strong>Location:</strong> {selectedRequirement.city}</p>
                  {selectedRequirement.pay_per_session && (
                    <p><strong>Pay:</strong> ₹{selectedRequirement.pay_per_session} / {selectedRequirement.pay_type === 'per_session' ? 'session' : 'month'}</p>
                  )}
                  {selectedRequirement.timing_from && selectedRequirement.timing_to && (
                    <p><strong>Timing:</strong> {selectedRequirement.timing_from} - {selectedRequirement.timing_to}</p>
                  )}
                  {selectedRequirement.days?.length > 0 && (
                    <p><strong>Days:</strong> {formatDays(selectedRequirement.days)}</p>
                  )}
                </div>
              </div>
              
              {/* Your Application Summary */}
              <div className="bg-slate-50 rounded-xl p-4">
                <h4 className="font-semibold text-slate-700 mb-3">Your Application</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Name:</strong> {reqFormData.name}</p>
                  <p><strong>Email:</strong> {reqFormData.email}</p>
                  <p><strong>Phone:</strong> {reqFormData.countryCode} {reqFormData.phone}</p>
                  {reqFormData.experience && <p><strong>Experience:</strong> {reqFormData.experience.substring(0, 100)}...</p>}
                  {reqFormData.available_days.length > 0 && (
                    <p><strong>Available:</strong> {reqFormData.available_days.join(', ')}</p>
                  )}
                  <p><strong>Demo Ready:</strong> {reqFormData.demo_ready ? 'Yes' : 'No'}</p>
                </div>
              </div>
              
              <p className="text-sm text-slate-500 text-center">
                Please verify the details above. Click Continue to verify your phone number via OTP.
              </p>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setReqStep('form')} className="flex-1">
                  Edit Details
                </Button>
                <Button onClick={handleRequirementSubmit} disabled={otpSending} className="btn-primary flex-1">
                  {otpSending ? 'Sending OTP...' : 'Continue & Verify'}
                </Button>
              </div>
            </div>
          )}
          
          {selectedRequirement && reqStep === 'otp' && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-600" />
                </div>
                <p className="text-slate-500 mb-4">
                  OTP sent via <span className="text-green-600 font-medium">WhatsApp</span> to {reqFormData.countryCode} {reqFormData.phone}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Enter OTP</label>
                <Input
                  type="text"
                  placeholder="Enter 4-digit OTP"
                  value={reqOtp}
                  onChange={(e) => setReqOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  className="text-center text-2xl tracking-widest"
                  maxLength={4}
                />
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setReqStep('confirm')} className="flex-1">
                  Back
                </Button>
                <Button 
                  onClick={handleRequirementSubmit} 
                  disabled={submitting || reqOtp.length !== 4} 
                  className="btn-primary flex-1"
                >
                  {submitting ? 'Verifying...' : 'Verify & Submit'}
                </Button>
              </div>
            </div>
          )}
          
          {selectedRequirement && reqStep === 'form' && (
            <form onSubmit={handleRequirementSubmit} className="space-y-4">
              {/* Position Details Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="flex items-center gap-1 text-slate-600">
                    <Briefcase className="w-4 h-4" /> {selectedRequirement.skill}
                  </span>
                  <span className="flex items-center gap-1 text-slate-600">
                    <MapPin className="w-4 h-4" /> {selectedRequirement.city}
                  </span>
                </div>
                {selectedRequirement.pay_per_session && (
                  <p className="text-green-600 font-medium text-sm">
                    ₹{selectedRequirement.pay_per_session} / {selectedRequirement.pay_type === 'per_session' ? 'session' : 'month'}
                  </p>
                )}
                {selectedRequirement.timing_from && selectedRequirement.timing_to && (
                  <p className="text-sm text-slate-500">
                    Timing: {selectedRequirement.timing_from} - {selectedRequirement.timing_to}
                  </p>
                )}
              </div>

              {/* Application Form */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Full Name *</label>
                <Input
                  placeholder="Enter your name"
                  value={reqFormData.name}
                  onChange={(e) => setReqFormData({...reqFormData, name: e.target.value})}
                  data-testid="req-name"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={reqFormData.email}
                    onChange={(e) => setReqFormData({...reqFormData, email: e.target.value})}
                    data-testid="req-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone *</label>
                  <PhoneInput
                    value={reqFormData.phone}
                    onChange={(val) => setReqFormData({...reqFormData, phone: val})}
                    countryCode={reqFormData.countryCode}
                    onCountryCodeChange={(code) => setReqFormData({...reqFormData, countryCode: code})}
                    placeholder="Your phone"
                    data-testid="req-phone"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Relevant Experience in {selectedRequirement.skill}
                </label>
                <Textarea
                  placeholder={`Describe your experience teaching ${selectedRequirement.skill}...`}
                  value={reqFormData.experience}
                  onChange={(e) => setReqFormData({...reqFormData, experience: e.target.value})}
                  className="min-h-[80px]"
                  data-testid="req-experience"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Why are you interested in this position?
                </label>
                <Textarea
                  placeholder="Tell us why this role interests you..."
                  value={reqFormData.why_interested}
                  onChange={(e) => setReqFormData({...reqFormData, why_interested: e.target.value})}
                  className="min-h-[80px]"
                  data-testid="req-why"
                />
              </div>

              {selectedRequirement.days && selectedRequirement.days.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Which days are you available?
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequirement.days.map(day => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleReqDay(day)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          reqFormData.available_days.includes(day)
                            ? 'bg-[#1E3A5F] text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Demo Date/Time - Compulsory for requirement applications */}
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-sm font-semibold text-[#1E3A5F] mb-1">Demo Class Schedule *</label>
                  <p className="text-xs text-slate-500 mb-3">A demo is compulsory. Select your preferred date and time.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Preferred Date *</label>
                    <div className="flex justify-center bg-slate-50 rounded-xl p-1 border border-slate-200">
                      <CalendarComponent
                        mode="single"
                        selected={reqFormData.demo_date}
                        onSelect={(date) => setReqFormData({...reqFormData, demo_date: date})}
                        disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
                        className="rounded-lg scale-90"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Preferred Time *</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {TIME_SLOTS.map(time => (
                        <button
                          key={time}
                          type="button"
                          className={`p-2 rounded-lg border text-center transition-all text-xs ${
                            reqFormData.demo_time === time
                              ? 'border-[#1E3A5F] bg-[#1E3A5F] text-white'
                              : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                          }`}
                          onClick={() => setReqFormData({...reqFormData, demo_time: time})}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                    {reqFormData.demo_date && reqFormData.demo_time && (
                      <div className="mt-3 p-2 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-xs text-green-700">
                          <span className="font-medium">Selected:</span> {format(reqFormData.demo_date, 'EEE, MMM d')} at {reqFormData.demo_time}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowRequirementForm(false)} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="btn-primary flex-1"
                  data-testid="submit-req-application"
                >
                  Continue
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EducatorFunnel;
