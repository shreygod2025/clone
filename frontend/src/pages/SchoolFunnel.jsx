import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ArrowRight, Check, Building2, Users, Award, Clock, Calendar, Send, BookOpen, Cog, Trophy, GraduationCap, Lightbulb, Target, ChevronRight, Play, Star, Phone } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { toast } from 'sonner';
import axios from 'axios';
import { format, addDays } from 'date-fns';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const STEPS = [
  { id: 'board', title: 'Board' },
  { id: 'school_size', title: 'School Size' },
  { id: 'fee_range', title: 'Fee Range' },
  { id: 'programs', title: 'Programs Interested In' },
  { id: 'support', title: 'Support Needed' },
  { id: 'meeting_date', title: 'Schedule Meeting - Select Date' },
  { id: 'meeting_time', title: 'Schedule Meeting - Select Time' },
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
  { value: 'robotics', label: 'Robotics', description: 'Hands-on robotics education' },
  { value: 'coding', label: 'Coding & Programming', description: 'Programming skills development' },
  { value: 'ai', label: 'AI & Machine Learning', description: 'Future-ready AI skills' },
  { value: 'entrepreneurship', label: 'Financial Literacy & Entrepreneurship', description: 'Business & money skills' },
];

// Support options matching school offerings
const SUPPORT_OPTIONS = {
  robotics: [
    { value: 'robotics-curriculum-kits', label: 'Robotics Curriculum with Take-home Kits' },
    { value: 'robotics-lab-setup', label: 'Robotics Lab Setup' },
    { value: 'robotics-exhibition-prep', label: 'Exhibition Preparation' },
    { value: 'host-robotics-exhibition', label: 'Host an Exhibition' },
    { value: 'iit-bombay-competitions', label: 'IIT Bombay Competition Training' },
    { value: 'robotics-competition-prep', label: 'General Competition Prep' },
    { value: 'icse-group3-kits', label: 'ICSE Group 3 Subject Kits' },
    { value: 'afterschool-robotics', label: 'Afterschool Classes' },
    { value: 'robotics-summer-camp', label: 'Summer Camp' },
    { value: 'robotics-ai-seminar', label: 'Robotics & AI Seminar' },
    { value: 'robotics-books', label: 'Robotics Books' },
    { value: 'robotics-kits', label: 'Robotics Kits Only' },
  ],
  coding: [
    { value: 'vibe-coding-seminar', label: 'Vibe Coding Seminar' },
    { value: 'coding-afterschool', label: 'Afterschool Coding Classes' },
    { value: 'coding-summer-camp', label: 'Coding Summer Camp' },
  ],
  ai: [
    { value: 'ai-center-excellence', label: 'AI Center for Excellence' },
    { value: 'agentic-ai-workshop', label: 'Agentic AI Workshop' },
    { value: 'ai-seminar', label: 'AI Awareness Seminar' },
    { value: 'agentic-ai-summer-camp', label: 'AI Summer Camp' },
    { value: 'ai-services-agency-course', label: 'AI Services Agency Course' },
  ],
  entrepreneurship: [
    { value: 'entrepreneurship-workshop', label: '3-Day Entrepreneurship Workshop' },
    { value: 'skill-titans-olympiad', label: 'Skill Titans TV Show & Olympiad' },
    { value: 'fl-curriculum', label: 'Financial Literacy Curriculum' },
    { value: 'ecell-opening', label: 'E-Cell Opening' },
    { value: 'fl-summer-camp', label: 'Summer Camp' },
  ],
};

const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

// Services data for post-submission showcase
const SERVICES = [
  {
    id: 'robotics',
    icon: Cog,
    title: 'Robotics Lab Setup',
    description: 'Complete robotics lab with equipment, curriculum, and trained instructors',
    features: ['Age-appropriate kits', 'Structured curriculum', 'Competition prep', 'Regular assessments'],
    color: 'blue'
  },
  {
    id: 'coding',
    icon: BookOpen,
    title: 'Coding & AI Program',
    description: 'Comprehensive coding education from basics to advanced AI/ML',
    features: ['Scratch to Python pathway', 'Real-world projects', 'AI/ML introduction', 'Industry certifications'],
    color: 'purple'
  },
  {
    id: 'competitions',
    icon: Trophy,
    title: 'Competition Training',
    description: 'Prepare students for national and international STEM competitions',
    features: ['WRO preparation', 'Hackathon training', 'Science fairs', 'Innovation challenges'],
    color: 'amber'
  },
  {
    id: 'teacher',
    icon: GraduationCap,
    title: 'Teacher Training',
    description: 'Upskill your faculty with latest teaching methodologies',
    features: ['Hands-on workshops', 'Certification programs', 'Ongoing support', 'Resource access'],
    color: 'green'
  },
];

