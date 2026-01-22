import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ChevronDown, ChevronUp, MessageCircle, Send, ArrowRight } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { toast } from 'sonner';
import axios from 'axios';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_FAQS = [
  {
    id: '1',
    category: 'courses',
    question: 'What courses does OLL offer?',
    answer: 'OLL offers a comprehensive range of skill-based courses including Robotics, Coding, AI & Machine Learning, Entrepreneurship, and Financial Literacy. Each course is designed for different age groups and skill levels.'
  },
  {
    id: '2',
    category: 'courses',
    question: 'What age groups do you cater to?',
    answer: 'We cater to students from age 6 and above. Our programs are divided into age-appropriate batches: 6-8 years, 9-12 years, 13-16 years, and 17+ years.'
  },
  {
    id: '3',
    category: 'fees',
    question: 'What are the course fees?',
    answer: 'Course fees vary based on the program, duration, and learning mode (online/offline). Please book a free demo session to get detailed pricing information tailored to your requirements.'
  },
  {
    id: '4',
    category: 'fees',
    question: 'Are there any discounts available?',
    answer: 'Yes, we offer sibling discounts, early bird discounts, and special pricing for annual enrollments. Contact our team for current offers.'
  },
  {
    id: '5',
    category: 'demos',
    question: 'How does the demo session work?',
    answer: 'The demo session is a free 30-45 minute introductory class where your child can experience our teaching methodology. It includes a brief orientation and hands-on activity.'
  },
  {
    id: '6',
    category: 'demos',
    question: 'Can I reschedule my demo?',
    answer: 'Yes, you can reschedule your demo by contacting our support team at least 4 hours before the scheduled time.'
  },
  {
    id: '7',
    category: 'online_vs_offline',
    question: 'What is the difference between online and offline classes?',
    answer: 'Online classes are conducted via video conferencing with screen sharing and interactive tools. Offline classes are in-person sessions at our partner locations with hands-on equipment access.'
  },
  {
    id: '8',
    category: 'online_vs_offline',
    question: 'Do online students get the same curriculum?',
    answer: 'Yes, both online and offline students follow the same curriculum. Online students receive kits at home for hands-on projects.'
  },
];

const CATEGORIES = [
  { value: 'all', label: 'All Questions' },
  { value: 'courses', label: 'Courses' },
  { value: 'fees', label: 'Fees' },
  { value: 'demos', label: 'Demos' },
  { value: 'online_vs_offline', label: 'Online vs Offline' },
];

const FAQPage = () => {
  const [faqs, setFaqs] = useState(DEFAULT_FAQS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportForm, setSupportForm] = useState({
    name: '',
    email: '',
    user_type: 'student',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFaqs();
  }, []);

  const fetchFaqs = async () => {
    try {
      const response = await axios.get(`${API}/faqs`);
      if (response.data.length > 0) {
        setFaqs(response.data);
      }
    } catch (error) {
      // Use default FAQs
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSupportSubmit = async (e) => {
    e.preventDefault();
    if (!supportForm.name || !supportForm.email || !supportForm.message) {
      toast.error('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/support/ticket`, supportForm);
      toast.success('Support ticket created! We will get back to you soon.');
      setShowSupportForm(false);
      setSupportForm({
        name: '',
        email: '',
        user_type: 'student',
        subject: '',
        message: '',
      });
    } catch (error) {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <Navbar showBookDemo onBookDemo={() => window.location.href = '/student'} />

      {/* Main Content */}
      <main className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A5F] mb-4" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Frequently Asked Questions
            </h1>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Find answers to common questions about our programs, fees, and more.
            </p>
          </div>

          {/* Search */}
          <div className="glass-card rounded-2xl p-4 mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="Search questions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white border-slate-200 rounded-xl"
                data-testid="faq-search"
              />
            </div>
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            {CATEGORIES.map(cat => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat.value
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                }`}
                data-testid={`category-${cat.value}`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* FAQ List */}
          <div className="glass-card rounded-3xl p-6 md:p-8 mb-8">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No questions found matching your search.</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-4">
                {filteredFaqs.map((faq, index) => (
                  <AccordionItem 
                    key={faq.id} 
                    value={faq.id}
                    className="border border-slate-200 rounded-xl px-4 data-[state=open]:bg-slate-50"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4" data-testid={`faq-${index}`}>
                      <span className="font-medium text-[#1E3A5F]">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-slate-600 pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>

          {/* Still Have Questions */}
          <div className="glass-card rounded-3xl p-6 md:p-8 text-center">
            <MessageCircle className="w-12 h-12 text-[#D63031] mx-auto mb-4" />
            <h2 className="text-xl font-bold text-[#1E3A5F] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Still have questions?
            </h2>
            <p className="text-slate-600 mb-6">
              Can't find what you're looking for? Send us a message and we'll get back to you.
            </p>
            <Button 
              onClick={() => setShowSupportForm(true)} 
              className="btn-primary"
              data-testid="contact-support-btn"
            >
              Contact Support
            </Button>
          </div>
        </div>
      </main>

      {/* Support Form Modal */}
      {showSupportForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="glass-card rounded-3xl p-6 md:p-8 max-w-lg w-full animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-[#1E3A5F]" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Contact Support
              </h3>
              <button 
                onClick={() => setShowSupportForm(false)} 
                className="text-slate-400 hover:text-slate-600"
                data-testid="close-support-modal"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSupportSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
                <Input
                  placeholder="Your name"
                  value={supportForm.name}
                  onChange={(e) => setSupportForm({...supportForm, name: e.target.value})}
                  className="input-glass"
                  data-testid="support-name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email *</label>
                <Input
                  type="email"
                  placeholder="Your email"
                  value={supportForm.email}
                  onChange={(e) => setSupportForm({...supportForm, email: e.target.value})}
                  className="input-glass"
                  data-testid="support-email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">I am a</label>
                <select
                  value={supportForm.user_type}
                  onChange={(e) => setSupportForm({...supportForm, user_type: e.target.value})}
                  className="w-full h-12 px-4 bg-white/50 border border-slate-200 rounded-xl"
                  data-testid="support-user-type"
                >
                  <option value="student">Student / Parent</option>
                  <option value="educator">Educator</option>
                  <option value="school">School</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
                <Input
                  placeholder="Brief subject"
                  value={supportForm.subject}
                  onChange={(e) => setSupportForm({...supportForm, subject: e.target.value})}
                  className="input-glass"
                  data-testid="support-subject"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Message *</label>
                <textarea
                  placeholder="Describe your question or issue..."
                  value={supportForm.message}
                  onChange={(e) => setSupportForm({...supportForm, message: e.target.value})}
                  className="w-full h-32 p-4 bg-white/50 border border-slate-200 rounded-xl resize-none"
                  data-testid="support-message"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full flex items-center justify-center gap-2"
                data-testid="submit-support-btn"
              >
                {submitting ? 'Sending...' : 'Send Message'}
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FAQPage;
