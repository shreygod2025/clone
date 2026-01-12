import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, User, School, GraduationCap, Users, Briefcase, Phone, Mail, FileText, MessageCircle, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const INQUIRY_TYPES = [
  { value: 'student', label: 'Student', icon: User, description: 'Student or parent inquiry' },
  { value: 'school', label: 'School', icon: School, description: 'School partnership inquiry' },
  { value: 'growth_partner', label: 'Growth Partner', icon: Briefcase, description: 'Franchise or partnership' },
  { value: 'teacher', label: 'Teacher/Educator', icon: GraduationCap, description: 'Educator application' },
  { value: 'team', label: 'Team', icon: Users, description: 'Internal team inquiry' },
];

const QUERY_TYPES = [
  { value: 'demo_related', label: 'Demo Related' },
  { value: 'payment', label: 'Payment Related' },
  { value: 'course_info', label: 'Course Information' },
  { value: 'technical', label: 'Technical Support' },
  { value: 'partnership', label: 'Partnership Query' },
  { value: 'feedback', label: 'Feedback / Complaint' },
  { value: 'other', label: 'Other' },
];

const SKILL_OPTIONS = [
  { value: 'robotics', label: 'Robotics' },
  { value: 'coding', label: 'Coding' },
  { value: 'ai', label: 'Artificial Intelligence' },
  { value: 'entrepreneurship', label: 'Entrepreneurship' },
  { value: 'financial', label: 'Financial Literacy' },
];

const SOURCE_OPTIONS = [
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'referral', label: 'Referral' },
  { value: 'website', label: 'Website' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'event', label: 'Event / Workshop' },
  { value: 'about_page', label: 'About Page Form' },
  { value: 'other', label: 'Other' },
];

