import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Eye, Award, Users, MapPin, Briefcase, Send, Check, ArrowRight, Play, Building2, GraduationCap } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

// Team Members Data
const TEAM_MEMBERS = [
  {
    name: 'Shreyaan Daga',
    role: 'Co-Founder & CEO',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Neha Kambli',
    role: 'Business Head',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face'
  },
  {
    name: 'Ritesh Rathore',
    role: 'Growth Partners',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face'
  }
];

// Board of Advisors Data
const ADVISORS = [
  {
    name: 'Ms. Vinita Mahajan',
    title: 'Honorary Advisor at OLL',
    description: 'Director Mount Litera Zee School - Pathankot. Ex Principal, JMK School CBSE - Pathankot for 17 Years.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/board-of-director-vinita-mahajan_10120609102024000000.webp'
  },
  {
    name: 'Lt Gen Surendra Kulkarni',
    title: 'Honorary Advisor at OLL',
    description: 'Former Director Mayo College, Ajmer. Army man turned into Educator. Ex Mayo Old Boy.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/lft-surendra-kulkarni_29081609002024000000.webp'
  },
  {
    name: 'Heather Anderson',
    title: 'President of World Genesis Foundation',
    description: 'Educator and advocate specializing in art therapy and youth empowerment. Supports UNESCO\'s mission for youth worldwide.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/untitled-design-4_30123010262024000000.webp'
  },
  {
    name: 'Dr. Neeta Bali',
    title: 'Honorary Advisor at OLL',
    description: 'Director Academics at MVN Group of Schools. Ex Director Principal GD Goenka & Seth Anandram Jaipuria Group of Schools.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/untitled-design-2_01130308282024000000.webp'
  },
  {
    name: 'Dr. Seema Negi',
    title: 'Managing Advisor at OLL',
    description: 'Director-Principal at Sanjeevani World. Global Goodwill Ambassador. International Trainer & TEDx Speaker.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/untitled-design-3_01130408242024000000.webp'
  },
  {
    name: 'Ms. Alka Singh',
    title: 'Honorary Advisor at OLL',
    description: 'Principal - Blue Bells Model School, Gurgaon. Gold Medalist in Economics with 30+ years of experience.',
    image: 'https://myoll.s3.ap-south-1.amazonaws.com/uploads/member/untitled-design-4_03175409182024000000.webp'
  }
];

// Timeline/Founder Journey Data
const FOUNDER_TIMELINE = [
  {
    year: '2019',
    title: 'The Beginning',
    description: 'OLL was founded with a vision to democratize skill education for students across India.',
    videoId: '5FUd_nUqpf4',
    videoTitle: 'OLL BackStory'
  },
  {
    year: '2021',
    title: 'Building the Platform',
    description: 'Launched online learning platform connecting students with expert educators nationwide.',
    videoId: '0zOewstS_6s',
    videoTitle: 'Introduction to OLL'
  },
  {
    date: 'Feb 1, 2023',
    year: '2023',
    title: 'Shark Tank India',
    description: 'Featured on Shark Tank India, showcasing our innovative approach to skill education and receiving national recognition.',
    videoId: 'dQw4w9WgXcQ',
    videoTitle: 'Shark Tank India Episode'
  },
  {
    date: 'Mar 4, 2025',
    year: '2025',
    title: 'Kaun Banega Crorepati',
    description: 'Recognized on KBC for transforming education across India and empowering millions of students.',
    videoId: 'dQw4w9WgXcQ',
    videoTitle: 'KBC Episode'
  }
];

