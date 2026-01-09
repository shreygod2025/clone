import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Target, Eye, Award, Users, Image, Newspaper, ArrowRight } from 'lucide-react';
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
  team_members: [
    { name: "Founder & CEO", role: "Vision & Strategy", image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop" },
    { name: "Head of Education", role: "Curriculum Design", image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop" },
    { name: "Head of Operations", role: "School Partnerships", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop" },
  ],
  gallery_images: [
    "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop",
    "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop",
  ],
  updates: [
    { title: "New Center Launch", description: "Opened 10 new centers across Tier-2 cities", date: "Dec 2024" },
    { title: "Competition Winners", description: "OLL students won 15 medals at National Robotics Championship", date: "Nov 2024" },
  ]
};

const AboutPage = () => {
  const [content, setContent] = useState(DEFAULT_CONTENT);

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
            <div className="flex items-center gap-4">
              <Link to="/blogs" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">Blog</Link>
              <Link to="/faq" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors hidden sm:block">FAQ</Link>
              <Link to="/" className="btn-primary text-sm py-2 px-6" data-testid="get-started-btn">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-24 pb-16 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
            About OLL
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            Leading a Skill Learning Revolution for Students Across India
          </p>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8">
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
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12" style={{ fontFamily: 'Manrope, sans-serif' }}>
            What We Do
          </h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🤖</span>
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2">Skill Education</h3>
              <p className="text-sm text-slate-600">Robotics, Coding, AI & more</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🏆</span>
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2">Competitions</h3>
              <p className="text-sm text-slate-600">National & International events</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">🔬</span>
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2">Lab Setup</h3>
              <p className="text-sm text-slate-600">Complete infrastructure support</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#1E3A5F] to-[#D63031] flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl text-white">👨‍🏫</span>
              </div>
              <h3 className="font-semibold text-[#1E3A5F] mb-2">Teacher Training</h3>
              <p className="text-sm text-slate-600">Certified educator programs</p>
            </div>
          </div>
          <p className="text-center text-slate-600 max-w-3xl mx-auto mt-8">
            {content.what_we_do}
          </p>
        </div>
      </section>

      {/* Media Features */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Featured In
          </h2>
          <p className="text-slate-600 text-center mb-12">Recognized by leading media and platforms</p>
          <div className="grid md:grid-cols-3 gap-6">
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

      {/* Gallery */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Gallery
          </h2>
          <p className="text-slate-600 text-center mb-12">Glimpses of our students and programs</p>
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

      {/* Updates */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-[#1E3A5F] text-center mb-12" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Latest Updates
          </h2>
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {content.updates.map((update, index) => (
              <div key={index} className="glass-card rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[#D63031]/10 flex items-center justify-center shrink-0">
                    <Newspaper className="w-6 h-6 text-[#D63031]" />
                  </div>
                  <div>
                    <p className="text-sm text-[#D63031] font-medium mb-1">{update.date}</p>
                    <h3 className="font-semibold text-[#1E3A5F] mb-1">{update.title}</h3>
                    <p className="text-sm text-slate-600">{update.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="gradient-bg rounded-3xl p-8 md:p-12 text-center text-white">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Start Your Journey?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of students who are already learning future-ready skills with OLL.
            </p>
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 bg-white text-[#1E3A5F] font-semibold px-8 py-3 rounded-full hover:scale-105 transition-transform"
              data-testid="cta-get-started"
            >
              Get Started <ArrowRight className="w-5 h-5" />
            </Link>
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
