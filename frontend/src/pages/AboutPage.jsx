import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Target, Eye, Award, Users, MapPin, Briefcase, Send, Check, ArrowRight, Play, Building2, GraduationCap, Instagram, Linkedin, ExternalLink } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SchoolCaseStudies from '../components/SchoolCaseStudies';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 
  'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Kochi'
];

// Founder Info
const FOUNDER = {
  name: 'Shreyaan Daga',
  role: 'Founder & CEO',
  image: 'https://customer-assets.emergentagent.com/job_teach-n-learn-2/artifacts/8bxvdilp_Shreyaan%20Daga%20%282%29.jpg',
  instagram: 'https://www.instagram.com/shrey.daga/?hl=en',
  linkedin: 'https://in.linkedin.com/in/shreyaandaga',
  timeline: [
    { age: 8, event: 'Started entrepreneurship journey by selling paintings' },
    { age: 13, event: 'Joined the stock market as an intern' },
    { age: 14, event: 'Started giving loans to school friends' },
    { age: 15, event: 'Founded OLL' }
  ]
};

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
    year: '2020',
    date: 'April 4, 2020',
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
    videoId: 'aVzl6yzPPTw',
    videoTitle: 'Shark Tank India Episode',
    showEmbed: true
  },
  {
    date: 'Mar 4, 2025',
    year: '2025',
    title: 'Kaun Banega Crorepati',
    description: 'Recognized on KBC for transforming education across India and empowering millions of students.',
    videoId: '8M3A_InpVKw',
    videoTitle: 'KBC Episode',
    videoStart: 883,
    showEmbed: true
  }
];