const InquiryPage = () => {
  const navigate = useNavigate();
  const { username } = useParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cities, setCities] = useState([]);
  const [teamUser, setTeamUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(!!username);
  
  const [formData, setFormData] = useState({
    inquiry_type: '', // student, school, growth_partner, teacher, team
    action_type: '', // lead or query
    // Contact details
    name: '',
    phone: '',
    email: '',
    // Lead specific
    offering: '',
    city: '',
    source: '', // NEW: source field
    details: '',
    // Query specific
    query_type: '',
    query_details: '',
  });

  // Fetch team user if username provided
  useEffect(() => {
    const fetchTeamUser = async () => {
      if (!username) {
        setLoadingUser(false);
        return;
      }
      try {
        const response = await axios.get(`${API}/team-users/by-username/${username}`);
        setTeamUser(response.data);
      } catch (error) {
        toast.error('Invalid user link');
        navigate('/add');
      } finally {
        setLoadingUser(false);
      }
    };
    fetchTeamUser();
  }, [username, navigate]);

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

  const getActiveSteps = () => {
    const steps = [
      { id: 'type', title: 'Select Type' },
      { id: 'action', title: 'Lead or Query?' },
    ];
    
    if (formData.action_type === 'lead') {
      steps.push(
        { id: 'source', title: 'Lead Source' },
        { id: 'contact', title: 'Contact Details' },
        { id: 'offering', title: 'Select Offering' },
        { id: 'details', title: 'Additional Details' }
      );
    } else if (formData.action_type === 'query') {
      steps.push(
        { id: 'query_type', title: 'Type of Query' },
        { id: 'contact', title: 'Contact Details' },
        { id: 'query_details', title: 'Query Details' }
      );
    }
    
    return steps;
  };

  const activeSteps = getActiveSteps();

  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSingleSelect = (field, value) => {
    updateForm(field, value);
    setTimeout(() => setCurrentStep(prev => prev + 1), 200);
  };

  const validateStep = () => {
    const stepId = activeSteps[currentStep].id;
    switch (stepId) {
      case 'type':
        return formData.inquiry_type;
      case 'action':
        return formData.action_type;
      case 'source':
        return formData.source;
      case 'contact':
        return formData.name && formData.phone && formData.phone.length >= 10;
      case 'offering':
        return formData.offering;
      case 'query_type':
        return formData.query_type;
      case 'details':
      case 'query_details':
        return true; // Optional
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) {
      toast.error('Please complete all required fields');
      return;
    }

    if (currentStep === activeSteps.length - 1) {
      // Final step - submit
      await handleSubmit();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 0) {
      navigate('/');
    } else {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = {
        inquiry_type: formData.inquiry_type,
        action_type: formData.action_type,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || `${formData.phone}@inquiry.oll`,
        source: formData.source || 'team_inquiry_form',
        added_by: teamUser?.id || '',  // Track who added this lead
      };

      if (formData.action_type === 'lead') {
        // Add lead to appropriate CRM based on inquiry_type
        payload.offering = formData.offering;
        payload.city = formData.city;
        payload.details = formData.details;
        
        await axios.post(`${API}/inquiry/lead`, payload);
        toast.success('Lead added to CRM successfully!');
      } else {
        // Add to ticketing system
        payload.query_type = formData.query_type;
        payload.query_details = formData.query_details;
        
        await axios.post(`${API}/inquiry/query`, payload);
        toast.success('Query submitted to ticketing system!');
      }
      
      setSubmitted(true);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    const stepId = activeSteps[currentStep].id;
    
    switch (stepId) {
      case 'type':
        return (
          <div className="space-y-3">
            {INQUIRY_TYPES.map((type) => {
              const Icon = type.icon;
              return (
                <div
                  key={type.value}
                  className={`selection-card p-4 cursor-pointer flex items-center gap-4 ${formData.inquiry_type === type.value ? 'selected' : ''}`}
                  onClick={() => handleSingleSelect('inquiry_type', type.value)}
                  data-testid={`type-${type.value}`}
                >
                  <div className="w-12 h-12 rounded-xl bg-[#1E3A5F]/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-[#1E3A5F]" />
                  </div>
                  <div>
                    <div className="font-semibold text-[#1E3A5F]">{type.label}</div>
                    <div className="text-xs text-slate-500">{type.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        );

      case 'action':
        return (
          <div className="space-y-4">
            <div
              className={`selection-card p-6 cursor-pointer ${formData.action_type === 'lead' ? 'selected' : ''}`}
              onClick={() => handleSingleSelect('action_type', 'lead')}
              data-testid="action-lead"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">Add a Lead</h3>
                  <p className="text-slate-500 text-sm">Add contact to CRM with offering details</p>
                </div>
              </div>
            </div>
            
            <div
              className={`selection-card p-6 cursor-pointer ${formData.action_type === 'query' ? 'selected' : ''}`}
              onClick={() => handleSingleSelect('action_type', 'query')}
              data-testid="action-query"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-[#1E3A5F] text-lg">Log a Query</h3>
                  <p className="text-slate-500 text-sm">Add to ticketing system for follow-up</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'source':
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SOURCE_OPTIONS.map((src) => (
              <div
                key={src.value}
                className={`selection-card p-4 cursor-pointer ${formData.source === src.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('source', src.value)}
                data-testid={`source-${src.value}`}
              >
                <div className="font-medium text-[#1E3A5F] text-sm">{src.label}</div>
              </div>
            ))}
          </div>
        );

      case 'contact':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className="input-glass"
                data-testid="contact-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number <span className="text-red-500">*</span>
              </label>
              <Input
                type="tel"
                placeholder="Enter 10-digit number"
                value={formData.phone}
                onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                className="input-glass"
                data-testid="contact-phone"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => updateForm('email', e.target.value)}
                className="input-glass"
                data-testid="contact-email"
              />
            </div>
          </div>
        );

      case 'offering':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Select Offering <span className="text-red-500">*</span>
              </label>
              <Select value={formData.offering} onValueChange={(v) => updateForm('offering', v)}>
                <SelectTrigger className="input-glass" data-testid="offering-select">
                  <SelectValue placeholder="Choose an offering" />
                </SelectTrigger>
                <SelectContent>
                  {SKILL_OPTIONS.map((skill) => (
                    <SelectItem key={skill.value} value={skill.value}>{skill.label}</SelectItem>
                  ))}
                  <SelectItem value="school_partnership">School Partnership</SelectItem>
                  <SelectItem value="franchise">Franchise / Growth Partner</SelectItem>
                  <SelectItem value="educator_role">Educator Position</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                City <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Select value={formData.city} onValueChange={(v) => updateForm('city', v)}>
                <SelectTrigger className="input-glass" data-testid="city-select">
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={city.name}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'details':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Additional Details <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Add any additional notes or details about this lead..."
                value={formData.details}
                onChange={(e) => updateForm('details', e.target.value)}
                className="input-glass min-h-[120px]"
                data-testid="lead-details"
              />
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-[#1E3A5F] mb-2">Lead Summary</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Type:</span> {INQUIRY_TYPES.find(t => t.value === formData.inquiry_type)?.label}</p>
                <p><span className="font-medium">Source:</span> {SOURCE_OPTIONS.find(s => s.value === formData.source)?.label}</p>
                <p><span className="font-medium">Name:</span> {formData.name}</p>
                <p><span className="font-medium">Phone:</span> {formData.phone}</p>
                <p><span className="font-medium">Offering:</span> {formData.offering}</p>
                {formData.city && <p><span className="font-medium">City:</span> {formData.city}</p>}
              </div>
            </div>
          </div>
        );

      case 'query_type':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUERY_TYPES.map((qtype) => (
              <div
                key={qtype.value}
                className={`selection-card p-4 cursor-pointer ${formData.query_type === qtype.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('query_type', qtype.value)}
                data-testid={`query-type-${qtype.value}`}
              >
                <div className="font-medium text-[#1E3A5F]">{qtype.label}</div>
              </div>
            ))}
          </div>
        );

      case 'query_details':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <MessageCircle className="w-4 h-4 inline mr-1" />
                Query Details <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <Textarea
                placeholder="Describe the query or issue in detail..."
                value={formData.query_details}
                onChange={(e) => updateForm('query_details', e.target.value)}
                className="input-glass min-h-[120px]"
                data-testid="query-details"
              />
            </div>
            
            <div className="bg-slate-50 rounded-xl p-4">
              <h4 className="font-medium text-[#1E3A5F] mb-2">Query Summary</h4>
              <div className="text-sm text-slate-600 space-y-1">
                <p><span className="font-medium">Type:</span> {INQUIRY_TYPES.find(t => t.value === formData.inquiry_type)?.label}</p>
                <p><span className="font-medium">Query Category:</span> {QUERY_TYPES.find(q => q.value === formData.query_type)?.label}</p>
                <p><span className="font-medium">Name:</span> {formData.name}</p>
                <p><span className="font-medium">Phone:</span> {formData.phone}</p>
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

        <main className="flex-1 pt-24 pb-8 px-4 flex items-center justify-center">
          <div className="glass-card rounded-3xl p-8 md:p-12 max-w-lg w-full animate-slide-up text-center">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              {formData.action_type === 'lead' ? 'Lead Added!' : 'Query Submitted!'}
            </h2>
            <p className="text-slate-500 mb-8">
              {formData.action_type === 'lead' 
                ? 'The lead has been added to the CRM successfully.'
                : 'The query has been logged in the ticketing system.'}
            </p>

            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setSubmitted(false);
                  setCurrentStep(0);
                  setFormData({
                    inquiry_type: '',
                    action_type: '',
                    name: '',
                    phone: '',
                    email: '',
                    offering: '',
                    city: '',
                    source: '',
                    details: '',
                    query_type: '',
                    query_details: '',
                  });
                }}
                className="w-full bg-[#D63031] hover:bg-[#b52828]"
                data-testid="add-another-btn"
              >
                Add Another
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')} 
                className="w-full border-slate-300"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Show loading while fetching user
  if (loadingUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

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
            <div className="text-sm text-slate-500">
              {teamUser ? (
                <span>Adding as <strong className="text-[#1E3A5F]">{teamUser.name}</strong></span>
              ) : (
                'Add Lead / Query'
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-20 pb-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-8 hidden sm:block">
            <div className="flex items-center justify-center gap-2 mb-4">
              {activeSteps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    index < currentStep 
                      ? 'bg-[#1E3A5F] text-white' 
                      : index === currentStep 
                        ? 'bg-[#D63031] text-white' 
                        : 'bg-slate-200 text-slate-500'
                  }`}>
                    {index < currentStep ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  {index < activeSteps.length - 1 && (
                    <div className={`w-8 h-1 mx-1 rounded ${
                      index < currentStep ? 'bg-[#1E3A5F]' : 'bg-slate-200'
                    }`} />
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
              {/* Hide Continue button on auto-advance steps */}
              {!['type', 'action', 'query_type', 'source'].includes(activeSteps[currentStep].id) && (
                <Button
                  onClick={handleNext}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                  data-testid="next-btn"
                >
                  {submitting 
                    ? 'Submitting...' 
                    : currentStep === activeSteps.length - 1 
                      ? 'Submit' 
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

export default InquiryPage;
