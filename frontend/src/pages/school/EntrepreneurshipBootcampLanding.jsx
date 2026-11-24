/**
 * OLL Financial Literacy & Entrepreneurship Bootcamp for Schools (Ages 3–16).
 * Inspired by Founder Shreyaan Daga's journey (Shark Tank India S2 & KBC S16).
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import {
  ArrowRight, Download, ShieldCheck, Trophy, Cpu, Code2, Brain,
  CheckCircle2, Sparkles, Users, BookOpen, Package, Award, Star,
  School, Heart, Play, ChevronRight, Phone, Mail, Building,
  Layers, Radio, Gauge, Zap, Cog, Compass, Monitor, Check,
  TrendingUp, DollarSign, PiggyBank, Briefcase, Lightbulb, ShoppingCart,
  Store, Presentation, Target, Shield, Landmark, LineChart
} from 'lucide-react';

import Footer from '../../components/Footer';
import LMSSection from '../../components/school/LMSSection';
import SchoolBreadcrumbs from '../../components/school/SchoolBreadcrumbs';
import SchoolRelatedPrograms from '../../components/school/SchoolRelatedPrograms';
import CurriculumGateModal from '../../components/school/CurriculumGateModal';

const API = process.env.REACT_APP_BACKEND_URL;
const OLL_LOGO_COLOR =
  'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';

const CANONICAL_PATH =
  '/school/entrepreneurship-and-financial-literacy-bootcamp-for-schools';

const BROCHURE_PDF_URL =
  'https://drive.google.com/uc?export=download&id=16Siku0iyrHGMsQKWAMizaKPQdjMXGCoJ';
const BROCHURE_NAME =
  'OLL-Entrepreneurship-and-Financial-Literacy-Bootcamp-Brochure.pdf';

const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const TIMELINE_STEPS = [
  {
    year: '2012',
    age: 'Age 8',
    title: 'First Steps in Entrepreneurship',
    desc: 'Started a painting platform and sold his handmade paintings for ₹2,000, discovering how to turn creativity into value.',
    color: '#0284C7',
    tag: 'Early Spark'
  },
  {
    year: '2017',
    age: 'Age 13',
    title: 'Learning Financial Literacy',
    desc: 'Joined the stock market as an intern, conducted in-depth balance sheet research, and earned 20% returns on investments.',
    color: '#059669',
    tag: 'Financial Acumen'
  },
  {
    year: '2020',
    age: 'Age 15',
    title: 'Scaling Entrepreneurship: OLL Founded',
    desc: 'Launched OLL with a mission to make 1 Billion learners capable enough to fulfil their dreams through live future skills.',
    color: '#DC2626',
    tag: 'National Platform'
  },
  {
    year: '2023',
    age: 'Age 18',
    title: 'Shark Tank India Season 2',
    desc: 'Secured backing from prominent sharks, becoming the youngest founder funded on the national television show.',
    color: '#D97706',
    tag: 'Shark Tank Funded'
  },
  {
    year: '2025',
    age: 'Age 20',
    title: 'KBC 16 Hot Seat with Amitabh Bachchan',
    desc: 'Shared the stage with Mr. Amitabh Bachchan, spotlighting the critical need for financial literacy in Indian schools.',
    color: '#7C3AED',
    tag: 'National Spotlight'
  }
];

const EXPERIENCES = [
  {
    title: 'Money Management Challenges',
    desc: 'Budgeting, saving, spending, and smart allocation through real simulation cards and balance sheets.',
    icon: PiggyBank,
    color: '#0284C7'
  },
  {
    title: 'Mock Banks & Marketplaces',
    desc: 'Interactive role-plays of teller counters, debit cards, interest accrual, credit scores, and commerce.',
    icon: Landmark,
    color: '#059669'
  },
  {
    title: 'Product Design & Prototyping',
    desc: 'Transforming napkin ideas into physical prototypes or digital wireframes that solve real problems.',
    icon: Lightbulb,
    color: '#D97706'
  },
  {
    title: 'Branding & Marketing Challenges',
    desc: 'Designing company names, logos, customer avatars, catchy taglines, and marketing campaigns.',
    icon: Store,
    color: '#DC2626'
  },
  {
    title: 'Sales & Startup Pitch Contests',
    desc: 'Presenting business propositions before judges, handling pricing questions, and closing deals.',
    icon: Presentation,
    color: '#7C3AED'
  },
  {
    title: 'Virtual Stock Market Simulation',
    desc: 'Real-time portfolio management using virtual funds to learn risk, diversification, and index movements.',
    icon: LineChart,
    color: '#2563EB'
  }
];

const AGE_BANDS = [
  {
    age: 'Ages 3–7',
    title: 'Little Money Explorers',
    sub: 'Small Steps Towards Smart Money Habits',
    color: '#0284C7',
    finProject: 'My Savings Jar & Money Goals Chart',
    entProject: 'My First Little Shop (Bookmarks & Crafts)',
    takeaways: ['Money awareness', 'Needs vs Wants', 'Saving habits', 'Creative confidence'],
    modules: [
      'Evolution of Money', 'Value of Coins & Notes', 'Introduction to Earning', 'Needs vs Wants Sorting',
      'Exploring Spending & Saving', 'Smart Spending Habits', 'Introduction to Banking & Vaults',
      'Budgeting as a Life Skill', 'Why Insurance Exists', 'Visualizing Goals', 'Course Recap & Reflection',
      'Spotting Everyday Problems', 'From Idea to Model', 'Understanding Cost & Price', 'My Little Shop Role-Play'
    ]
  },
  {
    age: 'Ages 8–11',
    title: 'Young Money Makers',
    sub: 'Building Smart Money Habits & Financial Confidence',
    color: '#059669',
    finProject: 'Personal Budget & Savings Challenge',
    entProject: 'Young Entrepreneurs Marketplace (School Stall)',
    takeaways: ['Budgeting discipline', 'Costing & margins', 'Product packaging', 'Sales & presentation'],
    modules: [
      'Evolution of Digital Money & UPI', 'Discovering Your Money Personality (Saver vs Spender)',
      'Needs vs Wants Trade-offs', 'Smart Saving & Compounding', 'Learnings on Borrowing & Debt',
      'Bank Accounts, Cheques & Interest', 'Personal Budgeting Matrix', 'Basics of Stock Investing',
      'Idea Validation & Pain Points', 'Product Design & Mockups', 'Cost of Goods Sold (COGS) & Profit',
      'Branding, Posters & Slogans', 'Customer Pitch & Exhibition Stall'
    ]
  },
  {
    age: 'Ages 12–16',
    title: 'Future Money Leaders',
    sub: 'Understanding Finance, Wealth & Real-World Venture Building',
    color: '#DC2626',
    finProject: 'Virtual Investment Portfolio & Stock Analysis',
    entProject: 'Startup Challenge & Live Business Pitch Deck',
    takeaways: ['Financial planning', 'Stock market mechanics', 'Unit economics', 'Venture capital pitching'],
    modules: [
      'Money, Finance & Generational Wealth', 'Earning Models & Value Creation', 'Principles of Investing & Risk',
      'Stock Exchanges (NSE/BSE), Bulls & Bears', 'Investment Diversification (Equity, Debt, Gold)',
      'Banking Instruments & Credit Health', 'Taxation Basics & Insurance Essentials', 'Live Stock Simulator',
      'Opportunity Identification & TAM', 'MVP Prototyping & User Feedback', 'Revenue Models & Unit Economics',
      'Customer Acquisition Cost & Marketing Funnels', 'Crafting an Investor Pitch Deck'
    ]
  }
];

export default function EntrepreneurshipBootcampLanding() {
  const navigate = useNavigate();
  const [gateOpen, setGateOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(1);
  const [selectedBand, setSelectedBand] = useState(0);

  const [form, setForm] = useState({
    school_name: '', contact_name: '', phone: '', email: '', city: '', format: 'In-School Bootcamp (5–10 Days)', message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.school_name.trim() || form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter school name and a valid 10-digit phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await fetch(`${API}/api/schools/inquiry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_name: form.school_name.trim(),
          contact_name: form.contact_name.trim() || 'Principal / Coordinator',
          email: form.email.trim() || `lead_${form.phone.replace(/\D/g, '')}@pending.oll.co`,
          phone: form.phone.trim(),
          city: form.city.trim() || 'Not specified',
          source: 'entrepreneurship_bootcamp_landing',
          notes: `Format: ${form.format}. Message: ${form.message.trim() || 'Interested in Financial Literacy & Entrepreneurship Bootcamp'}`
        })
      });
      setSubmitted(true);
      toast.success('Inquiry submitted! Our Bootcamp Coordinator will reach out within 24 hours.');
    } catch {
      toast.error('Submission failed. Please call our team directly at +91 93249 97060.');
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Schools', href: '/school/robotics-ai-lab-for-schools-turnkey-solution/' },
    { label: 'Entrepreneurship Bootcamp', href: CANONICAL_PATH }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased selection:bg-amber-500 selection:text-white">
      <Toaster position="top-right" richColors />

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-600 via-red-600 to-rose-700 text-white text-xs md:text-sm font-semibold py-2 px-4 text-center">
        <span>💡 Empower Students with Real-World Money Skills & Entrepreneurial Mindset · Book a School Bootcamp</span>
        <a href="#inquiry" className="ml-3 underline font-bold hover:text-amber-200 transition">Inquire Now →</a>
      </div>

      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
            <img src={OLL_LOGO_COLOR} alt="OLL.co" className="h-10 w-auto object-contain" />
            <div className="hidden sm:block border-l border-slate-300 pl-3">
              <p className="text-xs font-bold text-slate-900 leading-tight">ENTREPRENEURSHIP & FIN-LIT</p>
              <p className="text-[10px] text-slate-500">School Bootcamp (Ages 3–16)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href="tel:+919324997060"
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-amber-600 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
            >
              <Phone className="w-3.5 h-3.5 text-amber-600" />
              <span>+91 93249 97060</span>
            </a>
            <button
              onClick={() => setGateOpen(true)}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 transition"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span className="hidden sm:inline">Download</span> Syllabus
            </button>
            <a
              href="#inquiry"
              className="flex items-center gap-1.5 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-amber-500/20 transition"
            >
              Book Bootcamp
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* Breadcrumbs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-2">
        <SchoolBreadcrumbs items={breadcrumbs} />
      </div>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-16 lg:py-20 bg-gradient-to-b from-white via-slate-50 to-amber-50/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 bg-amber-100/80 border border-amber-200 text-amber-900 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-bold">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <span>Smart Money Skills · Big Business Ideas · Bright Futures</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1]">
                FINANCIAL LITERACY & <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-red-600 to-rose-600">
                  ENTREPRENEURSHIP
                </span> <br />
                BOOTCAMP
              </h1>

              <p className="text-lg sm:text-xl font-bold text-slate-700">
                Schools Teach Students How to Earn a Living. We Teach Them How to Manage Money & Build Opportunities.
              </p>

              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                An experiential in-school program designed for <strong>Ages 3 to 16</strong>. From piggy bank savings to virtual stock market trading and live startup pitch contests, students acquire the financial confidence and entrepreneurial mindset needed to thrive.
              </p>

              {/* 4 Pillars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                {[
                  { label: 'Learn Money', icon: DollarSign, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                  { label: 'Build Ideas', icon: Lightbulb, color: 'text-amber-700 bg-amber-50 border-amber-200' },
                  { label: 'Create Value', icon: TrendingUp, color: 'text-blue-700 bg-blue-50 border-blue-200' },
                  { label: 'Think Like Founder', icon: Briefcase, color: 'text-red-700 bg-red-50 border-red-200' }
                ].map((item, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex flex-col items-center text-center gap-1.5 ${item.color}`}>
                    <item.icon className="w-5 h-5" />
                    <span className="text-xs font-bold text-slate-900">{item.label}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <a
                  href="#inquiry"
                  className="bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white px-7 py-3.5 rounded-2xl font-bold text-base shadow-xl shadow-amber-500/25 flex items-center gap-2 transition"
                >
                  Bring Bootcamp to Your School
                  <ArrowRight className="w-5 h-5" />
                </a>

                <button
                  onClick={() => setGateOpen(true)}
                  className="bg-white hover:bg-slate-100 text-slate-800 border-2 border-slate-300 px-6 py-3.5 rounded-2xl font-bold text-base flex items-center gap-2 shadow-sm transition"
                >
                  <Download className="w-5 h-5 text-amber-600" />
                  Download Curriculum Deck
                </button>
              </div>

              {/* Trust Micro-bar */}
              <div className="flex flex-wrap items-center gap-6 pt-3 text-xs font-semibold text-slate-500 border-t border-slate-200">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-600" /> STEM.org Accredited</span>
                <span className="flex items-center gap-1.5"><Trophy className="w-4 h-4 text-amber-500" /> Shark Tank Funded</span>
                <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-purple-600" /> KBC S16 Hot Seat</span>
              </div>
            </div>

            {/* Right Column: Hero Cover */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white bg-slate-900 aspect-[3/4]">
                  <img
                    src="/school/entrepreneurship/ent_page_1.webp"
                    alt="Financial Literacy and Entrepreneurship Bootcamp"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6 text-white">
                    <p className="text-xs uppercase tracking-widest text-amber-300 font-bold mb-1">Ages 3–16 Curriculum</p>
                    <h3 className="text-xl font-bold">Practical Wealth & Venture Skills</h3>
                    <p className="text-xs text-slate-300 mt-1">No boring theory. 100% simulations, mock markets & real pitches.</p>
                  </div>
                </div>

                <div className="absolute -bottom-5 -left-5 bg-white p-4 rounded-2xl shadow-xl border border-slate-200 hidden sm:flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-lg">
                    ★
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-bold">Founded by Teen Prodigy</p>
                    <p className="text-sm font-extrabold text-slate-900">Mr. Shreyaan Daga</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Trust Stats Bar */}
      <section className="bg-white border-y border-slate-200 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">400+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Schools Across India</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-amber-600">1,57,500+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Students Empowered</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">1,250+</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">Educators Certified</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-black text-slate-900">35+ Cities</p>
              <p className="text-xs sm:text-sm font-bold text-slate-500 mt-1 uppercase tracking-wide">National Network</p>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: The Inspiring Journey of Founder Shreyaan Daga (Slide 2) */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
              The Real-World Story Behind OLL
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              The Journey of Mr. Shreyaan Daga
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              A young entrepreneur and educator on a mission to build financially aware, future-ready learners with an entrepreneurial mindset.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {TIMELINE_STEPS.map((step, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold text-white px-2.5 py-0.5 rounded-full" style={{ backgroundColor: step.color }}>
                      {step.year}
                    </span>
                    <span className="text-xs font-bold text-slate-400">{step.age}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm mb-1.5">{step.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.desc}</p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{step.tag}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/entrepreneurship/ent_page_2.webp"
              alt="The Journey of Shreyaan Daga Slide"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 2: Why Financial Literacy & Entrepreneurship in Schools? */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
                Core Life Skills
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                Why Financial Literacy & Entrepreneurship?
              </h2>
              <blockquote className="border-l-4 border-amber-500 pl-4 italic text-slate-700 text-sm sm:text-base font-medium">
                "Schools teach students how to earn a living. But are we teaching them how to manage money, create opportunities, and invest responsibly?"
              </blockquote>
              <p className="text-slate-600 text-sm leading-relaxed">
                Financial literacy and entrepreneurship are essential life skills, not just career choices. Our bootcamp helps students learn to:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                {[
                  'Understand the real value of money',
                  'Make responsible spending & saving choices',
                  'Set financial goals & plan long-term',
                  'Identify problems & craft viable solutions',
                  'Turn napkin ideas into real prototypes',
                  'Understand costing, margins, and sales',
                  'Build public speaking & pitch confidence',
                  'Grasp basic investment & stock market logic'
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-3xl overflow-hidden border border-slate-200 shadow-xl bg-white p-4">
                <img
                  src="/school/entrepreneurship/ent_page_3.webp"
                  alt="Why Financial Literacy and Entrepreneurship Slide"
                  className="w-full rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Experiential Real-World Application Modules (Slide 4) */}
      <section className="py-16 sm:py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
              Learning Through Real-World Experiences
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Not Just Financial Concepts. Real-Life Applications.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Students do not memorize definitions — they open mock bank accounts, produce physical goods, run stalls, and trade stocks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {EXPERIENCES.map((exp, idx) => (
              <div
                key={idx}
                className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-lg transition group"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ backgroundColor: `${exp.color}15`, color: exp.color }}
                >
                  <exp.icon className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{exp.title}</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">{exp.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 rounded-3xl overflow-hidden border border-slate-200 shadow-lg bg-white p-4 sm:p-6">
            <img
              src="/school/entrepreneurship/ent_page_4.webp"
              alt="Real Life Applications Slide"
              className="w-full rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* Section 4: Three Age Bands & Grade-wise Curriculums */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-100 px-3 py-1 rounded-full">
              Tailored by Age
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Every Age. A New Challenge. A Bigger Idea.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-3">
              Explore the customized 18-module curriculum designed specifically for each developmental stage.
            </p>
          </div>

          {/* Age Tab Selector */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 border border-slate-200 gap-2">
              {AGE_BANDS.map((band, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedBand(idx)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                    selectedBand === idx
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {band.age} ({band.title})
                </button>
              ))}
            </div>
          </div>

          {/* Active Band Card */}
          {(() => {
            const b = AGE_BANDS[selectedBand];
            return (
              <div className="bg-slate-50 rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-sm max-w-5xl mx-auto">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <div>
                    <span className="text-xs font-extrabold px-3 py-1 rounded-full text-white" style={{ backgroundColor: b.color }}>
                      {b.age}
                    </span>
                    <h3 className="text-2xl font-black text-slate-900 mt-2">{b.title}</h3>
                    <p className="text-xs sm:text-sm text-slate-500">{b.sub}</p>
                  </div>

                  <a
                    href="#inquiry"
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition"
                  >
                    Request Full Syllabus PDF →
                  </a>
                </div>

                {/* Projects Showcase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Financial Literacy Project</p>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1">{b.finProject}</h4>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Entrepreneurship Project</p>
                    <h4 className="font-extrabold text-slate-900 text-sm mt-1">{b.entProject}</h4>
                  </div>
                </div>

                {/* Modules Grid */}
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Key Curriculum Modules</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {b.modules.map((m, mi) => (
                    <div key={mi} className="bg-white px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                        {mi + 1}
                      </span>
                      <span className="font-medium truncate">{m}</span>
                    </div>
                  ))}
                </div>

                {/* Takeaways Pill */}
                <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 mr-2">Core Learning Takeaways:</span>
                  {b.takeaways.map((t, ti) => (
                    <span key={ti} className="text-xs font-semibold px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700">
                      ✓ {t}
                    </span>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Age Slides Showcase */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <img src="/school/entrepreneurship/ent_page_6.webp" alt="Age 3-7 Modules" className="w-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <img src="/school/entrepreneurship/ent_page_8.webp" alt="Age 8-11 Modules" className="w-full object-cover" />
            </div>
            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
              <img src="/school/entrepreneurship/ent_page_10.webp" alt="Age 12-16 Modules" className="w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Slide Deck Interactive Viewer */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
              Complete Slide Prospectus
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white mt-3 tracking-tight">
              Flip Through the Bootcamp Presentation
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-2">
              Review all 12 slides explaining student outcomes, age divisions, simulation activities, and national recognition.
            </p>
          </div>

          <div className="max-w-4xl mx-auto bg-slate-950 rounded-3xl p-4 sm:p-6 border border-slate-800 shadow-2xl">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 aspect-[16/10] sm:aspect-[16/9] bg-black">
              <img
                src={`/school/entrepreneurship/ent_page_${activeSlide}.webp`}
                alt={`Bootcamp Slide ${activeSlide}`}
                className="w-full h-full object-contain"
              />
            </div>

            {/* Thumbnail bar */}
            <div className="mt-4 flex items-center justify-between gap-2 overflow-x-auto pb-2">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <button
                  key={num}
                  onClick={() => setActiveSlide(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                    activeSlide === num
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  Slide {num}
                </button>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
              <span>Showing Slide {activeSlide} of 12</span>
              <button
                onClick={() => setGateOpen(true)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" /> Download Full Presentation PDF
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership & Credibility Section */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-red-600 bg-red-100 px-3 py-1 rounded-full">
              National Recognition
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 mt-3 tracking-tight">
              Backed by Sharks · Applauded by Mr. Amitabh Bachchan
            </h2>
            <p className="text-slate-600 text-sm sm:text-base mt-2">
              Shreyaan Daga's entrepreneurial vision has received national spotlight across Shark Tank India and KBC Season 16.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
              <div className="rounded-2xl overflow-hidden mb-4 relative group">
                <img src={SHARK_TANK_IMG} alt="Shark Tank India" className="w-full h-48 object-cover" />
                <a
                  href={SHARK_TANK_YT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </a>
              </div>
              <h4 className="font-bold text-slate-900 text-base">Shark Tank India Season 2</h4>
              <p className="text-xs text-slate-600 mt-1">
                Youngest founder funded on Shark Tank India at age 18, inspiring millions of school students nationwide.
              </p>
            </div>

            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-200">
              <div className="rounded-2xl overflow-hidden mb-4 relative group">
                <img src="/school/entrepreneurship/ent_page_12.webp" alt="KBC Hot Seat" className="w-full h-48 object-cover" />
                <a
                  href={KBC_YT}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute inset-0 bg-black/40 flex items-center justify-center group-hover:bg-black/60 transition"
                >
                  <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </div>
                </a>
              </div>
              <h4 className="font-bold text-slate-900 text-base">Kaun Banega Crorepati Season 16</h4>
              <p className="text-xs text-slate-600 mt-1">
                Applauded on the hot seat with Mr. Amitabh Bachchan for bringing financial literacy and future skills to 500+ schools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Inquiry Lead Form */}
      <section id="inquiry" className="py-16 sm:py-20 bg-gradient-to-b from-slate-50 to-amber-50/30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 sm:p-12">
            <div className="text-center max-w-xl mx-auto mb-8">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-3 py-1 rounded-full">
                School Consultation
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-3">
                Book a Financial Literacy & Entrepreneurship Bootcamp
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Available as a 5-day holiday bootcamp, weekend club, or year-round curriculum integrated into your school timetable.
              </p>
            </div>

            {submitted ? (
              <div className="text-center py-10 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Inquiry Received Successfully!</h3>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Thank you for reaching out. Our Academic Director will contact you within 24 hours to coordinate scheduling, student kits, and batch formats.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-xs font-bold text-amber-600 underline"
                >
                  Submit another request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">School Name *</label>
                    <input
                      type="text"
                      name="school_name"
                      required
                      value={form.school_name}
                      onChange={handleChange}
                      placeholder="e.g. Delhi Public School"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person Name</label>
                    <input
                      type="text"
                      name="contact_name"
                      value={form.contact_name}
                      onChange={handleChange}
                      placeholder="e.g. Principal / Vice Principal"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="10-digit mobile number"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Email ID</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="principal@school.com"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">City / State</label>
                    <input
                      type="text"
                      name="city"
                      value={form.city}
                      onChange={handleChange}
                      placeholder="e.g. Delhi NCR"
                      className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Preferred Bootcamp Format</label>
                  <select
                    name="format"
                    value={form.format}
                    onChange={handleChange}
                    className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="In-School Bootcamp (5–10 Days)">In-School Bootcamp (5–10 Days)</option>
                    <option value="Summer / Winter Holiday Camp">Summer / Winter Holiday Camp</option>
                    <option value="Year-Round Weekly Skill Curriculum">Year-Round Weekly Skill Curriculum (Grades 1–10)</option>
                    <option value="Weekend Club Format">Weekend Club Format</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Approximate Student Count / Requirements</label>
                  <textarea
                    name="message"
                    rows={2}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="e.g. Target grades (e.g. 6th to 9th), expected batch size 100 students..."
                    className="w-full text-sm px-4 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
                >
                  {submitting ? 'Submitting Request...' : 'Schedule Bootcamp Consultation →'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* LMS & Operational Backbone */}
      <LMSSection />

      {/* Cross-linking to related school programs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <SchoolRelatedPrograms current="entrepreneurship-bootcamp" />
      </div>

      {/* Footer */}
      <Footer />

      {/* Download Curriculum Gate Modal */}
      {gateOpen && (
        <CurriculumGateModal
          onClose={() => setGateOpen(false)}
          downloadUrl={BROCHURE_PDF_URL}
          fileName={BROCHURE_NAME}
          subject="Entrepreneurship & Financial Literacy Bootcamp Brochure"
        />
      )}
    </div>
  );
}