const TESTIMONIALS = [
  {
    quote: "OLL transformed our STEM program. Students are now winning state-level competitions!",
    author: "Principal, Delhi Public School",
    location: "Delhi"
  },
  {
    quote: "The teacher training program was exceptional. Our faculty is now confident teaching robotics.",
    author: "Academic Head, Ryan International",
    location: "Mumbai"
  },
  {
    quote: "From lab setup to curriculum, OLL provided end-to-end support. Highly recommended!",
    author: "Director, Kendriya Vidyalaya",
    location: "Bangalore"
  }
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
    meeting_date: null,
    meeting_time: '',
    contact_name: '',
    phone: '',
  });

  const updateForm = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  // Auto-advance for single selection questions
  const handleSingleSelect = (key, value) => {
    updateForm(key, value);
    setTimeout(() => {
      setCurrentStep(prev => prev + 1);
    }, 200);
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
      case 'board': return formData.board;
      case 'school_size': return formData.school_size;
      case 'fee_range': return formData.fee_range;
      case 'programs': return formData.programs_interested.length > 0;
      case 'support': return formData.support_needed.length > 0;
      case 'meeting_date': return formData.meeting_date;
      case 'meeting_time': return formData.meeting_time;
      case 'contact': return formData.school_name && formData.contact_name && formData.phone && formData.location;
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

  // Post-Submission Services Showcase Page
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL" 
                  className="h-8"
                />
              </Link>
              <a href="tel:+919876543210" className="flex items-center gap-2 text-[#D63031] font-medium text-sm">
                <Phone className="w-4 h-4" />
                <span className="hidden sm:inline">Call Us</span>
              </a>
            </div>
          </div>
        </header>

        {/* Success Banner */}
        <div className="bg-gradient-to-r from-[#1E3A5F] to-[#2d5a8f] text-white py-8 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Meeting Scheduled Successfully!
            </h1>
            <p className="text-white/80 mb-4">
              Thank you, {formData.school_name}. We're excited to partner with you.
            </p>
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formData.meeting_date ? format(formData.meeting_date, 'EEEE, MMMM d, yyyy') : ''}</span>
              <span className="mx-1">•</span>
              <Clock className="w-4 h-4" />
              <span>{formData.meeting_time}</span>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="py-8 bg-white border-b border-slate-200">
          <div className="max-w-6xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">500+</div>
                <div className="text-sm text-slate-500">Partner Schools</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">50,000+</div>
                <div className="text-sm text-slate-500">Students Trained</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">100+</div>
                <div className="text-sm text-slate-500">Competition Wins</div>
              </div>
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-[#1E3A5F]">15+</div>
                <div className="text-sm text-slate-500">Cities Covered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Services Section */}
        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our Services for Schools
              </h2>
              <p className="text-slate-600">Comprehensive skill education solutions tailored for your school</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {SERVICES.map(service => {
                const colorClasses = {
                  blue: 'bg-blue-50 text-blue-600 border-blue-200',
                  purple: 'bg-purple-50 text-purple-600 border-purple-200',
                  amber: 'bg-amber-50 text-amber-600 border-amber-200',
                  green: 'bg-green-50 text-green-600 border-green-200',
                };
                return (
                  <div key={service.id} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow">
                    <div className={`w-12 h-12 rounded-xl ${colorClasses[service.color]} flex items-center justify-center mb-4`}>
                      <service.icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-[#1E3A5F] mb-2">{service.title}</h3>
                    <p className="text-slate-600 text-sm mb-4">{service.description}</p>
                    <div className="space-y-2">
                      {service.features.map((feature, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-slate-500">
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="py-12 px-4 bg-white">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                How We Partner With Schools
              </h2>
              <p className="text-slate-600">Simple 4-step process to transform your school's skill education</p>
            </div>

            <div className="relative">
              {/* Timeline line */}
              <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-200 -translate-x-1/2"></div>
              
              <div className="space-y-8 md:space-y-0">
                {[
                  { step: 1, title: 'Consultation', desc: 'We understand your school\'s needs and goals', icon: Target },
                  { step: 2, title: 'Customization', desc: 'Tailored curriculum and lab setup plan', icon: Lightbulb },
                  { step: 3, title: 'Implementation', desc: 'Lab setup, teacher training, and launch', icon: Cog },
                  { step: 4, title: 'Ongoing Support', desc: 'Regular assessments and continuous improvement', icon: Star },
                ].map((item, idx) => (
                  <div key={item.step} className={`flex items-center gap-4 md:gap-8 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                    <div className={`flex-1 ${idx % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                      <div className="glass-card rounded-xl p-4 inline-block">
                        <h3 className="font-semibold text-[#1E3A5F]">{item.title}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <div className="relative z-10 w-12 h-12 rounded-full bg-[#D63031] text-white flex items-center justify-center font-bold shadow-lg flex-shrink-0">
                      {item.step}
                    </div>
                    <div className="flex-1 hidden md:block"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="py-12 px-4 bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f]">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                What Schools Say About Us
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {TESTIMONIALS.map((testimonial, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                  <div className="flex gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-white/90 text-sm mb-4">"{testimonial.quote}"</p>
                  <div>
                    <p className="text-white font-medium text-sm">{testimonial.author}</p>
                    <p className="text-white/60 text-xs">{testimonial.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="py-12 px-4 bg-white">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Transform Your School?
            </h2>
            <p className="text-slate-600 mb-6">
              Our team will reach out before your scheduled meeting. In the meantime, explore our resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={() => navigate('/courses')} 
                className="btn-primary"
              >
                Explore Programs
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
              <Button 
                variant="outline"
                onClick={() => navigate('/')} 
                className="border-slate-300"
              >
                Back to Home
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-[#1E3A5F] text-white py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
              alt="OLL" 
              className="h-8 mx-auto mb-4"
            />
            <div className="flex justify-center gap-6 text-sm text-white/80 mb-4">
              <Link to="/about" className="hover:text-white">About Us</Link>
              <Link to="/courses" className="hover:text-white">Programs</Link>
              <Link to="/faq" className="hover:text-white">FAQs</Link>
              <Link to="/blogs" className="hover:text-white">Blog</Link>
            </div>
            <p className="text-white/60 text-sm">© 2024 OLL. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  }

  const renderStep = () => {
    switch (STEPS[currentStep].id) {
      case 'board':
        return (
          <div className="space-y-2 sm:space-y-3">
            {BOARDS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-4 sm:p-5 ${formData.board === option.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('board', option.value)}
                data-testid={`board-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'school_size':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {SCHOOL_SIZES.map(option => (
              <div
                key={option.value}
                className={`selection-card p-4 sm:p-5 ${formData.school_size === option.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('school_size', option.value)}
                data-testid={`size-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'fee_range':
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {FEE_RANGES.map(option => (
              <div
                key={option.value}
                className={`selection-card p-4 sm:p-5 ${formData.fee_range === option.value ? 'selected' : ''}`}
                onClick={() => handleSingleSelect('fee_range', option.value)}
                data-testid={`fee-${option.value}`}
              >
                <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">{option.label}</h3>
                <p className="text-xs sm:text-sm text-slate-500">{option.description}</p>
              </div>
            ))}
          </div>
        );

      case 'programs':
        return (
          <div className="space-y-2 sm:space-y-3">
            <p className="text-slate-600 mb-2 text-sm sm:text-base">Select all that apply</p>
            {PROGRAMS.map(option => (
              <div
                key={option.value}
                className={`selection-card p-3 sm:p-5 flex items-center gap-3 sm:gap-4 ${formData.programs_interested.includes(option.value) ? 'selected' : ''}`}
                onClick={() => toggleArrayItem('programs_interested', option.value)}
                data-testid={`program-${option.value}`}
              >
                <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                  formData.programs_interested.includes(option.value) 
                    ? 'bg-[#D63031] border-[#D63031]' 
                    : 'border-slate-300'
                }`}>
                  {formData.programs_interested.includes(option.value) && (
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#1E3A5F] text-sm sm:text-base">{option.label}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 truncate">{option.description}</p>
                </div>
              </div>
            ))}
          </div>
        );

      case 'support':
        // Get available support options based on selected programs
        const selectedPrograms = formData.programs_interested || [];
        const availableSupportOptions = selectedPrograms.length > 0 
          ? selectedPrograms.flatMap(prog => SUPPORT_OPTIONS[prog] || [])
          : Object.values(SUPPORT_OPTIONS).flat();
        
        return (
          <div className="space-y-4">
            <p className="text-slate-600 mb-2 text-sm sm:text-base">
              {selectedPrograms.length > 0 
                ? `Based on your interest in ${selectedPrograms.map(p => PROGRAMS.find(pr => pr.value === p)?.label).join(', ')}, here are specific offerings:`
                : 'Select specific programs you need:'}
            </p>
            
            {selectedPrograms.length > 0 ? (
              selectedPrograms.map(progKey => {
                const progInfo = PROGRAMS.find(p => p.value === progKey);
                const options = SUPPORT_OPTIONS[progKey] || [];
                
                return (
                  <div key={progKey} className="mb-6">
                    <h3 className="font-semibold text-[#1E3A5F] mb-3 text-sm sm:text-base border-b pb-2">
                      {progInfo?.label} Offerings:
                    </h3>
                    <div className="space-y-2">
                      {options.map(option => (
                        <div
                          key={option.value}
                          className={`selection-card p-3 sm:p-4 flex items-center gap-3 ${formData.support_needed.includes(option.value) ? 'selected' : ''}`}
                          onClick={() => toggleArrayItem('support_needed', option.value)}
                          data-testid={`support-${option.value}`}
                        >
                          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                            formData.support_needed.includes(option.value) 
                              ? 'bg-[#D63031] border-[#D63031]' 
                              : 'border-slate-300'
                          }`}>
                            {formData.support_needed.includes(option.value) && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <span className="text-slate-700 text-sm">{option.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-slate-500">
                <p>Please go back and select at least one program area to see specific offerings.</p>
              </div>
            )}
          </div>
        );

      case 'meeting_date':
        return (
          <div className="flex justify-center">
            <CalendarComponent
              mode="single"
              selected={formData.meeting_date}
              onSelect={(date) => {
                updateForm('meeting_date', date);
                if (date) {
                  setTimeout(() => setCurrentStep(prev => prev + 1), 200);
                }
              }}
              disabled={(date) => date < new Date() || date > addDays(new Date(), 14) || date.getDay() === 0}
              className="rounded-xl border border-slate-200"
              data-testid="meeting-calendar"
            />
          </div>
        );

      case 'meeting_time':
        return (
          <div>
            <p className="text-center text-slate-600 mb-4 text-sm sm:text-base">
              Selected: {formData.meeting_date ? format(formData.meeting_date, 'EEEE, MMMM d') : ''}
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {TIME_SLOTS.map(time => (
                <div
                  key={time}
                  className={`p-3 sm:p-4 rounded-xl border-2 text-center cursor-pointer transition-all ${
                    formData.meeting_time === time 
                      ? 'border-[#D63031] bg-red-50 text-[#D63031]' 
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onClick={() => handleSingleSelect('meeting_time', time)}
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
              <label className="block text-sm font-medium text-slate-700 mb-2">School Name</label>
              <Input
                placeholder="Enter school name"
                value={formData.school_name}
                onChange={(e) => updateForm('school_name', e.target.value)}
                className="input-glass"
                data-testid="school-name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">School Location / City</label>
              <Input
                placeholder="Enter city or location"
                value={formData.location}
                onChange={(e) => updateForm('location', e.target.value)}
                className="input-glass"
                data-testid="school-location"
              />
            </div>
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
                onChange={(e) => updateForm('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
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
      <Helmet>
        <title>School Partnership | Schedule Meeting for Robotics Lab | OLL</title>
        <meta name="description" content="Schedule a free meeting with OLL for Robotics Lab setup, STEM programs, AI curriculum for your ICSE, CBSE or State Board school. Get teacher training & student competitions support." />
        <meta name="keywords" content="school robotics partnership, STEM lab meeting, school AI program consultation, ICSE robotics program, CBSE STEM curriculum, school partnership inquiry" />
        <link rel="canonical" href="https://oll.co/school" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/school" />
        <meta property="og:title" content="School Partnership | Schedule Meeting | OLL" />
        <meta property="og:description" content="Schedule a free meeting for Robotics Lab, STEM programs for your school. Teacher training & competitions support." />
        <meta property="og:image" content="https://oll.co/og-image.png" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="School Partnership | OLL" />
        <meta name="twitter:description" content="Schedule a meeting for Robotics Lab & STEM programs for your school." />
        <meta name="twitter:image" content="https://oll.co/og-image.png" />
      </Helmet>
      <Navbar />

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar - Hidden on mobile */}
          <div className="mb-8 hidden sm:block">
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
                    }`} style={{ width: '12px' }} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-slate-500">
              Step {currentStep + 1} of {STEPS.length}
            </p>
          </div>
          
          {/* Mobile Step Counter */}
          <div className="mb-4 sm:hidden text-center">
            <span className="text-sm text-slate-500">Step {currentStep + 1} of {STEPS.length}</span>
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
                  {submitting ? 'Submitting...' : 'Schedule Meeting'}
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
