import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { usePageMeta } from '../../hooks/usePageMeta';
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Clock, 
  Users, 
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Target,
  BookOpen,
  Quote,
  Phone
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { getCourseBySlug, getAllCourses } from './CourseData';

const CoursePage = () => {
  const { courseSlug } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [expandedModule, setExpandedModule] = useState(0);

  useEffect(() => {
    const courseData = getCourseBySlug(courseSlug);
    if (courseData) {
      setCourse(courseData);
      window.scrollTo(0, 0);
    } else {
      navigate('/courses');
    }
  }, [courseSlug, navigate]);

  // Direct DOM meta injection for reliable SEO (react-helmet-async CSR fallback)
  usePageMeta(course ? {
    title: course.metaTitle,
    description: course.metaDescription,
    canonical: `https://oll.co/courses/${course.id}`,
    ogTitle: course.metaTitle,
    ogDescription: course.metaDescription,
    keywords: `${course.name} classes for kids, ${course.name} course India, learn ${course.name} online, ${course.name} for kids, OLL ${course.name}`,
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": course.name,
        "description": course.description,
        "provider": { "@type": "Organization", "name": "OLL", "sameAs": "https://oll.co" },
        "educationalLevel": "K-12",
        "url": `https://oll.co/courses/${course.id}`
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/" },
          { "@type": "ListItem", "position": 2, "name": "Courses", "item": "https://oll.co/courses" },
          { "@type": "ListItem", "position": 3, "name": course.name, "item": `https://oll.co/courses/${course.id}` }
        ]
      }
    ]
  } : {});

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D63031]"></div>
      </div>
    );
  }

  const handleBookDemo = () => {
    navigate(`/student?skill=${course.id}`);
  };

  return (
    <>
      <Helmet>
        <title>{course.metaTitle}</title>
        <meta name="description" content={course.metaDescription} />
        <meta name="keywords" content={`${course.name} classes for kids, ${course.name} course India, learn ${course.name} online, ${course.name} for kids Mumbai, OLL ${course.name}, ${course.name} after school classes`} />
        <meta property="og:title" content={course.metaTitle} />
        <meta property="og:description" content={course.metaDescription} />
        <meta property="og:image" content={course.heroImage} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="OLL" />
        <link rel="canonical" href={`https://oll.co/courses/${course.id}`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={course.metaTitle} />
        <meta name="twitter:description" content={course.metaDescription} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Course",
            "name": course.name,
            "description": course.description,
            "provider": {
              "@type": "Organization",
              "name": "OLL",
              "sameAs": "https://oll.co",
              "url": "https://oll.co"
            },
            "educationalLevel": "K-12",
            "teaches": course.outcomes,
            "url": `https://oll.co/courses/${course.id}`,
            "isAccessibleForFree": false,
            "offers": {
              "@type": "Offer",
              "availability": "https://schema.org/InStock",
              "category": "Educational Program",
              "areaServed": "IN"
            },
            "hasCourseInstance": {
              "@type": "CourseInstance",
              "courseMode": ["Onsite", "Online"],
              "courseWorkload": `${course.duration} course, batch size ${course.classSize}`,
              "instructor": {
                "@type": "Organization",
                "name": "OLL Certified Educators"
              }
            }
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {"@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/"},
              {"@type": "ListItem", "position": 2, "name": "Courses", "item": "https://oll.co/courses"},
              {"@type": "ListItem", "position": 3, "name": course.name, "item": `https://oll.co/courses/${course.id}`}
            ]
          })}
        </script>
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
                <Link to="/courses" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">All Courses</Link>
                <Link to="/about" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">About</Link>
                <Link to="/centers" className="text-slate-600 hover:text-[#1E3A5F] font-medium transition-colors">Centers</Link>
                <Button 
                  onClick={handleBookDemo}
                  className="bg-[#D63031] hover:bg-[#b52828] text-white"
                  data-testid="nav-book-demo-btn"
                >
                  Book Free Demo
                </Button>
              </div>

              <Button 
                onClick={handleBookDemo}
                className="md:hidden bg-[#D63031] hover:bg-[#b52828] text-white text-sm px-4"
                data-testid="mobile-book-demo-btn"
              >
                Book Demo
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className={`relative bg-gradient-to-br ${course.gradient} py-16 md:py-24 overflow-hidden`}>
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <button 
              onClick={() => navigate('/courses')}
              className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors"
              data-testid="back-to-courses-btn"
            >
              <ArrowLeft className="w-4 h-4" />
              All Courses
            </button>
            
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-5xl">{course.emoji}</span>
                  <span className="bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    Ages {course.ageGroups[0].split(' ')[0]} - {course.ageGroups[course.ageGroups.length - 1].split(' ')[0]}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {course.name}
                </h1>
                <p className="text-xl md:text-2xl text-white/90 mb-4 font-medium">
                  {course.tagline}
                </p>
                <p className="text-white/80 text-base md:text-lg mb-8 leading-relaxed">
                  {course.description}
                </p>
                
                <div className="flex flex-wrap gap-4 mb-8">
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Clock className="w-5 h-5 text-white/80" />
                    <span className="text-white text-sm">{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Users className="w-5 h-5 text-white/80" />
                    <span className="text-white text-sm">{course.classSize}</span>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button 
                    onClick={handleBookDemo}
                    size="lg"
                    className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8"
                    data-testid="hero-book-demo-btn"
                  >
                    Book Free Demo Class
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button 
                    variant="outline"
                    size="lg"
                    className="border-white/50 text-white hover:bg-white/10 font-semibold px-8"
                    onClick={() => document.getElementById('curriculum').scrollIntoView({ behavior: 'smooth' })}
                    data-testid="view-curriculum-btn"
                  >
                    View Curriculum
                  </Button>
                </div>
              </div>
              
              <div className="hidden md:block">
                <div className="relative">
                  <div className="absolute inset-0 bg-white/20 rounded-2xl rotate-3"></div>
                  <img 
                    src={course.heroImage} 
                    alt={`${course.name} class at OLL`}
                    className="relative rounded-2xl shadow-2xl w-full h-[400px] object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Why Learn {course.name} at OLL?
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                Our program is designed to give students practical skills and real-world experience
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {course.benefits.map((benefit, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-xl p-6 shadow-sm hover:shadow-lg transition-shadow border border-slate-100"
                  data-testid={`benefit-card-${idx}`}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ backgroundColor: `${course.color}15` }}
                  >
                    <Target className="w-6 h-6" style={{ color: course.color }} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{benefit.title}</h3>
                  <p className="text-slate-600 text-sm">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Curriculum Section */}
        <section id="curriculum" className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                What You'll Learn
              </h2>
              <p className="text-slate-600 max-w-2xl mx-auto">
                A structured curriculum designed by experts for progressive learning
              </p>
            </div>
            
            <div className="max-w-3xl mx-auto">
              {course.curriculum.map((module, idx) => (
                <div 
                  key={idx}
                  className="mb-4"
                  data-testid={`curriculum-module-${idx}`}
                >
                  <button
                    onClick={() => setExpandedModule(expandedModule === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                        style={{ backgroundColor: course.color }}
                      >
                        {idx + 1}
                      </div>
                      <span className="font-semibold text-slate-900">{module.module}</span>
                    </div>
                    {expandedModule === idx ? (
                      <ChevronUp className="w-5 h-5 text-slate-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500" />
                    )}
                  </button>
                  
                  {expandedModule === idx && (
                    <div className="mt-2 ml-14 p-4 bg-white border border-slate-200 rounded-xl">
                      <ul className="space-y-2">
                        {module.topics.map((topic, tidx) => (
                          <li key={tidx} className="flex items-center gap-2 text-slate-700">
                            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Outcomes Section */}
        <section className="py-16 md:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-6" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  What Students Achieve
                </h2>
                <p className="text-slate-600 mb-8">
                  By the end of the program, students will have developed real skills and created tangible projects.
                </p>
                <ul className="space-y-4">
                  {course.outcomes.map((outcome, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: course.color }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-slate-700">{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-gradient-to-br from-slate-100 to-slate-50 rounded-2xl p-8">
                <div className="text-center">
                  <GraduationCap className="w-16 h-16 mx-auto mb-4" style={{ color: course.color }} />
                  <h3 className="text-2xl font-bold text-slate-900 mb-2">Certificate of Completion</h3>
                  <p className="text-slate-600 mb-6">
                    Students receive a certificate upon completing each level of the program
                  </p>
                  <Button 
                    onClick={handleBookDemo}
                    className="bg-[#D63031] hover:bg-[#b52828]"
                    data-testid="outcomes-cta-btn"
                  >
                    Start Your Journey
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                What Our Students Say
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {course.testimonials.map((testimonial, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-50 rounded-xl p-6 relative"
                  data-testid={`testimonial-${idx}`}
                >
                  <Quote className="w-8 h-8 text-slate-200 absolute top-4 right-4" />
                  <div className="flex items-center gap-2 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 mb-4 italic">"{testimonial.quote}"</p>
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: course.color }}
                    >
                      {testimonial.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{testimonial.name}</p>
                      <p className="text-sm text-slate-500">Age {testimonial.age}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-20">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Frequently Asked Questions
              </h2>
            </div>
            
            <div className="space-y-4">
              {course.faqs.map((faq, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                  data-testid={`faq-${idx}`}
                >
                  <button
                    onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 pr-4">{faq.q}</span>
                    {expandedFaq === idx ? (
                      <ChevronUp className="w-5 h-5 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-slate-500 shrink-0" />
                    )}
                  </button>
                  
                  {expandedFaq === idx && (
                    <div className="px-4 pb-4 text-slate-600">
                      {faq.a}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className={`py-16 md:py-20 bg-gradient-to-br ${course.gradient}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Ready to Start Learning {course.name}?
            </h2>
            <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
              Book a free demo class and experience our teaching methodology first-hand. No commitments, just learning!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                onClick={handleBookDemo}
                size="lg"
                className="bg-white text-slate-900 hover:bg-slate-100 font-semibold px-8"
                data-testid="cta-book-demo-btn"
              >
                Book Free Demo Class
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-white/50 text-white hover:bg-white/10 font-semibold px-8"
                onClick={() => window.location.href = 'tel:+919920188188'}
                data-testid="cta-call-btn"
              >
                <Phone className="w-5 h-5 mr-2" />
                Call Us Now
              </Button>
            </div>
          </div>
        </section>

        {/* Other Courses Section */}
        <section className="py-16 md:py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Explore Other Courses
              </h2>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {getAllCourses()
                .filter(c => c.id !== course.id)
                .map((otherCourse) => (
                  <Link
                    key={otherCourse.id}
                    to={`/courses/${otherCourse.id}`}
                    className={`bg-gradient-to-br ${otherCourse.gradient} rounded-xl p-4 text-center hover:scale-105 transition-transform`}
                    data-testid={`other-course-${otherCourse.id}`}
                  >
                    <span className="text-3xl mb-2 block">{otherCourse.emoji}</span>
                    <span className="text-white font-medium">{otherCourse.name}</span>
                  </Link>
                ))}
            </div>
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

export default CoursePage;
