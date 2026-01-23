import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { User, Mail, Phone, MapPin, Briefcase, Send, Check, Users, Clock, Target, Heart, Upload, FileText, X, ChevronRight, Building2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi', 'Other'
];

const EXPERIENCE_LEVELS = [
  'Student / Intern',
  'Fresher (0-1 years)',
  '1-3 years',
  '3-5 years',
  '5+ years'
];

const AVAILABILITY = [
  'Full-time',
  'Part-time',
  'Internship',
  'Freelance / Project-based'
];

const JoinTeamPage = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openPositions, setOpenPositions] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    experience: '',
    city: '',
    otherCity: '',
    availability: '',
    linkedin: '',
    portfolio: '',
    resume_url: '',
    message: ''
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    fetchOpenPositions();
  }, []);

  const fetchOpenPositions = async () => {
    try {
      const response = await axios.get(`${API}/team-requirements`);
      setOpenPositions(response.data);
    } catch (error) {
      console.error('Failed to fetch positions:', error);
    }
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size should be less than 5MB');
      return;
    }

    setUploadingResume(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', 'resume');

    try {
      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setForm(prev => ({ ...prev, resume_url: response.data.url }));
      setResumeFile(file);
      toast.success('Resume uploaded successfully!');
    } catch (error) {
      toast.error('Failed to upload resume');
    } finally {
      setUploadingResume(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!form.name || !form.email || !form.phone) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      const submitData = {
        ...form,
        city: form.city === 'Other' ? form.otherCity : form.city,
        role: selectedPosition ? selectedPosition.title : form.role,
        applied_position_id: selectedPosition?.id || null,
        source: selectedPosition ? 'open_position' : 'general'
      };
      
      await axios.post(`${API}/team-applications`, submitData);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const applyForPosition = (position) => {
    setSelectedPosition(position);
    setForm(prev => ({ ...prev, role: position.title }));
    setActiveTab('general');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header with Logo */}
        <header className="bg-white border-b border-slate-200 py-4">
          <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <img 
                src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                alt="OLL" 
                className="h-10"
              />
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-[#1E3A5F] mb-4">Application Submitted!</h1>
            <p className="text-slate-600 mb-8">
              Thank you for your interest in joining OLL. Our team will review your application and get back to you within 5-7 business days.
            </p>
            <Link to="/">
              <Button className="bg-[#1E3A5F] hover:bg-[#2d4a6f]">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Logo */}
      <header className="bg-white border-b border-slate-200 py-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
              alt="OLL" 
              className="h-10"
            />
          </Link>
          <div className="text-sm text-slate-500">Join Our Team</div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Users className="w-16 h-16 text-white/80 mx-auto mb-4" />
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Join OLL Team
          </h1>
          <p className="text-white/80 text-lg max-w-2xl mx-auto">
            Be part of India's skill learning revolution. We're looking for passionate individuals.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm">
          <button
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'general'
                ? 'bg-[#1E3A5F] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            data-testid="tab-general"
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              General Application
            </div>
          </button>
          <button
            onClick={() => setActiveTab('positions')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${
              activeTab === 'positions'
                ? 'bg-[#1E3A5F] text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            data-testid="tab-positions"
          >
            <div className="flex items-center justify-center gap-2">
              <Briefcase className="w-4 h-4" />
              Open Requirements ({openPositions.length})
            </div>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'general' ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8">
            {selectedPosition && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-blue-700">
                  Applying for: <strong>{selectedPosition.title}</strong>
                  <button 
                    onClick={() => setSelectedPosition(null)}
                    className="ml-2 text-blue-500 hover:text-blue-700"
                  >
                    (Clear)
                  </button>
                </p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Enter your full name"
                      className="pl-10"
                      required
                      data-testid="input-name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit mobile number"
                      className="pl-10"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role Interested In</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g., Content Writer, Developer"
                      className="pl-10"
                      data-testid="input-role"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Experience Level</label>
                  <select
                    value={form.experience}
                    onChange={(e) => setForm({ ...form, experience: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                    data-testid="select-experience"
                  >
                    <option value="">Select experience</option>
                    {EXPERIENCE_LEVELS.map(level => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                  <select
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                    data-testid="select-city"
                  >
                    <option value="">Select city</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
              </div>

              {form.city === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Your City</label>
                  <Input
                    value={form.otherCity}
                    onChange={(e) => setForm({ ...form, otherCity: e.target.value })}
                    placeholder="Enter your city"
                    data-testid="input-other-city"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Availability</label>
                <select
                  value={form.availability}
                  onChange={(e) => setForm({ ...form, availability: e.target.value })}
                  className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white"
                  data-testid="select-availability"
                >
                  <option value="">Select availability</option>
                  {AVAILABILITY.map(avail => (
                    <option key={avail} value={avail}>{avail}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">LinkedIn Profile</label>
                  <Input
                    value={form.linkedin}
                    onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    data-testid="input-linkedin"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Portfolio / Website</label>
                  <Input
                    value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                    placeholder="https://..."
                    data-testid="input-portfolio"
                  />
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resume</label>
                {resumeFile || form.resume_url ? (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <FileText className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-700 flex-1">
                      {resumeFile?.name || 'Resume uploaded'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setResumeFile(null);
                        setForm(prev => ({ ...prev, resume_url: '' }));
                      }}
                      className="p-1 hover:bg-green-100 rounded"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-[#1E3A5F] transition-colors">
                    <Upload className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-sm text-slate-500">
                      {uploadingResume ? 'Uploading...' : 'Upload Resume (PDF/DOC)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                      data-testid="input-resume"
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Why do you want to join OLL?</label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about yourself and why you'd be a great fit..."
                  rows={4}
                  data-testid="input-message"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#D63031] hover:bg-[#b52828] py-6"
                data-testid="submit-btn"
              >
                {submitting ? (
                  'Submitting...'
                ) : (
                  <>
                    <Send className="w-5 h-5 mr-2" />
                    Submit Application
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-4">
            {openPositions.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center">
                <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">No Open Positions</h3>
                <p className="text-slate-500 mb-4">
                  We don't have any specific openings right now, but we're always looking for talented people.
                </p>
                <Button onClick={() => setActiveTab('general')} className="bg-[#1E3A5F]">
                  Submit General Application
                </Button>
              </div>
            ) : (
              openPositions.map((position) => (
                <div
                  key={position.id}
                  className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`position-${position.id}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-[#1E3A5F] mb-1">{position.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm text-slate-500 mb-3">
                        <span className="flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {position.department}
                        </span>
                        {position.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {position.location}
                          </span>
                        )}
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-xs">
                          {position.type?.replace('_', ' ')}
                        </span>
                      </div>
                      {position.description && (
                        <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                          {position.description}
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => applyForPosition(position)}
                      className="bg-[#D63031] hover:bg-[#b52828] shrink-0"
                      data-testid={`apply-${position.id}`}
                    >
                      Apply Now
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Why Join OLL */}
        <div className="mt-12 grid md:grid-cols-4 gap-4">
          {[
            { icon: Target, title: 'Mission-Driven', desc: 'Work towards transforming education' },
            { icon: Users, title: 'Great Team', desc: 'Collaborate with passionate people' },
            { icon: Clock, title: 'Flexibility', desc: 'Remote & hybrid options' },
            { icon: Heart, title: 'Growth', desc: 'Learn and grow with us' },
          ].map((item, i) => (
            <div key={i} className="text-center p-4 bg-white rounded-xl shadow-sm">
              <item.icon className="w-8 h-8 text-[#D63031] mx-auto mb-2" />
              <h4 className="font-semibold text-[#1E3A5F] text-sm">{item.title}</h4>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default JoinTeamPage;