const AboutPage = () => {
  const [showPartnerForm, setShowPartnerForm] = useState(false);
  const [partnerSubmitted, setPartnerSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeVideo, setActiveVideo] = useState(null);

  const [partnerForm, setPartnerForm] = useState({
    name: '',
    email: '',
    phone: '',
    city: '',
    investment_capacity: '',
    message: ''
  });

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    if (!partnerForm.name || !partnerForm.email || !partnerForm.city) {
      toast.error('Please fill required fields');
      return;
    }
    setSubmitting(true);
    try {
      // Submit to growth partners CRM
      await axios.post(`${API}/growth-partners`, {
        name: partnerForm.name,
        email: partnerForm.email,
        phone: partnerForm.phone || '',
        city: partnerForm.city,
        interest_type: 'franchise',
        details: `Investment capacity: ${partnerForm.investment_capacity || 'Not specified'}. Message: ${partnerForm.message || 'N/A'}`,
        source: 'about_page'
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
    <>
      <Helmet>
        <title>About OLL - Skill Education & Robotics Classes India</title>
        <meta name="description" content="Learn about OLL - India's leading skill education platform. Mission for 1 Billion Learners. Meet founder Shreyaan Daga and our advisors." />
        <meta name="keywords" content="about OLL, skill education India, robotics education company, coding for kids, AI education, entrepreneurship training, Shreyaan Daga, Clonefutura Live Solutions" />
        <link rel="canonical" href="https://oll.co/about" />
        <meta property="og:title" content="About OLL - Skill Education Platform" />
        <meta property="og:description" content="Mission for 1 Billion Daily Learners. Learn about our journey and vision." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://oll.co/about" />
      </Helmet>
      
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <Navbar variant="about" />

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

      {/* Founder Story Section */}
      <section className="py-16 px-4" data-testid="founder-section">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-[#D63031] font-bold text-sm tracking-wider uppercase mb-2">A Brand</p>
            <h2 className="text-2xl md:text-4xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              FOR THE STUDENTS, BY THE STUDENTS
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Founder Image & Info */}
            <div className="text-center md:text-left">
              <div className="relative inline-block mb-6">
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-3xl overflow-hidden mx-auto md:mx-0 shadow-2xl border-4 border-white">
                  <img 
                    src={FOUNDER.image}
                    alt={FOUNDER.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-4 -right-4 bg-gradient-to-r from-[#D63031] to-[#e74c3c] text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                  Started at 15
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-[#1E3A5F] mb-1">{FOUNDER.name}</h3>
              <p className="text-[#D63031] font-medium mb-4">{FOUNDER.role}</p>
              
              {/* Social Links */}
              <div className="flex gap-3 justify-center md:justify-start">
                <a 
                  href={FOUNDER.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  <Instagram className="w-4 h-4" />
                  Instagram
                </a>
                <a 
                  href={FOUNDER.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#0077B5] text-white text-sm font-medium hover:shadow-lg transition-shadow"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </a>
              </div>
            </div>
            
            {/* Journey Timeline */}
            <div>
              <h4 className="text-lg font-bold text-[#1E3A5F] mb-6">The Entrepreneurial Journey</h4>
              <div className="space-y-4">
                {FOUNDER.timeline.map((item, index) => (
                  <div key={index} className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#1E3A5F] to-[#2d5a8f] flex items-center justify-center text-white font-bold shadow-lg">
                      <div className="text-center">
                        <div className="text-xs opacity-70">Age</div>
                        <div className="text-lg">{item.age}</div>
                      </div>
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-slate-700">{item.event}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              <p className="mt-8 text-slate-600 leading-relaxed">
                Shreyaan Daga started his entrepreneurship journey at the age of 8, with a burning passion to make a difference. 
                From selling paintings at 13, interning at the stock market, giving loans to friends at school, 
                to finally founding OLL at 15 — his mission has always been to <span className="font-bold text-[#1E3A5F]">help students unlock their potential</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Media Features - Shark Tank & KBC Videos */}
      <section className="py-16 px-4 bg-gradient-to-br from-slate-900 to-slate-800" data-testid="media-features-section">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            As Seen On
          </h2>
          <p className="text-white/70 text-center mb-12 max-w-2xl mx-auto">
            OLL&apos;s journey featured on national television
          </p>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Shark Tank Video */}
            <div className="glass-card rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/aVzl6yzPPTw"
                  title="OLL on Shark Tank India"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="text-white font-bold text-lg">Shark Tank India</h3>
                <p className="text-white/70 text-sm">Featured on Shark Tank India Season 1</p>
              </div>
            </div>
            
            {/* KBC Video */}
            <div className="glass-card rounded-2xl overflow-hidden bg-white/5 backdrop-blur-sm">
              <div className="aspect-video">
                <iframe
                  width="100%"
                  height="100%"
                  src="https://www.youtube.com/embed/8M3A_InpVKw?start=883"
                  title="OLL on Kaun Banega Crorepati"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>
              <div className="p-4">
                <h3 className="text-white font-bold text-lg">Kaun Banega Crorepati</h3>
                <p className="text-white/70 text-sm">Featured on KBC with Amitabh Bachchan</p>
              </div>
            </div>
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

      {/* Our School Partners - Videos First */}
      <SchoolCaseStudies 
        title="Our School Partners" 
        subtitle="Hear from the schools transforming education with OLL"
      />

      {/* Schools We Work With - Names */}
      <section className="py-12 px-4 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-white text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Schools We Work With
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              'Greenlawns High School', 'G.D. Somani Memorial School', 'N.L. Dalmia High School',
              'Hiranandani Foundation School', 'JBCN International School', 'Seven Square Academy',
              'Goregaon Education Society English Medium School', 'Sanjeevani World School',
              'Fravashi International Academy', 'Maneckji Cooper Education Trust', 'Excelsior School',
              'J.N. Petit School', 'Seth Anandram Jaipuria School', 'St. Kabir School',
              'St. Gregorios High School', 'St. Anne\'s High School Fort', 'St. Wilfred\'s School',
              'Manav Mandir High School', 'Jankidevi Public School', 'Guardian School',
              'Parle Tilak Vidyalaya', 'JB Vachha High School', 'Vedas International School',
              'C.N.M. & N.D. Parekh ICSE School', 'Ram Ratna International School', 'Navodaya Central School'
            ].map((school, idx) => (
              <span key={idx} className="px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                {school}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Our Events */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1E3A5F] text-center mb-8" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Our Events
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-video bg-slate-100 relative group">
                <img 
                  src="https://img.youtube.com/vi/KJMH8EAB6NI/maxresdefault.jpg" 
                  alt="Skill Titans"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://img.youtube.com/vi/KJMH8EAB6NI/hqdefault.jpg'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <span className="px-3 py-1 bg-[#D63031] text-white text-xs rounded-full">
                    National TV Show
                  </span>
                </div>
                <a 
                  href="https://www.youtube.com/watch?v=KJMH8EAB6NI"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Play className="w-6 h-6 text-[#D63031] ml-1" />
                </a>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#1E3A5F] mb-1">Skill Titans - TV Show on CNBC TV18</h3>
                <p className="text-sm text-slate-600">India&apos;s first show where school students pitch to real investors</p>
              </div>
            </div>
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="aspect-video bg-slate-100 relative group">
                <img 
                  src="https://img.youtube.com/vi/B0n8-RYegVc/maxresdefault.jpg" 
                  alt="IIT Bombay Techfest"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.src = 'https://img.youtube.com/vi/B0n8-RYegVc/hqdefault.jpg'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
                  <span className="px-3 py-1 bg-[#1E3A5F] text-white text-xs rounded-full">
                    National Level Competition
                  </span>
                </div>
                <a 
                  href="https://www.youtube.com/watch?v=B0n8-RYegVc"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform"
                >
                  <Play className="w-6 h-6 text-[#D63031] ml-1" />
                </a>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#1E3A5F] mb-1">OLL Robotics Competition at IIT Bombay Techfest 2025</h3>
                <p className="text-sm text-slate-600">Our students compete at India&apos;s largest science and technology festival</p>
              </div>
            </div>
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
            <p className="text-white/70 mb-8">
              Be part of India&apos;s skill learning revolution. We&apos;re looking for passionate individuals who want to make a difference.
            </p>
            
            <Link 
              to="/join-team"
              className="inline-flex items-center gap-2 bg-white text-[#1E3A5F] hover:bg-white/90 font-semibold px-8 py-3 rounded-full transition-colors"
              data-testid="join-team-btn"
            >
              Apply Now
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
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

          <div className="text-center">
            <Link 
              to="/growth-partner"
              className="inline-flex items-center gap-2 bg-white text-[#D63031] hover:bg-white/90 font-semibold px-8 py-3 rounded-full transition-colors"
              data-testid="growth-partner-btn"
            >
              Become a Partner
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
    </>
  );
};

export default AboutPage;