const AboutPage = () => {
  const [showTeamForm, setShowTeamForm] = useState(false);
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [teamSubmitted, setTeamSubmitted] = useState(false);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);
  
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

  const handleTeamSubmit = async (e) => {
    e.preventDefault();
    if (!teamForm.name || !teamForm.email || !teamForm.role) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      // Submit to team applications CRM
      await axios.post(`${API}/team-applications`, {
        name: teamForm.name,
        email: teamForm.email,
        phone: teamForm.phone || '',
        role: teamForm.role,
        experience: teamForm.experience,
        city: teamForm.city,
        message: teamForm.message,
        source: 'about_page'
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
      <Navbar showBookDemo onBookDemo={() => window.location.href = '/student'} />

      {/* Hero */}
      <section className="pt-12 pb-8 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Building a Religion of Practical Learning
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Mission for 1 Billion Daily Learners
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
                To democratize skill education and empower every student with future-ready skills that prepare them for the jobs of tomorrow.
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
                To ignite the limitless potential of a billion learners every day by giving them access to limitless skills and a truly transformative learning experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Founder Timeline Section */}
      <section className="py-16 px-4 bg-white" data-testid="founder-timeline">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-12" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Our Journey
          </h2>
          
          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#D63031] to-[#1E3A5F] hidden md:block" />
            
            {FOUNDER_TIMELINE.map((item, index) => (
              <div key={index} className={`relative flex flex-col md:flex-row gap-8 mb-12 ${index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                {/* Timeline dot */}
                <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#D63031] border-4 border-white shadow-lg z-10" />
                
                {/* Content */}
                <div className={`flex-1 ${index % 2 === 0 ? 'md:pr-12 md:text-right' : 'md:pl-12'}`}>
                  <span className="inline-block px-4 py-1 rounded-full bg-[#D63031] text-white text-sm font-semibold mb-3">
                    {item.date || item.year}
                  </span>
                  <h3 className="text-xl font-bold text-[#1E3A5F] mb-2">{item.title}</h3>
                  <p className="text-slate-600 mb-4">{item.description}</p>
                  
                  {item.videoId && (
                    <button
                      onClick={() => setActiveVideo(item.videoId)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1E3A5F]/10 text-[#1E3A5F] hover:bg-[#1E3A5F]/20 transition-colors"
                      data-testid={`watch-video-${index}`}
                    >
                      <Play className="w-4 h-4" />
                      Watch: {item.videoTitle}
                    </button>
                  )}
                </div>
                
                {/* Spacer for alternating layout */}
                <div className="hidden md:block flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Video Modal */}
      {activeVideo && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setActiveVideo(null)}
        >
          <div className="relative w-full max-w-4xl aspect-video bg-black rounded-2xl overflow-hidden">
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=1`}
              title="YouTube video"
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            <button
              onClick={() => setActiveVideo(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Our Team Section */}
      <section className="py-16 px-4" data-testid="team-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Our Team
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Meet the passionate leaders driving OLL's mission forward
          </p>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {TEAM_MEMBERS.map((member, index) => (
              <div key={index} className="glass-card rounded-3xl p-6 text-center hover:shadow-xl transition-shadow" data-testid={`team-member-${index}`}>
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-4 border-white shadow-lg">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="text-lg font-bold text-[#1E3A5F] mb-1">{member.name}</h3>
                <p className="text-[#D63031] font-medium text-sm">{member.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Board of Advisors Section */}
      <section className="py-16 px-4 bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f]" data-testid="advisors-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Board of Advisors
          </h2>
          <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
            Industry leaders and education experts guiding our vision
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ADVISORS.map((advisor, index) => (
              <div key={index} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 hover:bg-white/20 transition-colors" data-testid={`advisor-${index}`}>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-white/20">
                    <img 
                      src={advisor.image} 
                      alt={advisor.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-white font-bold mb-1">{advisor.name}</h3>
                    <p className="text-[#D63031] text-sm font-medium mb-2">{advisor.title}</p>
                    <p className="text-white/70 text-sm leading-relaxed">{advisor.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Investors Section */}
      <section className="py-16 px-4 bg-white" data-testid="investors-section">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Our Investors
          </h2>
          <p className="text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            Backed by visionaries who believe in transforming education
          </p>
          
          <div className="flex flex-wrap justify-center items-center gap-8">
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <p className="text-slate-600 text-sm">Angel Investors & Strategic Partners</p>
            </div>
            <div className="glass-card rounded-2xl p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D63031] to-[#1E3A5F] flex items-center justify-center mx-auto mb-4">
                <GraduationCap className="w-10 h-10 text-white" />
              </div>
              <p className="text-slate-600 text-sm">EdTech Industry Leaders</p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-12 px-4">
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
              <div key={i} className="text-center p-4 glass-card rounded-2xl">
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
