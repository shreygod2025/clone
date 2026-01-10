import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Briefcase, MapPin, Clock, Users, HelpCircle, Send } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SKILLS = ['Robotics', 'Coding', 'AI & ML', 'Entrepreneurship', 'Financial Literacy'];
const GRADES = ['Pre-primary', 'Primary (1-5)', 'Middle (6-8)', 'High School (9-10)', 'Senior (11-12)'];
const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];
const AVAILABILITY = ['Weekday Mornings', 'Weekday Afternoons', 'Weekday Evenings', 'Weekends'];

const EducatorFunnel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('apply');
  const [requirements, setRequirements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    skills: [],
    experience: '',
    grades_comfortable: [],
    city: '',
    availability: '',
    demo_ready: false,
  });

  useEffect(() => {
    fetchRequirements();
  }, []);

  const fetchRequirements = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/requirements`);
      setRequirements(response.data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone || formData.skills.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/educators/apply`, formData);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit application. Please try again.');
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
            Application Submitted!
          </h2>
          <p className="text-slate-600 mb-6">
            Thank you for your interest in joining OLL. Our team will review your application and get back to you within 3-5 business days.
          </p>
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
              Join OLL as an Educator
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Share your expertise and be part of India's skill learning revolution. 
              We're looking for passionate educators to join our growing network.
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-slate-100 p-1 rounded-full">
              <TabsTrigger 
                value="apply" 
                className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="tab-apply"
              >
                Apply to Join
              </TabsTrigger>
              <TabsTrigger 
                value="requirements" 
                className="rounded-full data-[state=active]:bg-white data-[state=active]:shadow-sm"
                data-testid="tab-requirements"
              >
                Open Requirements
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
                      <Input
                        placeholder="Enter your phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        className="input-glass h-10 sm:h-12"
                        data-testid="educator-phone"
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">City</label>
                      <select
                        value={formData.city}
                        onChange={(e) => setFormData({...formData, city: e.target.value})}
                        className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none text-sm sm:text-base"
                        data-testid="educator-city"
                      >
                        <option value="">Select City</option>
                        {CITIES.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Professional Info */}
                  <div className="space-y-3 sm:space-y-4">
                    <h3 className="font-semibold text-[#1E3A5F] text-base sm:text-lg">Professional Details</h3>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-1.5 sm:mb-2">Skills You Can Teach *</label>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {SKILLS.map(skill => (
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
                        {GRADES.map(grade => (
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
                      <select
                        value={formData.availability}
                        onChange={(e) => setFormData({...formData, availability: e.target.value})}
                        className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl focus:border-[#1E3A5F] focus:outline-none text-sm sm:text-base"
                        data-testid="educator-availability"
                      >
                        <option value="">Select Availability</option>
                        {AVAILABILITY.map(a => (
                          <option key={a} value={a}>{a}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Checkbox
                        id="demo_ready"
                        checked={formData.demo_ready}
                        onCheckedChange={(checked) => setFormData({...formData, demo_ready: checked})}
                        data-testid="demo-ready-checkbox"
                      />
                      <label htmlFor="demo_ready" className="text-xs sm:text-sm text-slate-600">
                        I am ready to give a demo class
                      </label>
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
                    disabled={submitting}
                    className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
                    data-testid="submit-application-btn"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                    <Send className="w-4 h-4" />
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
                    <h3 className="font-semibold text-[#1E3A5F] mb-2">No Open Requirements</h3>
                    <p className="text-slate-500 mb-4">Check back later for new opportunities.</p>
                    <Button 
                      onClick={() => setActiveTab('apply')} 
                      className="btn-primary"
                      data-testid="apply-anyway-btn"
                    >
                      Apply Anyway
                    </Button>
                  </div>
                ) : (
                  requirements.map(req => (
                    <div key={req.id} className="glass-card rounded-2xl p-6 hover:shadow-lg transition-shadow">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1E3A5F] text-lg mb-2">{req.title}</h3>
                          <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-3">
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
                          <p className="text-slate-600 text-sm">{req.description}</p>
                        </div>
                        <Button
                          onClick={() => setActiveTab('apply')}
                          className="btn-primary shrink-0"
                          data-testid={`apply-req-${req.id}`}
                        >
                          Apply Now
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
    </div>
  );
};

export default EducatorFunnel;
