import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Eye, Award, Users, MapPin, Briefcase, Send, Check, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_CONTENT = {
  mission: "To democratize skill education and empower every student with future-ready skills that prepare them for the jobs of tomorrow.",
  vision: "A world where every child has access to quality skill education, regardless of their background or location.",
  what_we_do: "OLL provides comprehensive skill education programs in Robotics, Coding, AI, Entrepreneurship, and Financial Literacy. We partner with schools, train educators, and organize competitions to create a complete ecosystem for skill development.",
  media_features: [
    { name: "Shark Tank India", description: "Featured on Shark Tank India Season 2 for our innovative approach to education" },
    { name: "Kaun Banega Crorepati", description: "Recognized by KBC for transforming rural education" },
    { name: "Economic Times", description: "Featured as Top 50 EdTech startups in India" },
  ],
  gallery_images: [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop",
  ],
};

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

const AboutPage = () => {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [teamSubmitted, setTeamSubmitted] = useState(false);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [teamForm, setTeamForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    experience: '',
    city: '',
    message: ''
  });

  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    investment_capacity: '',
    message: ''
  });

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get(`${API}/about`);
      if (response.data) {
        setContent({
          ...DEFAULT_CONTENT,
          ...response.data
        });
      }
    } catch (error) {
      // Use default content
    }
  };

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.email || !teamForm.role) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/educators/apply`, {
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone || '',
        skills: [teamForm.role],
        experience: teamForm.experience,
        grades_comfortable: [],
        city: teamForm.city,
        availability: 'Full-time',
        demo_ready: false
      });
      setTeamSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.email || !partnerForm.city) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/schools/inquiry`, {
        school_name: `Growth Partner - ${partnerForm.city}`,
        contact_name: partnerForm.name,
        email: partnerForm.email,
        phone: partnerForm.phone || '',
        location: partnerForm.city,
        school_size: partnerForm.investment_capacity || 'Not specified',
        fee_range: 'Growth Partner',
        programs_interested: ['franchise'],
        support_needed: ['partnership']
      });
      setPartnerSubmitted(true);
      toast.success('Application submitted successfully!');
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
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
            <div className="flex items-center gap-4">
              <Link to="/blogs" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">Blog</Link>
              <Link to="/faq" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">FAQ</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-12 pb-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            About OLL
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Leading a Skill Learning Revolution for Students Across India
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass-card rounded-3xl p-8" data-testid="mission-section">
              <div className="w-14 h-14 rounded-2xl bg-[#D63031]/10 flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-[#D63031]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our Mission
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {content.mission}
              </p>
            </div>
            <div className="glass-card rounded-3xl p-8" data-testid="vision-section">
              <div className="w-14 h-14 rounded-2xl bg-[#1E3A5F]/10 flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-[#1E3A5F]" />
              </div>
              <h2 className="text-2xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Our Vision
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {content.vision}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            What We Do
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: '🤖', title: 'Skill Education', desc: 'Robotics, Coding, AI' },
              { icon: '🏆', title: 'Competitions', desc: 'National & International' },
              { icon: '🔬', title: 'Lab Setup', desc: 'Complete infrastructure' },
              { icon: '👨‍🏫', title: 'Teacher Training', desc: 'Certified programs' },
            ].map((item, i) => (
              <div key={i} className="text-center p-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">{item.icon}</span>
                </div>
                <h3 className="font-semibold text-[#1E3A5F] text-sm md:text-base">{item.title}</h3>
                <p className="text-xs md:text-sm text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Media Features */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Featured In
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {content.media_features.map((feature, index) => (
              <div key={index} className="glass-card rounded-2xl p-6 text-center">
                <Award className="w-10 h-10 text-[#D63031] mx-auto mb-4" />
                <h3 className="font-semibold text-[#1E3A5F] mb-2">{feature.name}</h3>
                <p className="text-sm text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Join OLL Team Section */}
      <section className="py-12 px-4 bg-[#1E3A5F]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Briefcase className="w-12 h-12 text-white/80 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Join OLL Team
            </h2>
            <p className="text-white/70">
              Be part of India's skill learning revolution
            </p>
          </div>

          {!showTeamForm && !teamSubmitted && (
            <div className="text-center">
              <Button 
                onClick={() => setShowTeamForm(true)}
                className="bg-white text-[#1E3A5F] hover:bg-white/90 font-semibold px-8 py-3 rounded-full"
                data-testid="join-team-btn"
              >
                Apply Now
              </Button>
            </div>
          )}

          {teamSubmitted && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Application Submitted!</h3>
              <p className="text-white/70">We'll review your application and get back to you soon.</p>
            </div>
          )}

          {showTeamForm && !teamSubmitted && (
            <form onSubmit={handleTeamSubmit} className="bg-white rounded-2xl p-6 md:p-8 animate-slide-up">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <Input
                    placeholder="Your name"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({...teamForm, name: e.target.value})}
                    data-testid="team-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={teamForm.email}
                    onChange={(e) => setTeamForm({...teamForm, email: e.target.value})}
                    data-testid="team-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <Input
                    placeholder="Your phone"
                    value={teamForm.phone}
                    onChange={(e) => setTeamForm({...teamForm, phone: e.target.value})}
                    data-testid="team-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Role Interested In *</label>
                  <select
                    value={teamForm.role}
                    onChange={(e) => setTeamForm({...teamForm, role: e.target.value})}
                    className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                    data-testid="team-role"
                  >
                    <option value="">Select role</option>
                    <option value="Educator">Educator / Trainer</option>
                    <option value="Sales">Sales</option>
                    <option value="Operations">Operations</option>
                    <option value="Content">Content</option>
                    <option value="Technology">Technology</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
                  <select
                    value={teamForm.city}
                    onChange={(e) => setTeamForm({...teamForm, city: e.target.value})}
                    className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                    data-testid="team-city"
                  >
                    <option value="">Select city</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Experience</label>
                  <Input
                    placeholder="e.g., 3 years in education"
                    value={teamForm.experience}
                    onChange={(e) => setTeamForm({...teamForm, experience: e.target.value})}
                    data-testid="team-experience"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Why do you want to join OLL?</label>
                <Textarea
                  placeholder="Tell us about yourself..."
                  value={teamForm.message}
                  onChange={(e) => setTeamForm({...teamForm, message: e.target.value})}
                  className="min-h-[100px]"
                  data-testid="team-message"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowTeamForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Get OLL in Your City Section */}
      <section className="py-12 px-4 bg-gradient-to-br from-[#D63031] to-[#e84142]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <MapPin className="w-12 h-12 text-white/80 mx-auto mb-4" />
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Get OLL in Your City
            </h2>
            <p className="text-white/80">
              Become a Growth Partner and bring skill education to your community
            </p>
          </div>

          {!showPartnerForm && !partnerSubmitted && (
            <div className="text-center">
              <Button 
                onClick={() => setShowPartnerForm(true)}
                className="bg-white text-[#D63031] hover:bg-white/90 font-semibold px-8 py-3 rounded-full"
                data-testid="growth-partner-btn"
              >
                Become a Partner
              </Button>
            </div>
          )}

          {partnerSubmitted && (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-[#D63031]" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Application Submitted!</h3>
              <p className="text-white/80">Our partnership team will contact you within 48 hours.</p>
            </div>
          )}

          {showPartnerForm && !partnerSubmitted && (
            <form onSubmit={handlePartnerSubmit} className="bg-white rounded-2xl p-6 md:p-8 animate-slide-up">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                  <Input
                    placeholder="Your name"
                    value={partnerForm.name}
                    onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})}
                    data-testid="partner-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                  <Input
                    type="email"
                    placeholder="Your email"
                    value={partnerForm.email}
                    onChange={(e) => setPartnerForm({...partnerForm, email: e.target.value})}
                    data-testid="partner-email"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                  <Input
                    placeholder="Your phone"
                    value={partnerForm.phone}
                    onChange={(e) => setPartnerForm({...partnerForm, phone: e.target.value})}
                    data-testid="partner-phone"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">City *</label>
                  <select
                    value={partnerForm.city}
                    onChange={(e) => setPartnerForm({...partnerForm, city: e.target.value})}
                    className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                    data-testid="partner-city"
                  >
                    <option value="">Select city</option>
                    {CITIES.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                    <option value="Other">Other City</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Investment Capacity</label>
                <select
                  value={partnerForm.investment_capacity}
                  onChange={(e) => setPartnerForm({...partnerForm, investment_capacity: e.target.value})}
                  className="w-full h-10 px-4 border border-slate-200 rounded-lg"
                  data-testid="partner-investment"
                >
                  <option value="">Select range</option>
                  <option value="5-10 Lakhs">₹5-10 Lakhs</option>
                  <option value="10-25 Lakhs">₹10-25 Lakhs</option>
                  <option value="25-50 Lakhs">₹25-50 Lakhs</option>
                  <option value="50+ Lakhs">₹50+ Lakhs</option>
                </select>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tell us about your background</label>
                <Textarea
                  placeholder="Your professional background, why you want to partner..."
                  value={partnerForm.message}
                  onChange={(e) => setPartnerForm({...partnerForm, message: e.target.value})}
                  className="min-h-[100px]"
                  data-testid="partner-message"
                />
              </div>
              <div className="flex gap-3 mt-6">
                <Button type="button" variant="outline" onClick={() => setShowPartnerForm(false)} className="flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="btn-primary flex-1">
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Gallery */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gallery
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {content.gallery_images.map((image, index) => (
              <div key={index} className="aspect-square rounded-2xl overflow-hidden">
                <img 
                  src={image} 
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1E3A5F] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/rugags0w_OLL-horizontal-logo-white.png" 
            alt="OLL" 
            className="h-10 mx-auto mb-4"
          />
          <p className="text-white/70 text-sm">
            © 2024 OLL. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
