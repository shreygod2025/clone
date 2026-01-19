import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { User, Mail, Phone, MapPin, Briefcase, Send, Check, ArrowLeft, Users, Clock, Target, Heart, Upload, FileText, X } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';

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
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [openPositions, setOpenPositions] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  
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

  // Scroll to top on mount
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

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or Word document');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setResumeFile(file);
    setUploadingResume(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'resume');

      const response = await axios.post(`${API}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setForm({ ...form, resume_url: response.data.url });
      toast.success('Resume uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload resume. You can still submit and send it later.');
      // Keep the file name for display but clear the upload
      setForm({ ...form, resume_url: '' });
    } finally {
      setUploadingResume(false);
    }
  };

  const removeResume = () => {
    setResumeFile(null);
    setForm({ ...form, resume_url: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.role || !form.phone) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setSubmitting(true);
    try {
      await axios.post(`${API}/team-applications`, {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: form.role,
        experience: form.experience,
        city: form.city === 'Other' ? form.otherCity : form.city,
        availability: form.availability,
        linkedin: form.linkedin,
        portfolio: form.portfolio,
        resume_url: form.resume_url,
        message: form.message,
        source: 'website'
      });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[80vh] px-4">
          <div className="glass-card rounded-3xl p-8 md:p-12 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Application Submitted! 🎉
            </h2>
            <p className="text-slate-600 mb-6">
              Thank you for your interest in joining OLL! We'll review your application and get back to you soon.
            </p>
            <p className="text-sm text-slate-500 mb-8">
              In the meantime, follow us on social media to stay updated with our journey!
            </p>
            <div className="flex gap-4 justify-center">
              <Link 
                to="/" 
                className="px-6 py-2.5 rounded-full bg-[#1E3A5F] text-white font-medium hover:bg-[#2d5a8f] transition-colors"
              >
                Back to Home
              </Link>
              <Link 
                to="/about" 
                className="px-6 py-2.5 rounded-full border-2 border-[#1E3A5F] text-[#1E3A5F] font-medium hover:bg-[#1E3A5F]/5 transition-colors"
              >
                About OLL
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-24 pb-12 px-4 bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f]">
        <div className="max-w-4xl mx-auto text-center">
          <Link 
            to="/about" 
            className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to About
          </Link>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Join the OLL Team
          </h1>
          <p className="text-lg text-white/80 mb-6 max-w-2xl mx-auto">
            Be part of a student-led revolution in skill education. We're building something special, and we want passionate people to join us.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-white/70 text-sm">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Young & Dynamic Team
            </span>
            <span className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Mission-Driven Work
            </span>
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              For Students, By Students
            </span>
          </div>
        </div>
      </section>

      {/* Open Positions (Requirements) */}
      {openPositions.length > 0 && (
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-6 text-center">Current Openings</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {openPositions.map((position, index) => (
                <div 
                  key={index} 
                  className="glass-card rounded-xl p-4 border-l-4 border-[#D63031] cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setForm({ ...form, role: position.title })}
                >
                  <h3 className="font-bold text-[#1E3A5F]">{position.title}</h3>
                  <p className="text-sm text-slate-600 mt-1">{position.description}</p>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{position.type}</span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{position.city}</span>
                    {position.skills_required?.map((skill, i) => (
                      <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{skill}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Application Form */}
      <section className="py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="glass-card rounded-3xl p-6 md:p-8">
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2 text-center" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Apply Now
            </h2>
            <p className="text-slate-600 text-center mb-8 text-sm">
              Tell us about yourself and the role you're interested in
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Info */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Your full name"
                      className="pl-10"
                      required
                      data-testid="team-name-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="your@email.com"
                      className="pl-10"
                      required
                      data-testid="team-email-input"
                    />
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="10-digit phone number"
                      className="pl-10"
                      required
                      data-testid="team-phone-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    City
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] bg-white text-sm"
                      data-testid="team-city-select"
                    >
                      <option value="">Select city</option>
                      {CITIES.map(city => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {form.city === 'Other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Your City
                  </label>
                  <Input
                    value={form.otherCity}
                    onChange={(e) => setForm({ ...form, otherCity: e.target.value })}
                    placeholder="Enter your city"
                    data-testid="team-other-city-input"
                  />
                </div>
              )}

              {/* Role & Experience */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Role Interested In <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={form.role}
                      onChange={(e) => setForm({ ...form, role: e.target.value })}
                      placeholder="e.g., Marketing, Design, Sales..."
                      className="pl-10"
                      required
                      data-testid="team-role-input"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Experience Level
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select
                      value={form.experience}
                      onChange={(e) => setForm({ ...form, experience: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E3A5F]/20 focus:border-[#1E3A5F] bg-white text-sm"
                      data-testid="team-experience-select"
                    >
                      <option value="">Select experience</option>
                      {EXPERIENCE_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Availability
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {AVAILABILITY.map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setForm({ ...form, availability: option })}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        form.availability === option
                          ? 'bg-[#1E3A5F] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                      data-testid={`availability-${option.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resume Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Resume / CV
                </label>
                {!resumeFile ? (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-[#1E3A5F] hover:bg-slate-50 transition-all">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-[#1E3A5F]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">PDF or Word (Max 5MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.doc,.docx"
                      onChange={handleResumeUpload}
                      data-testid="resume-upload-input"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="text-sm font-medium text-slate-700">{resumeFile.name}</p>
                        <p className="text-xs text-slate-500">
                          {uploadingResume ? 'Uploading...' : form.resume_url ? 'Uploaded successfully' : 'Ready to submit'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeResume}
                      className="p-1 hover:bg-red-100 rounded-full transition-colors"
                    >
                      <X className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                )}
              </div>

              {/* Links */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    LinkedIn Profile
                  </label>
                  <Input
                    type="url"
                    value={form.linkedin}
                    onChange={(e) => setForm({ ...form, linkedin: e.target.value })}
                    placeholder="https://linkedin.com/in/..."
                    data-testid="team-linkedin-input"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Portfolio / Website
                  </label>
                  <Input
                    type="url"
                    value={form.portfolio}
                    onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                    placeholder="https://..."
                    data-testid="team-portfolio-input"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Why do you want to join OLL?
                </label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us about yourself and why you're excited to join OLL..."
                  rows={4}
                  data-testid="team-message-textarea"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || uploadingResume}
                className="w-full bg-gradient-to-r from-[#D63031] to-[#e74c3c] hover:from-[#c0392b] hover:to-[#D63031] text-white py-3 rounded-xl font-semibold text-base"
                data-testid="team-submit-btn"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Submit Application
                  </span>
                )}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default JoinTeamPage;
