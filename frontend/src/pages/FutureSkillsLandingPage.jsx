import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSeo from '../hooks/useSeo';
import {
  Sparkles, ArrowRight, Check, Clock, Users, Zap, Award,
  Bot, Cpu, Code2, Box, Wand2, ChevronDown, Star, Quote,
  Brain, Hammer, Rocket, BookOpenCheck, ShieldCheck, Calendar,
  TrendingUp, Lightbulb, Trophy, X, Heart, MapPin, Gift, Play,
  Video, ClipboardCheck, UserCheck, BadgeCheck, Bell
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// ── Skill buckets ─────────────────────────────────────────────────────────
const GIFS = [
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif',   label: 'Robotics' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/8i8zob06_Pyhton%20.gif',  label: 'Coding' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/je1umfoj_AI%20TOOl.gif',  label: 'AI' },
  { src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/xj8dva2y_3D%20Design.gif', label: '3D Design' },
];

const PRESS_ITEMS = [
  'Shark Tank India', 'Kaun Banega Crorepati', 'NDTV', 'Times of India',
  'Economic Times', 'India Today', 'YourStory', 'Inc42',
];

// ── Video testimonials (parents + students) ───────────────────────────────
const VIDEO_TESTIMONIALS = [
  {
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/39v27qp3_Testimonial%20Parents.mp4',
    poster: null,
    role: 'Parent',
    name: 'OLL Parents',
    line: '"Our kids come home buzzing about what they built."',
    accent: '#D63031',
  },
  {
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/yl1ydmda_IMG_7029.MOV',
    poster: null,
    role: 'Student',
    name: 'Young Builder · Grade 5',
    line: '"I made a robot that follows a line!"',
    accent: '#1E3A5F',
  },
  {
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4boxtvd2_IMG_7035.MOV',
    poster: null,
    role: 'Student',
    name: 'Young Coder · Grade 7',
    line: '"I wrote my first Python game in class."',
    accent: '#7B2C5C',
  },
  {
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/vo8r3dzk_IMG_7045.MOV',
    poster: null,
    role: 'Student',
    name: 'Young Creator · Grade 9',
    line: '"3D-printed my own phone stand this week!"',
    accent: '#D63031',
  },
];

// ── Real classroom media (images + videos) ───────────────────────────────
const CLASS_MEDIA = [
  {
    type: 'video',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/5h69is60_20260504_122331.mp4',
    label: 'Hands-on build',
    caption: 'Kids assembling their first IoT & AI lab kit',
  },
  {
    type: 'image',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg',
    label: 'Live class',
    caption: 'Working through a circuit module step by step',
  },
  {
    type: 'image',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/gwljm6r9_20260504_122607.jpg',
    label: 'Build station',
    caption: 'Pair-builds with the OLL IoT & AI Lab Kit',
  },
  {
    type: 'video',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/04pgqymv_20260504_123958.mp4',
    label: 'In action',
    caption: 'Real class footage — what a session feels like',
  },
  {
    type: 'image',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/tqatbciw_20260504_124243.jpg',
    label: 'Manipulative station',
    caption: 'Kids exploring components together',
  },
  {
    type: 'video',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9p89o2y6_20260504_154936.mp4',
    label: 'Class showcase',
    caption: 'Students presenting what they built today',
  },
  {
    type: 'image',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rhwyg94z_20260504_163950.jpg',
    label: 'Batch of builders',
    caption: 'End-of-class group photo — the whole crew',
  },
  {
    type: 'video',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/geb6vgey_VID20260504135039.mp4',
    label: 'Build moment',
    caption: 'Mid-class hands-on — heads-down focus',
  },
  {
    type: 'image',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/ctig02to_IMG-20260504-WA0020.jpg',
    label: 'Educator-led',
    caption: 'Trainers walking kids through their first build',
  },
  {
    type: 'video',
    src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/e7dknsgn_VID20260504155236.mp4',
    label: 'In progress',
    caption: 'Kids deep in their build — a real session glimpse',
  },
];

const SKILLS = [
  { icon: Bot, key: 'robotics', name: 'Robotics', tag: 'Build & program robots',
    out: 'From line-followers in Grade 3 to obstacle-avoiding bots in Grade 8. Real motors, real sensors, real "it works!"' },
  { icon: Code2, key: 'coding', name: 'Coding', tag: 'Block to Python',
    out: 'Scratch-style logic in early grades, Python by Grade 7. Kids ship games, websites & automations they can show off.' },
  { icon: Brain, key: 'ai', name: 'Artificial Intelligence', tag: 'AI tools & ethics',
    out: 'Train image classifiers, talk to chatbots they built, make AI art — and learn to spot deepfakes.' },
  { icon: Box, key: '3d', name: '3D Design', tag: 'CAD + 3D printing',
    out: 'Tinkercad → Fusion 360 progression. Many students 3D-print their own designs at our centers.' },
  { icon: Wand2, key: 'emerging', name: 'Emerging Tech', tag: 'AR/VR · IoT · Drones',
    out: 'Quarterly "wild card" modules — drone basics, augmented reality scenes, smart home circuits.' },
];

const HOW = [
  { icon: Calendar,    t: '1 Class / Week',         s: '90 minutes of hands-on tech, every week.' },
  { icon: MapPin,      t: 'Offline Centers',        s: 'In-centre or at partner schools — never just a screen.' },
  { icon: Users,       t: 'Small Batches · Max 10', s: 'Every kid gets the educator\'s eyes & feedback.' },
  { icon: TrendingUp,  t: 'Progressive Levels',     s: 'Grade-mapped curriculum that scales as they grow.' },
];

const TRANSFORM = {
  before: [
    { icon: X, t: 'Stuck consuming screens', s: 'YouTube, games, scroll' },
    { icon: X, t: 'Theory-heavy school work', s: 'Memorise, repeat, forget' },
    { icon: X, t: 'No outlet for curiosity',  s: '"Why?" gets shut down' },
    { icon: X, t: 'Shy of new tech',          s: 'Watches others use it' },
  ],
  after: [
    { icon: Heart, t: 'Creates with screens',         s: 'Builds games, robots, art' },
    { icon: Heart, t: 'Hands-on, lifelong learner',   s: 'Tries → fails → solves' },
    { icon: Heart, t: 'Confident problem-solver',     s: 'Owns the "why" and the "how"' },
    { icon: Heart, t: 'Future-ready & fearless',      s: 'AI, 3D, drones — bring it on' },
  ],
};

const TESTIMONIALS = [
  { name: 'Anita S., Grade 5 parent',  quote: 'My son went from gaming all weekend to spending Saturdays designing his own game. The shift in 3 months has been unreal.' },
  { name: 'Rajesh M., Grade 8 parent', quote: 'He builds robots at home now with parts he saves up for. The class lit a fire we didn\'t know was there.' },
  { name: 'Priya K., Grade 3 parent',  quote: 'Best investment beyond her academics. She actually looks forward to Saturdays.' },
];

const STATS = [
  { v: '2,500+', l: 'Students Trained' },
  { v: '500+',   l: 'Partner Schools' },
  { v: '10',     l: 'Max per Batch' },
  { v: '4.9/5',  l: 'Parent Rating' },
];

const FAQ = [
  { q: 'My child is in Grade 1. Is that too young?',
    a: 'Not at all — our youngest learners start at Grade 1 with story-driven robotics and block-based coding. Activities are tailored to grip strength and attention span.' },
  { q: 'What if my child has zero tech background?',
    a: 'Most don\'t when they start. Our curriculum is built for absolute beginners — all materials and kits are provided, and the educator paces the batch to the slowest learner.' },
  { q: 'Do I need to buy a laptop or kit?',
    a: 'No. Robotics kits are included free with the yearly plan. Laptops and tools live at the centre — kids work hands-on without family logistics.' },
  { q: 'Can my child switch between Robotics, Coding & AI?',
    a: 'Yes — one program covers all five skill tracks across the year, structured so kids try everything and find what they love.' },
  { q: 'Class missed? Refunds?',
    a: 'One make-up class per month is included free. Cancel anytime — yearly plan is refunded pro-rata for unused months.' },
  { q: 'How is this different from Whitehat / BYJU\'s?',
    a: 'Those are 1-on-1 online. We\'re offline, hands-on, with a small peer group — kids learn faster from each other, and the physical kits make every concept concrete.' },
];

// Animated background grid
const TechGrid = ({ accent = '#1E3A5F' }) => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
    <div className="absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage: `linear-gradient(${accent} 1px, transparent 1px), linear-gradient(90deg, ${accent} 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
      }}
    />
    <div className="absolute -top-32 -right-24 w-[420px] h-[420px] rounded-full blur-3xl"
      style={{ background: `${accent}26` }} />
    <div className="absolute top-40 -left-20 w-[320px] h-[320px] rounded-full blur-3xl"
      style={{ background: '#1E3A5F26' }} />
  </div>
);

const FutureSkillsLandingPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);
  const [videoOpen, setVideoOpen] = useState(null); // { src, name, line, role }
  const [mediaOpen, setMediaOpen] = useState(null); // { type, src, label, caption }

  useEffect(() => { window.scrollTo(0, 0); }, []);

  // ESC closes any open modal
  useEffect(() => {
    if (!videoOpen && !mediaOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setVideoOpen(null); setMediaOpen(null); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [videoOpen, mediaOpen]);

  // Smooth scroll-reveal — sections fade + lift in as they enter viewport.
  // Falls back to no-op on browsers without IntersectionObserver.
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Reveal everything immediately for users who prefer reduced motion.
      document.querySelectorAll('.fs-reveal').forEach((el) => el.classList.add('fs-in-view'));
      return undefined;
    }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('fs-in-view');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('.fs-reveal').forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const goTrial = () => navigate('/future-skills/book?mode=trial');
  const goSubscribe = (plan) => navigate(`/future-skills/book?mode=subscribe&plan=${plan}`);

  // ── SEO (React-19-safe imperative hook; replaces broken Helmet meta injection) ──
  useSeo({
    title: 'Future Skills Continuous Learning Program (Grades 1-10) | Robotics, Coding, AI, 3D Design | OLL',
    description: "OLL's flagship Future Skills program — weekly offline classes in Robotics, Coding, AI, 3D Design & Emerging Tech for Grades 1-10. Small batches of 10. Free robotic kit with yearly. Book a free trial from ₹1,750/month.",
    keywords: 'robotics for kids, coding classes for children, AI for kids India, 3D design classes, STEM education India, after school robotics, weekend coding classes, OLL future skills, kids tech classes Mumbai, Bengaluru, Pune',
    canonical: 'https://oll.co/future-skills',
    robots: 'index, follow, max-image-preview:large',
    og: {
      type: 'website',
      url: 'https://oll.co/future-skills',
      title: 'Future Skills Program · Robotics, Coding, AI & 3D for Kids (Grades 1-10) | OLL',
      description: 'Weekly offline classes · Small batches of 10 · Free robotic kit · Year-end Tech Showcase · From ₹1,750/month. Book a free trial today.',
      image: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg',
      siteName: 'OLL',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Future Skills Program · Robotics, Coding, AI & 3D for Kids | OLL',
      description: 'Weekly offline classes · Grades 1-10 · From ₹1,750/month · Free robotic kit. Book a free trial.',
      image: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg',
    },
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Course',
        name: 'Future Skills Continuous Learning Program',
        description: 'Year-round weekly offline classes in Robotics, Coding, AI, 3D Design & Emerging Tech for Grades 1-10.',
        provider: { '@type': 'Organization', name: 'OLL', url: 'https://oll.co', logo: 'https://oll.co/logo.png' },
        courseCode: 'OLL-FS-G1-10',
        educationalLevel: 'Grades 1-10',
        inLanguage: 'en',
        audience: { '@type': 'EducationalAudience', educationalRole: 'student', audienceType: 'Children · Grades 1-10' },
        offers: [
          { '@type': 'Offer', name: 'Monthly Plan', price: '2000', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://oll.co/future-skills/book?mode=subscribe&plan=monthly' },
          { '@type': 'Offer', name: 'Yearly Plan (Save ₹3,000 + Free Kit)', price: '21000', priceCurrency: 'INR', availability: 'https://schema.org/InStock', url: 'https://oll.co/future-skills/book?mode=subscribe&plan=yearly' },
        ],
        hasCourseInstance: {
          '@type': 'CourseInstance',
          courseMode: 'In-Person',
          location: { '@type': 'Place', name: 'OLL Centres · Mumbai · Pune · Bengaluru · Hyderabad · Delhi NCR' },
          courseSchedule: { '@type': 'Schedule', repeatFrequency: 'P1W', duration: 'PT90M' },
          instructor: { '@type': 'Person', name: 'OLL Educators · 2 trainers per batch · 1:5 ratio' },
        },
        aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.75', reviewCount: '500', bestRating: '5', worstRating: '1' },
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'OLL', item: 'https://oll.co/' },
          { '@type': 'ListItem', position: 2, name: 'Offerings', item: 'https://oll.co/offerings' },
          { '@type': 'ListItem', position: 3, name: 'Future Skills Program', item: 'https://oll.co/future-skills' },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen bg-white text-[#0F1E33] fs-stack" data-testid="future-skills-landing">

      <Navbar showBookDemo onBookDemo={goTrial} bookDemoLabel="Book Now" />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="fs-reveal relative pt-8 pb-12 sm:pt-12 sm:pb-16 md:pt-20 md:pb-20 overflow-hidden">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-[#D63031] text-[11px] sm:text-xs font-bold tracking-wide" data-testid="hero-badge">
                <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> NEW BATCHES STARTING THIS MONTH
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-[1.05] sm:leading-tight text-[#0F1E33]">
                Your child won't just<br />
                <span className="bg-gradient-to-r from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] bg-clip-text text-transparent">
                  use the future.
                </span><br />
                They'll build it.
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-xl">
                Hands-on weekly classes in Robotics, Coding, AI, 3D Design & emerging tech — for Grades 1 to 10.
                Small batches, real kits, lasting curiosity.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={goTrial}
                  className="group px-5 py-3 sm:px-7 sm:py-3.5 rounded-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F] text-white font-bold text-sm sm:text-base hover:from-[#B52828] hover:to-[#0F1E33] transition-all shadow-lg shadow-blue-900/25 hover:shadow-xl hover:shadow-blue-900/35 flex items-center gap-2"
                  data-testid="hero-trial-btn"
                >
                  Book a Free Trial Class
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a href="#pricing" className="px-5 py-3 sm:px-7 sm:py-3.5 rounded-full border-2 border-slate-200 hover:border-[#1E3A5F] text-[#1E3A5F] font-bold text-sm sm:text-base transition-colors flex items-center gap-2"
                  data-testid="hero-pricing-link">
                  See Pricing
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 sm:pt-3 text-xs sm:text-sm text-slate-600">
                <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1E3A5F]" /> Once a week · 90 min</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#1E3A5F]" /> Max 10 per batch</span>
                <span className="flex items-center gap-1.5"><Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D63031]" /> Robotic kit free w/ yearly</span>
              </div>
            </div>

            {/* Hero card — GIF showcase */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-br from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] rounded-3xl opacity-25 blur-xl" />
                <div className="relative bg-white border-2 border-blue-100 rounded-3xl p-5 sm:p-6 shadow-2xl shadow-blue-900/15">
                  <div className="text-[10px] uppercase tracking-widest text-[#D63031] font-black mb-1">Live at every OLL centre</div>
                  <h3 className="text-lg sm:text-xl font-black text-[#0F1E33] mb-4 leading-tight">What a weekly class actually looks like</h3>
                  <div className="grid grid-cols-2 gap-2.5">
                    {GIFS.map((g) => (
                      <div key={g.label} className="group">
                        <div className="relative overflow-hidden rounded-xl border-2 border-blue-100 hover:border-[#D63031] transition-all bg-slate-50 aspect-square shadow-md shadow-blue-900/5">
                          <img src={g.src} alt={g.label} loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0F1E33]/90 via-[#0F1E33]/40 to-transparent p-2">
                            <div className="text-[10px] font-black tracking-widest uppercase text-white">{g.label}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Starts at</div>
                      <div className="text-2xl font-black text-[#0F1E33]">₹1,750<span className="text-sm text-slate-500 font-bold">/month</span></div>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-[#D63031] bg-red-50 border border-red-200 px-2 py-1 rounded-full font-bold">Kit Included</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AS SEEN ON (National TV + Press ticker) ─────────────────────── */}
      <section className="fs-reveal py-12 lg:py-16 bg-gradient-to-b from-[#0F1E33] to-[#1E3A5F] text-white relative overflow-hidden" data-testid="fs-as-seen-on">
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        <div className="absolute -top-24 left-1/4 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(214,48,49,0.18)' }} />
        <div className="absolute -bottom-24 right-1/4 w-[360px] h-[360px] rounded-full blur-3xl pointer-events-none" style={{ background: 'rgba(37,99,235,0.22)' }} />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-7">
            <p className="text-[10px] font-black tracking-[0.22em] uppercase text-[#FCA5A5]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>featured.on.national.tv</p>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">As Seen On</h2>
            <p className="text-blue-200 text-sm mt-2 max-w-xl mx-auto">India's leading EdTech for young builders — trusted by the country's biggest stages.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 lg:gap-5">
            {/* KBC */}
            <div className="group relative rounded-2xl overflow-hidden border-2 border-white/10 hover:border-[#D63031]/60 transition-all shadow-2xl shadow-black/40" style={{ height: 260 }}
              data-testid="media-card-kbc">
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png"
                alt="Kaun Banega Crorepati" loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#FCA5A5] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sony Entertainment · KBC</div>
                <div className="font-black text-base lg:text-lg text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Kaun Banega Crorepati</div>
                <div className="text-xs text-blue-200 mt-1">Featured as India's leading EdTech for kids</div>
              </div>
            </div>

            {/* Shark Tank India */}
            <div className="group relative rounded-2xl overflow-hidden border-2 border-white/10 hover:border-[#60A5FA]/60 transition-all shadow-2xl shadow-black/40" style={{ height: 260 }}
              data-testid="media-card-shark-tank">
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png"
                alt="Shark Tank India" loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/40 to-transparent" />
              <div className="absolute bottom-4 left-5 right-5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#60A5FA] mb-1" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Sony LIV · Season Finale</div>
                <div className="font-black text-base lg:text-lg text-white" style={{ fontFamily: "'JetBrains Mono', monospace" }}>Shark Tank India</div>
                <div className="text-xs text-blue-200 mt-1">Pitched to India's top investors on national TV</div>
              </div>
            </div>
          </div>

          {/* Press ticker */}
          <div className="mt-8 overflow-hidden">
            <div className="text-center mb-3">
              <span className="text-[10px] font-bold tracking-[0.22em] uppercase text-blue-300/70" style={{ fontFamily: "'JetBrains Mono', monospace" }}>// Also covered by</span>
            </div>
            <div className="fs-ticker-wrap">
              <div className="fs-ticker-inner">
                {[...PRESS_ITEMS, ...PRESS_ITEMS].map((name, i) => (
                  <span key={i} className="fs-ticker-item">{name}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .fs-ticker-wrap { position: relative; overflow: hidden; mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent); }
          .fs-ticker-inner { display: flex; gap: 3rem; white-space: nowrap; animation: fs-ticker-scroll 32s linear infinite; width: max-content; }
          .fs-ticker-item { font-family: 'JetBrains Mono', monospace; font-size: 0.95rem; font-weight: 800; color: rgba(255,255,255,0.55); letter-spacing: 0.08em; text-transform: uppercase; padding: 0.25rem 0; flex-shrink: 0; transition: color 0.2s; }
          .fs-ticker-item:hover { color: #FCA5A5; }
          @keyframes fs-ticker-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        `}</style>
      </section>

      {/* ── USP · SAFETY & TRANSPARENCY ──────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden" data-testid="fs-usp-section">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(#1E3A5F 1px, transparent 1px), linear-gradient(90deg, #1E3A5F 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D63031]/10 to-[#1E3A5F]/10 border border-[#D63031]/20 text-[10px] font-black tracking-widest uppercase text-[#D63031]">
              <ShieldCheck className="w-3.5 h-3.5" /> Why parents trust us
            </div>
            <h2 className="text-3xl lg:text-5xl font-black text-[#0F1E33] mt-4 leading-tight">
              Safety & Transparency.<br />
              <span className="bg-gradient-to-r from-[#D63031] to-[#1E3A5F] bg-clip-text text-transparent">
                Our top priority.
              </span>
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto mt-3 text-base">
              You see everything. You hear everything. And if you're not convinced — you get every rupee back.
            </p>
          </div>

          {/* USP grid — each card visually distinct */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* CARD 1 · LIVE STREAMING — dark navy, "live screen" feel */}
            <div className="relative rounded-3xl bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F] text-white p-6 overflow-hidden shadow-2xl shadow-blue-900/30 hover:shadow-blue-900/50 hover:-translate-y-1 transition-all"
              data-testid="usp-live-streaming">
              {/* Faux camera scan lines */}
              <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent 0px, transparent 3px, white 3px, white 4px)' }} />
              {/* Live pulse pill */}
              <div className="relative flex items-center justify-between mb-5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#D63031]/20 border border-[#D63031]/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FCA5A5] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D63031]" />
                  </span>
                  <span className="text-[9px] font-black tracking-widest uppercase text-[#FCA5A5]">Live</span>
                </div>
                <Video className="w-5 h-5 text-blue-300" />
              </div>
              <div className="relative">
                <h3 className="text-xl font-black leading-tight">Live Stream Every Class</h3>
                <p className="text-sm text-blue-100 mt-2 leading-relaxed">
                  Watch your child build, code & create in real time — from your phone, anywhere, anytime.
                </p>
                <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-2 text-[11px] text-blue-200">
                  <Check className="w-3.5 h-3.5 text-[#FCA5A5] flex-shrink-0" />
                  <span>Secure, parent-only feed</span>
                </div>
              </div>
            </div>

            {/* CARD 2 · DAILY REPORTING — light card, "report" feel with bell + checklist */}
            <div className="relative rounded-3xl bg-white border-2 border-[#D63031]/30 p-6 overflow-hidden shadow-xl shadow-red-100/50 hover:border-[#D63031] hover:-translate-y-1 transition-all"
              data-testid="usp-daily-reporting">
              {/* Pattern */}
              <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br from-[#D63031]/15 to-[#D63031]/5 blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-[#D63031] text-white flex items-center justify-center shadow-lg shadow-red-200">
                    <Bell className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black tracking-widest uppercase text-[#D63031] bg-red-50 border border-red-200 px-2 py-1 rounded-full">Daily</span>
                </div>
                <h3 className="text-xl font-black text-[#0F1E33] leading-tight">Daily Parent Reports</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  After every class, you get a WhatsApp + email update on attendance, what was learnt & what's next.
                </p>
                {/* Mini checklist */}
                <ul className="mt-5 pt-4 border-t border-slate-100 space-y-1.5">
                  {['Attendance ✓', 'Topics covered', 'What to ask your child'].map((line) => (
                    <li key={line} className="flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                      <ClipboardCheck className="w-3.5 h-3.5 text-[#D63031] flex-shrink-0" /> {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* CARD 3 · 1:5 RATIO — bold ratio number, ribbon style */}
            <div className="relative rounded-3xl bg-gradient-to-br from-white to-blue-50/40 border-2 border-[#1E3A5F]/25 p-6 overflow-hidden shadow-xl shadow-blue-100/60 hover:border-[#1E3A5F] hover:-translate-y-1 transition-all"
              data-testid="usp-teacher-ratio">
              {/* Big ratio */}
              <div className="absolute top-3 right-3 text-[5rem] font-black leading-none bg-gradient-to-br from-[#D63031] to-[#1E3A5F] bg-clip-text text-transparent opacity-20" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                1:5
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D63031] to-[#1E3A5F] text-white flex items-center justify-center shadow-lg shadow-blue-900/20 mb-5">
                  <UserCheck className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-black text-[#0F1E33] leading-tight">2 Teachers · 1:5 Ratio</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Two qualified educators in every batch. <strong className="text-[#1E3A5F]">One trainer for every 5 kids</strong> — no one falls behind.
                </p>
                <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className="w-7 h-7 rounded-full border-2 border-white bg-gradient-to-br from-blue-100 to-red-100 flex items-center justify-center text-[10px] font-black text-[#1E3A5F]">
                        {i}
                      </div>
                    ))}
                  </div>
                  <span className="text-[10px] font-black tracking-widest uppercase text-[#D63031]">Per Trainer</span>
                </div>
              </div>
            </div>

            {/* CARD 4 · 100% REFUND — guarantee badge */}
            <div className="relative rounded-3xl bg-gradient-to-br from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] text-white p-6 overflow-hidden shadow-2xl shadow-red-900/25 hover:shadow-red-900/40 hover:-translate-y-1 transition-all"
              data-testid="usp-refund">
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              {/* Big 100% badge */}
              <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-3xl font-black leading-none" style={{ fontFamily: "'JetBrains Mono', monospace" }}>100%</div>
                  <div className="text-[8px] font-bold tracking-widest uppercase mt-0.5 text-white/80">Money Back</div>
                </div>
              </div>
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm border border-white/30 flex items-center justify-center mb-5">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-xl font-black leading-tight">100% Refund Guarantee</h3>
                <p className="text-sm text-white/90 mt-2 leading-relaxed">
                  Not satisfied with the program? Get every rupee back. No fine print, no questions asked.
                </p>
                <div className="mt-5 pt-4 border-t border-white/15 flex items-center gap-2 text-[11px] text-white/85 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-white flex-shrink-0" />
                  <span>The OLL Parent Promise</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SOLUTION ─────────────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 relative">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-5xl mx-auto">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">A different kind of class</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2 mb-4">The Future Skills Program</h2>
            <p className="text-slate-600 max-w-2xl mx-auto mb-10 text-lg">
              Once a week, your child walks into a centre, picks up a kit, and <strong className="text-[#1E3A5F]">builds something real</strong>.
              Robots that move. Code that runs. Designs that print. Across 5 future-defining skill tracks — taught by educators, not videos.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: Hammer,    t: 'Build by doing',     s: 'Every class produces a thing they take home or display.' },
                { icon: Lightbulb, t: 'Curiosity-led',      s: 'Kids choose what to deepen — robots, AI, 3D, you decide.' },
                { icon: Rocket,    t: 'Compounding skills', s: 'Today\'s line-follower becomes tomorrow\'s drone.' },
              ].map((p, i) => (
                <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6 hover:border-[#1E3A5F] transition-all hover:-translate-y-0.5">
                  <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-50 to-blue-50 flex items-center justify-center text-[#1E3A5F] mb-3 border border-blue-200">
                    <p.icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-black text-[#0F1E33] text-base">{p.t}</h3>
                  <p className="text-sm text-slate-500 mt-1.5">{p.s}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── Real class moments gallery ─────────────────────────── */}
          <div className="mt-14 lg:mt-16" data-testid="fs-class-moments">
            <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
              <div>
                <span className="text-[10px] font-black tracking-[0.22em] uppercase text-[#D63031]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>// real moments · real builds</span>
                <h3 className="text-xl lg:text-2xl font-black text-[#0F1E33] mt-1">Inside an OLL classroom</h3>
              </div>
              <span className="text-[11px] text-slate-500 italic">Tap any tile to play / view</span>
            </div>

            {/* Two stacked asymmetric mosaics — 5 tiles each */}
            <div className="space-y-3 sm:space-y-4">
              {[0, 5].map((startIdx) => (
                <div key={startIdx} className="grid grid-cols-6 grid-rows-2 gap-2.5 sm:gap-3 h-[440px] sm:h-[520px]">
                  {CLASS_MEDIA.slice(startIdx, startIdx + 5).map((m, j) => {
                    const i = startIdx + j;
                    // Big tile alternates side: row 1 left, row 2 right
                    const bigOnLeft = startIdx === 0;
                    const layouts = bigOnLeft
                      ? [
                          'col-span-3 row-span-2',                  // big (left)
                          'col-span-3 sm:col-span-2 row-span-1',
                          'col-span-3 sm:col-span-1 row-span-1',
                          'col-span-3 sm:col-span-2 row-span-1',
                          'col-span-3 sm:col-span-1 row-span-1',
                        ]
                      : [
                          'col-span-3 sm:col-span-2 row-span-1',
                          'col-span-3 sm:col-span-1 row-span-1',
                          'col-span-3 row-span-2 order-first sm:order-none', // big (right on desktop, top on mobile)
                          'col-span-3 sm:col-span-2 row-span-1',
                          'col-span-3 sm:col-span-1 row-span-1',
                        ];
                    return (
                      <button key={i} onClick={() => setMediaOpen(m)}
                        className={`group relative ${layouts[j]} rounded-2xl overflow-hidden border-2 border-blue-100 hover:border-[#D63031] transition-all shadow-lg shadow-blue-900/10 hover:shadow-2xl bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F]`}
                        data-testid={`class-moment-${i}`}
                        aria-label={`View ${m.label}`}>
                        {m.type === 'video' ? (
                          <video src={m.src} preload="metadata" muted playsInline
                            className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                            style={{ pointerEvents: 'none' }} />
                        ) : (
                          <img src={m.src} alt={m.label} loading="lazy"
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        )}
                        {/* Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/30 to-transparent opacity-90 group-hover:opacity-95 transition-opacity" />
                        {/* Type pill */}
                        <div className="absolute top-2.5 left-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black tracking-widest uppercase backdrop-blur-sm border"
                            style={{
                              background: m.type === 'video' ? 'rgba(214,48,49,0.65)' : 'rgba(30,58,95,0.65)',
                              borderColor: m.type === 'video' ? '#D63031' : '#60A5FA',
                              color: '#fff',
                            }}>
                            {m.type === 'video' ? <Video className="w-2.5 h-2.5" /> : <Sparkles className="w-2.5 h-2.5" />}
                            {m.type === 'video' ? 'Video' : 'Photo'}
                          </span>
                        </div>
                        {/* Centered play button for videos */}
                        {m.type === 'video' && (
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#D63031] group-hover:border-[#D63031] transition-all shadow-2xl">
                              <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white translate-x-0.5" />
                            </div>
                          </div>
                        )}
                        {/* Caption */}
                        <div className="absolute bottom-0 inset-x-0 p-3 text-left">
                          <div className="text-xs font-black text-white leading-tight">{m.label}</div>
                          <div className="text-[10px] text-blue-200 mt-0.5 leading-snug line-clamp-2 hidden sm:block">{m.caption}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="text-center mt-5">
              <span className="text-[11px] text-slate-500 italic">{CLASS_MEDIA.length} moments · captured at our centres in May 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── WHAT THEY LEARN ──────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">5 Tracks · 1 program</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">What your child will actually walk away with</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Outcome-focused, grade-mapped, taught hands-on.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SKILLS.map((s, i) => (
              <div key={s.key}
                className="group relative bg-white border-2 border-slate-100 hover:border-[#1E3A5F] rounded-2xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/50 hover:-translate-y-1"
                data-testid={`skill-card-${s.key}`}>
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D63031] to-[#1E3A5F] text-white flex items-center justify-center mb-4 shadow-lg shadow-blue-900/30">
                  <s.icon className="w-7 h-7" />
                </div>
                <div className="text-[11px] font-bold tracking-wider uppercase text-[#D63031]">{s.tag}</div>
                <h3 className="text-xl font-black text-[#0F1E33] mt-1">{s.name}</h3>
                <p className="text-sm text-slate-600 leading-relaxed mt-2">{s.out}</p>
              </div>
            ))}
            <div className="relative bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F] text-white border-2 border-blue-900 rounded-2xl p-6">
              <div className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center mb-4">
                <Trophy className="w-7 h-7 text-[#FCA5A5]" />
              </div>
              <div className="text-[11px] font-bold tracking-wider uppercase text-[#FCA5A5]">Year-end</div>
              <h3 className="text-xl font-black mt-1">Tech Showcase Project</h3>
              <p className="text-sm text-blue-100 leading-relaxed mt-2">Every student presents their year's biggest build — robots, apps, AI projects — to parents and an industry panel.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── CURRICULUM BY TIER ───────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Grade-mapped curriculum</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">A different curriculum for every age.</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Same five skill tracks, paced exactly right for your child's grade.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              {
                tier: 'Junior',
                grades: 'Grades 1 – 4',
                accent: 'from-[#D63031] to-[#7B2C5C]',
                badge: 'bg-red-50 text-[#D63031] border-red-200',
                items: [
                  'Story-led robotics — first robots that move, light up & beep',
                  'Block coding (Scratch) — animations & simple games',
                  'AI play — train an image classifier with their drawings',
                  'Intro 3D — Tinkercad shapes, name keyrings, simple models',
                  'Soft skills — listening, sharing kits, asking "what if?"',
                ],
              },
              {
                tier: 'Middle',
                grades: 'Grades 5 – 7',
                accent: 'from-[#7B2C5C] to-[#1E3A5F]',
                badge: 'bg-gradient-to-r from-red-50 to-blue-50 text-[#7B2C5C] border-blue-200',
                items: [
                  'Sensor robotics — line followers, obstacle avoidance, claws',
                  'Python intro — first scripts, console games, simple bots',
                  'AI tools — chatbots, image gen, deepfake spotting',
                  'Tinkercad 3D — print-ready models, mechanical assemblies',
                  'Project showcase — a build they own and present',
                ],
              },
              {
                tier: 'Senior',
                grades: 'Grades 8 – 10',
                accent: 'from-[#1E3A5F] to-[#0F1E33]',
                badge: 'bg-blue-50 text-[#1E3A5F] border-blue-200',
                items: [
                  'Advanced robotics + IoT — Arduino, sensors, smart-home circuits',
                  'Python projects — automations, web scrapers, mini apps',
                  'ML basics — train a real model, evaluate accuracy, ethics',
                  'Fusion 360 + 3D printing — designed-to-print engineering',
                  'Capstone build — portfolio-grade tech project for school & beyond',
                ],
              },
            ].map((t, i) => (
              <div key={t.tier}
                className="relative bg-white border-2 border-slate-100 hover:border-[#1E3A5F] rounded-3xl p-6 transition-all hover:shadow-xl hover:shadow-blue-100/40 hover:-translate-y-1"
                data-testid={`tier-card-${t.tier.toLowerCase()}`}>
                <div className={`inline-flex items-center text-[10px] font-black tracking-widest uppercase px-2 py-1 rounded-full border ${t.badge}`}>
                  {t.grades}
                </div>
                <h3 className={`text-2xl font-black mt-3 bg-gradient-to-r ${t.accent} bg-clip-text text-transparent`}>
                  {t.tier} Track
                </h3>
                <ul className="mt-4 space-y-2.5">
                  {t.items.map((line, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
                      <Check className="w-4 h-4 text-[#D63031] flex-shrink-0 mt-0.5" /> {line}
                    </li>
                  ))}
                </ul>
                <button onClick={goTrial}
                  className="mt-5 text-xs font-bold text-[#1E3A5F] hover:text-[#D63031] inline-flex items-center gap-1 transition-colors"
                  data-testid={`tier-trial-${t.tier.toLowerCase()}-btn`}>
                  Book free trial for this tier <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">How the program runs</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">A rhythm that fits your week</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {HOW.map((h, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6 text-center hover:border-[#1E3A5F] transition-all" data-testid={`how-${i}`}>
                <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-red-50 to-blue-50 border border-blue-200 flex items-center justify-center text-[#1E3A5F] mb-3">
                  <h.icon className="w-6 h-6" />
                </div>
                <h3 className="font-black text-[#0F1E33]">{h.t}</h3>
                <p className="text-sm text-slate-500 mt-1.5 leading-snug">{h.s}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRANSFORMATION ───────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 bg-gradient-to-br from-[#0F1E33] via-[#1E3A5F] to-[#0F1E33] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#FCA5A5] uppercase">The transformation</span>
            <h2 className="text-3xl lg:text-4xl font-black mt-2">From screen-stuck to skill-stacked.</h2>
            <p className="text-blue-200 max-w-2xl mx-auto mt-2 text-sm">A 90-day shift in how your child sees themselves and tech.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl border-2 border-[#D63031]/40 bg-[#D63031]/5 p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-[#FCA5A5] mb-2">Before OLL</div>
              <ul className="space-y-3">
                {TRANSFORM.before.map((b, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-[#D63031]/20 border border-[#D63031]/40 flex items-center justify-center text-[#FCA5A5] flex-shrink-0">
                      <b.icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="font-bold">{b.t}</div>
                      <div className="text-xs text-blue-200">{b.s}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border-2 border-blue-300/40 bg-blue-300/10 p-6">
              <div className="text-[11px] font-bold tracking-widest uppercase text-blue-200 mb-2">After 3 months at OLL</div>
              <ul className="space-y-3">
                {TRANSFORM.after.map((a, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-blue-300/20 border border-blue-200/40 flex items-center justify-center text-blue-100 flex-shrink-0">
                      <a.icon className="w-3.5 h-3.5" />
                    </span>
                    <div>
                      <div className="font-bold">{a.t}</div>
                      <div className="text-xs text-blue-100">{a.s}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF ─────────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Numbers parents trust</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">2,500+ kids. 500+ schools. One mission.</h2>
          </div>

          {/* ── Rating bar — 4.75 / 5 ─────────────────────────────────── */}
          <div className="max-w-2xl mx-auto mb-10" data-testid="fs-rating-bar">
            <div className="bg-white border-2 border-blue-100 rounded-3xl px-5 sm:px-7 py-5 shadow-xl shadow-blue-900/8">
              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Big number */}
                <div className="text-center sm:text-left flex-shrink-0">
                  <div className="flex items-baseline gap-1 justify-center sm:justify-start">
                    <span className="text-5xl sm:text-6xl font-black bg-gradient-to-r from-[#D63031] to-[#1E3A5F] bg-clip-text text-transparent">4.75</span>
                    <span className="text-xl font-black text-slate-400">/5</span>
                  </div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-[#D63031] mt-1">Parent rating</div>
                </div>

                {/* Bars */}
                <div className="flex-1 w-full">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start mb-3">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-5 h-5 ${i <= 4 ? 'fill-[#D63031] text-[#D63031]' : 'fill-[#D63031]/75 text-[#D63031]/75'}`} />
                    ))}
                    <span className="text-xs font-semibold text-slate-500 ml-2">based on 500+ reviews</span>
                  </div>
                  {[
                    { label: '5★', pct: 82 },
                    { label: '4★', pct: 14 },
                    { label: '3★', pct: 3 },
                    { label: '2★', pct: 1 },
                  ].map(r => (
                    <div key={r.label} className="flex items-center gap-2 text-[11px] mb-1">
                      <span className="w-6 font-bold text-slate-500">{r.label}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-[#D63031] to-[#1E3A5F]" style={{ width: `${r.pct}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono font-bold text-slate-400">{r.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Video testimonials ──────────────────────────────────────── */}
          <div className="mb-12" data-testid="fs-video-testimonials">
            <div className="text-center mb-6">
              <span className="text-[10px] font-black tracking-[0.2em] uppercase text-[#D63031]">// Real voices · real builds</span>
              <h3 className="text-xl lg:text-2xl font-black text-[#0F1E33] mt-1">Hear it from our parents & students</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {VIDEO_TESTIMONIALS.map((v, i) => (
                <button key={i} onClick={() => setVideoOpen(v)}
                  className="group relative aspect-[3/4] rounded-2xl overflow-hidden border-2 border-blue-100 hover:border-[#D63031] transition-all shadow-lg shadow-blue-900/10 hover:shadow-2xl hover:-translate-y-0.5 bg-gradient-to-br from-[#0F1E33] to-[#1E3A5F]"
                  data-testid={`video-testimonial-${i}`}
                  aria-label={`Play ${v.role} testimonial`}>
                  {/* Lazy-loaded inline preview frame */}
                  <video src={v.src} preload="metadata" muted playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    style={{ pointerEvents: 'none' }} />
                  {/* Dark overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1E33] via-[#0F1E33]/40 to-[#0F1E33]/20" />
                  {/* Play button center */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-14 lg:w-16 lg:h-16 rounded-full bg-white/15 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center group-hover:scale-110 group-hover:bg-[#D63031] group-hover:border-[#D63031] transition-all shadow-2xl">
                      <Play className="w-6 h-6 lg:w-7 lg:h-7 text-white fill-white translate-x-0.5" />
                    </div>
                  </div>
                  {/* Role pill (top-left) */}
                  <div className="absolute top-3 left-3">
                    <span className="text-[9px] font-black tracking-widest uppercase text-white px-2 py-1 rounded-full backdrop-blur-sm border"
                      style={{ background: `${v.accent}aa`, borderColor: `${v.accent}` }}>
                      {v.role}
                    </span>
                  </div>
                  {/* Caption (bottom) */}
                  <div className="absolute bottom-0 inset-x-0 p-3 lg:p-4 text-left">
                    <div className="text-xs lg:text-sm font-black text-white leading-tight">{v.name}</div>
                    <div className="text-[10px] lg:text-[11px] text-blue-200 mt-1 leading-snug line-clamp-2">{v.line}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white border-2 border-slate-100 rounded-2xl p-6" data-testid={`testimonial-${i}`}>
                <Quote className="w-6 h-6 text-[#D63031]/60 mb-3" />
                <p className="text-sm text-slate-700 leading-relaxed italic">"{t.quote}"</p>
                <div className="flex items-center gap-1 mt-3 mb-1">
                  {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-[#D63031] text-[#D63031]" />)}
                </div>
                <div className="text-xs font-bold text-[#0F1E33]">{t.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────── */}
      <section id="pricing" className="fs-reveal py-16 lg:py-20 bg-gradient-to-b from-blue-50/40 to-white relative">
        <TechGrid accent="#1E3A5F" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold tracking-widest text-[#D63031] uppercase">Investment, not expense</span>
            <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] mt-2">Simple subscription pricing</h2>
            <p className="text-slate-500 mt-2 max-w-xl mx-auto text-sm">Cancel anytime. Robotic kit free with yearly. 1 free make-up class per month.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            <div className="bg-white border-2 border-slate-200 rounded-3xl p-7 hover:border-[#1E3A5F] transition-all" data-testid="plan-monthly">
              <div className="text-xs font-bold tracking-widest text-slate-500 uppercase">Monthly</div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-5xl font-black text-[#0F1E33]">₹2,000</span>
                <span className="text-sm text-slate-500 font-bold">/month</span>
              </div>
              <div className="text-xs text-slate-500 mt-1">Cancel anytime · Billed monthly</div>
              <ul className="space-y-2.5 mt-5 text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> 4 classes per month</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> All 5 skill tracks</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> Small batch · max 10</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#1E3A5F]" /> Kit access at centre</li>
                <li className="flex items-center gap-2 text-slate-400"><X className="w-4 h-4 text-slate-300" /> Take-home robotic kit</li>
              </ul>
              <button onClick={() => goSubscribe('monthly')}
                className="w-full mt-6 py-3 rounded-xl border-2 border-[#1E3A5F] text-[#1E3A5F] font-bold hover:bg-[#1E3A5F] hover:text-white transition-all"
                data-testid="plan-monthly-btn">
                Choose Monthly
              </button>
            </div>

            <div className="relative bg-gradient-to-br from-[#1E3A5F] to-[#0F1E33] text-white border-2 border-[#D63031] rounded-3xl p-7 shadow-2xl shadow-blue-900/30" data-testid="plan-yearly">
              <span className="absolute -top-3 right-6 bg-[#D63031] text-white text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full shadow-lg shadow-[#D63031]/40">Save ₹3,000</span>
              <div className="text-xs font-bold tracking-widest text-[#FCA5A5] uppercase">Yearly · Best Value</div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-5xl font-black">₹1,750</span>
                <span className="text-sm text-blue-200 font-bold">/month</span>
              </div>
              <div className="text-xs text-blue-200 mt-1">₹21,000 billed annually</div>
              <ul className="space-y-2.5 mt-5 text-sm">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> 48 classes (full year)</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> All 5 skill tracks</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> Small batch · max 10</li>
                <li className="flex items-center gap-2 text-[#FCA5A5] font-semibold"><Gift className="w-4 h-4 text-[#FCA5A5]" /> Free Robotic Kit · Take Home</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-[#FCA5A5]" /> Year-end Tech Showcase</li>
              </ul>
              <button onClick={() => goSubscribe('yearly')}
                className="w-full mt-6 py-3 rounded-xl bg-[#D63031] text-white font-bold hover:bg-[#B52828] transition-all shadow-lg shadow-[#D63031]/40"
                data-testid="plan-yearly-btn">
                Choose Yearly · Save ₹3,000
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── URGENCY + FINAL CTA ─────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[#D63031] via-[#7B2C5C] to-[#1E3A5F] rounded-3xl p-8 lg:p-12 text-white text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 border border-white/30 text-xs font-bold tracking-wide backdrop-blur-sm">
                <Clock className="w-3.5 h-3.5" /> NEW BATCH FILLING UP · ONLY 4 SEATS LEFT
              </div>
              <h2 className="text-3xl lg:text-5xl font-black mt-4">Don't miss the next batch.</h2>
              <p className="text-white/90 mt-3 text-base lg:text-lg max-w-2xl mx-auto">
                Each batch caps at 10 students for a reason. Once it fills, you wait a month.
                Free trial slots are limited too — claim yours before it's gone.
              </p>
              <div className="flex flex-wrap gap-3 justify-center mt-6">
                <button onClick={goTrial}
                  className="px-7 py-3.5 rounded-full bg-white text-[#1E3A5F] font-bold text-base hover:bg-slate-100 transition-all shadow-lg flex items-center gap-2"
                  data-testid="final-cta-trial-btn">
                  Book Free Trial Class <ArrowRight className="w-5 h-5" />
                </button>
                <button onClick={() => goSubscribe('yearly')}
                  className="px-7 py-3.5 rounded-full border-2 border-white text-white font-bold text-base hover:bg-white/10 transition-all">
                  Subscribe Now · Save ₹3,000
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="fs-reveal py-16 lg:py-20 bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl lg:text-4xl font-black text-[#0F1E33] text-center mb-2">Parent questions, answered.</h2>
          <p className="text-center text-slate-500 mb-8 text-sm">Quick answers to what every parent asks before booking.</p>
          <div className="space-y-2.5">
            {FAQ.map((f, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className={`bg-white border-2 ${isOpen ? 'border-[#1E3A5F]' : 'border-slate-100'} rounded-2xl overflow-hidden transition-all`} data-testid={`faq-${idx}`}>
                  <button onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left hover:bg-blue-50/30">
                    <span className="font-bold text-[#0F1E33] text-sm">{f.q}</span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180 text-[#D63031]' : ''}`} />
                  </button>
                  {isOpen && <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{f.a}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />

      {/* ── Class media modal (image OR video) ───────────────────────── */}
      {mediaOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setMediaOpen(null); }}
          data-testid="media-modal">
          <button onClick={(e) => { e.stopPropagation(); setMediaOpen(null); }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#D63031] border border-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm z-10"
            data-testid="media-modal-close-btn"
            aria-label="Close">
            <X className="w-5 h-5 pointer-events-none" />
          </button>
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/60 bg-[#0F1E33]">
              {mediaOpen.type === 'video' ? (
                <video src={mediaOpen.src} controls autoPlay playsInline
                  className="w-full max-h-[75vh] bg-black"
                  data-testid="media-modal-video">
                  Your browser doesn't support inline video.
                </video>
              ) : (
                <img src={mediaOpen.src} alt={mediaOpen.label}
                  className="w-full max-h-[80vh] object-contain bg-black"
                  data-testid="media-modal-image" />
              )}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#D63031]/10 to-[#1E3A5F]/10">
                <div className="text-[10px] font-black tracking-widest uppercase text-[#FCA5A5]">{mediaOpen.type === 'video' ? 'Class footage' : 'Class moment'}</div>
                <div className="text-base sm:text-lg font-black text-white mt-1">{mediaOpen.label}</div>
                <p className="text-sm text-blue-100 mt-1">{mediaOpen.caption}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Video testimonials modal ─────────────────────────────────── */}
      {videoOpen && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setVideoOpen(null); }}
          data-testid="video-modal">
          <button onClick={(e) => { e.stopPropagation(); setVideoOpen(null); }}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 w-11 h-11 rounded-full bg-white/10 hover:bg-[#D63031] border border-white/30 flex items-center justify-center text-white transition-all backdrop-blur-sm z-10"
            data-testid="video-modal-close-btn"
            aria-label="Close video">
            <X className="w-5 h-5 pointer-events-none" />
          </button>
          <div className="w-full max-w-md sm:max-w-lg lg:max-w-xl">
            <div className="rounded-2xl overflow-hidden border-2 border-white/15 shadow-2xl shadow-black/60 bg-[#0F1E33]">
              <video src={videoOpen.src} controls autoPlay playsInline
                className="w-full max-h-[75vh] bg-black"
                data-testid="video-modal-player">
                Your browser doesn't support inline video. <a href={videoOpen.src} className="underline">Open video</a>.
              </video>
              <div className="p-4 sm:p-5 bg-gradient-to-r from-[#D63031]/10 to-[#1E3A5F]/10">
                <div className="text-[10px] font-black tracking-widest uppercase text-[#FCA5A5]">{videoOpen.role}</div>
                <div className="text-base sm:text-lg font-black text-white mt-1">{videoOpen.name}</div>
                <p className="text-sm text-blue-100 mt-1 italic">{videoOpen.line}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Global scroll-reveal + mobile polish ─────────────────────── */}
      <style>{`
        /* Smooth scroll-reveal: each section fades + lifts as it enters viewport */
        .fs-reveal {
          opacity: 0;
          transform: translateY(48px) scale(0.985);
          transition: opacity 0.9s cubic-bezier(0.22, 0.61, 0.36, 1),
                      transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1);
          will-change: opacity, transform;
        }
        .fs-reveal.fs-in-view {
          opacity: 1;
          transform: translateY(0) scale(1);
        }

        /* Native scroll-driven view-timeline animation (Chrome 115+, Safari TP).
           Falls back gracefully — IntersectionObserver still handles it. */
        @supports (animation-timeline: view()) {
          .fs-reveal {
            opacity: 1;
            transform: none;
            transition: none;
            animation: fs-stack-in linear both;
            animation-timeline: view();
            animation-range: entry 0% cover 22%;
          }
          .fs-reveal.fs-in-view { animation: none; }
          @keyframes fs-stack-in {
            from { opacity: 0; transform: translateY(56px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }
        }

        /* Honor user motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .fs-reveal { opacity: 1 !important; transform: none !important; animation: none !important; transition: none !important; }
        }

        html { scroll-behavior: smooth; }

        /* ──────── Mobile dynamic polish ──────── */
        @media (max-width: 640px) {
          /* Tighter section padding on mobile */
          .fs-stack > section { padding-top: 3rem; padding-bottom: 3rem; }

          /* Hero text scales down for readability */
          .fs-stack h1 { font-size: clamp(1.85rem, 8vw, 2.5rem); line-height: 1.1; }

          /* As-Seen-On TV cards: shorter, still cinematic */
          [data-testid="fs-as-seen-on"] [data-testid^="media-card-"] { height: 200px !important; }
          [data-testid="fs-as-seen-on"] h2 { font-size: 1.85rem; }

          /* Press ticker — smaller, faster pace on mobile */
          .fs-ticker-item { font-size: 0.8rem !important; }
          .fs-ticker-inner { gap: 1.85rem !important; animation-duration: 22s !important; }

          /* Class moments mosaic — shorter so kids' faces stay visible */
          [data-testid="fs-class-moments"] .grid-cols-6 { height: 380px !important; }

          /* USP cards — slightly tighter */
          [data-testid="fs-usp-section"] h2 { font-size: 1.85rem; line-height: 1.15; }

          /* Pricing cards padding tight */
          [data-testid="plan-monthly"], [data-testid="plan-yearly"] { padding: 1.5rem !important; }

          /* Final CTA card */
          .fs-stack section.py-16 .text-3xl.lg\\:text-5xl { font-size: 1.85rem; line-height: 1.15; }
        }

        /* Tablets — softer mobile, still scaled */
        @media (min-width: 641px) and (max-width: 1023px) {
          [data-testid="fs-class-moments"] .grid-cols-6 { height: 480px !important; }
        }
      `}</style>
    </div>
  );
};

export default FutureSkillsLandingPage;
