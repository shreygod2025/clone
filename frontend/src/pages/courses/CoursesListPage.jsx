import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowRight, Clock, Users, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { getAllCourses } from './CourseData';

const CoursesListPage = () => {
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const courses = getAllCourses();

  return (
    <>
      <Helmet>
        <title>All Courses | OLL - Robotics, Coding, AI & More</title>
        <meta name="description" content="Explore OLL's skill education courses: Robotics, Coding, AI & Machine Learning, Entrepreneurship, Financial Literacy. Ages 6-17. Book a free demo class today!" />
        <meta name="keywords" content="OLL courses, robotics classes, coding for kids, AI classes, entrepreneurship program, financial literacy, skill education" />
        <meta property="og:title" content="All Courses | OLL - Skill Education Platform" />
        <meta property="og:description" content="Future-ready skill courses for kids aged 6-17. Robotics, Coding, AI, and more." />
        <link rel="canonical" href="https://www.ollindia.com/courses" />
      </Helmet>

      <div className="min-h-screen bg-slate-50">
        {/* Navigation */}
        <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200/50 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <Link to="/" className="flex items-center gap-2">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL" 
                  className="h-10"
                />
              </Link>
              
              <div className="hidden md:flex items-center gap-8">
                <Link to="/courses" className="text-[#D63031] font-medium transition-colors">Courses</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">About</Link>
                <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Centers</Link>
                <Link to="/blogs" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Blog</Link>
                <Button 
                  onClick={() => navigate('/student')}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                  data-testid="nav-book-demo-btn"
                >
                  Book Free Demo
                </Button>
              </div>

              <button 
                className="md:hidden p-2"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                data-testid="mobile-menu-btn"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden bg-white border-t border-slate-200 py-4 px-4 space-y-3">
              <Link to="/courses" className="block py-2 text-[#D63031] font-medium">Courses</Link>
              <Link to="/about" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">About</Link>
              <Link to="/centers" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">Centers</Link>
              <Link to="/blogs" className="block py-2 text-slate-600 hover:text-[#1E3A5F]">Blog</Link>
              <Button 
                onClick={() => navigate('/student')}
                className="w-full bg-[#D63031] hover:bg-[#b52828] text-white mt-2"
              >
                Book Free Demo
              </Button>
            </div>
          )}
        </nav>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#1E3A5F] to-[#2C5282] py-16 md:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Future-Ready Skills for Every Student
            </h1>
            <p className="text-white/80 text-lg md:text-xl max-w-3xl mx-auto mb-8">
              From Robotics to AI, our expert-designed courses prepare students for the technology-driven future. 
              Hands-on learning, small batches, and personalized attention.
            </p>
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <span className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full">Ages 6-17</span>
              <span className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full">Online & Offline</span>
              <span className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full">Free Demo Class</span>
            </div>
          </div>
        </section>

        {/* Courses Grid */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  to={`/courses/${course.id}`}
                  className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100"
                  data-testid={`course-card-${course.id}`}
                >
                  {/* Course Image */}
                  <div className={`relative h-48 bg-gradient-to-br ${course.gradient} overflow-hidden`}>
                    <img 
                      src={course.heroImage} 
                      alt={course.name}
                      className="w-full h-full object-cover opacity-50 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-6xl">{course.emoji}</span>
                    </div>
                  </div>
                  
                  {/* Course Content */}
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-[#D63031] transition-colors">
                      {course.name}
                    </h2>
                    <p className="text-slate-600 text-sm mb-4 line-clamp-2">
                      {course.tagline}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration}
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {course.classSize}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: course.color }}>
                        Learn more
                      </span>
                      <ArrowRight className="w-5 h-5 text-slate-400 group-hover:text-[#D63031] group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Why OLL Section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                The OLL Advantage
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                What makes learning at OLL different
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { title: 'Expert Instructors', description: 'Industry professionals and certified educators', icon: '👨‍🏫' },
                { title: 'Small Batch Sizes', description: 'Personalized attention with 6-10 students per batch', icon: '👥' },
                { title: 'Project-Based Learning', description: 'Build real projects, not just theory', icon: '🛠️' },
                { title: 'Flexible Options', description: 'Online, at-home, or at our learning centers', icon: '🏠' }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="text-center p-6 rounded-xl bg-slate-50"
                  data-testid={`advantage-${idx}`}
                >
                  <span className="text-4xl mb-4 block">{item.icon}</span>
                  <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-gradient-to-br from-[#D63031] to-[#e84142]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Not Sure Which Course is Right?
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
              Book a free counseling session. We'll understand your child's interests and recommend the perfect program.
            </p>
            <Button 
              onClick={() => navigate('/student')}
              size="lg"
              className="bg-white text-[#D63031] hover:bg-slate-100 font-semibold px-8"
              data-testid="cta-book-session-btn"
            >
              Book Free Session
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-[#1E3A5F] text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Link to="/">
                <img 
                  src="https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png" 
                  alt="OLL" 
                  className="h-8 brightness-0 invert"
                />
              </Link>
              <div className="flex gap-6 text-sm text-white/80">
                <Link to="/about" className="hover:text-white">About</Link>
                <Link to="/courses" className="hover:text-white">Courses</Link>
                <Link to="/centers" className="hover:text-white">Centers</Link>
                <Link to="/faq" className="hover:text-white">FAQ</Link>
              </div>
              <p className="text-white/60 text-sm">© 2025 OLL. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default CoursesListPage;
