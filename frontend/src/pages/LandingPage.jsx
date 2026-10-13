import { useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { GraduationCap, Users, Building2, ArrowRight, PlayCircle, Play, Star, Quote as QuoteIcon, Video, Sparkles, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import WordPressBlogsSection from '../components/WordPressBlogsSection';
import { STI, STI_BG, STI_LOGO, STI_YF_LOGO, STI_CONTACT, STI_DISPLAY_FONT } from '../components/sharkTankTheme';
import { useUserAuth } from '../context/UserAuthContext';

// ── Shared assets from Robotics Beginner (theme parity) ────────────────────
const KBC_IMG        = 'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG = 'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';
const PARTNER_LOGOS  = Array.from({ length: 46 }, (_, i) => `/school-logos/${i + 1}.png`);
const SCHOOL_VIDEOS = [
  { name: 'Parle Tilak Vidyalay',            id: 'xHhMLBzB_GU' },
  { name: 'Maneckji Cooper Education Trust', id: 'vOik-WmE_n8' },
  { name: 'Hiranandani Foundation School',   id: 'OnK6oevnLeM' },
  { name: 'TayieBiyah High School',          id: 'dWo2wr02mq4' },
  { name: 'Greenlawns High School',          id: 'YoIu5akBkr0' },
  { name: 'Shree Chandulal Nanavati High',   id: 'r6xeqlTixYE' },
  { name: 'GD Somani School',                id: '5c2gZORdUxc' },
  { name: 'St. Agnes School',                id: 'I0uZ8aIIkwU' },
  { name: 'Sanjeevani World School',         id: 'YeyKFirPot4' },
  { name: 'Dosti Foundation School',         id: 'sqXE6tsUQ6g' },
];
const PARENT_QUOTES = [
  'My child couldn\u2019t stop talking about what they built.',
  'It\u2019s amazing to see them actually create something.',
  'Every week she comes home with a new project — and a bigger smile.',
];

// ── Parent & student testimonials (video card grid) ────────────────────────
const TESTIMONIALS = [
  {
    role: 'parent', label: 'PARENT', name: 'OLL Parents',
    quote: '"Our kids come home buzzing about what they built."',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/39v27qp3_Testimonial%20Parents.mp4',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Builder · Grade 5',
    quote: '"I made a robot that follows a line!"',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/yl1ydmda_IMG_7029.MOV',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Coder · Grade 7',
    quote: '"I wrote my first Python game in class."',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/4boxtvd2_IMG_7035.MOV',
    thumbYT: null,
  },
  {
    role: 'student', label: 'STUDENT', name: 'Young Creator · Grade 9',
    quote: '"3D-printed my own phone stand this week!"',
    video: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/vo8r3dzk_IMG_7045.MOV',
    thumbYT: null,
  },
];

const WRITTEN_QUOTES = [
  { quote: 'My son went from gaming all weekend to spending Saturdays designing his own game. The shift in 3 months has been unreal.', name: 'Anita S.', context: 'Grade 5 parent' },
  { quote: 'He builds robots at home now with parts he saves up for. The class lit a fire we didn\u2019t know was there.', name: 'Rajesh M.', context: 'Grade 8 parent' },
  { quote: 'Best investment beyond her academics. She actually looks forward to Saturdays.', name: 'Priya K.', context: 'Grade 3 parent' },
];

// Classroom media — real photos & videos from OLL classrooms (mirrors Future Skills page)
const CLASSROOM_MEDIA = [
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/5h69is60_20260504_122331.mp4', label: 'Hands-on build', caption: 'Kids assembling their first IoT & AI lab kit' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/h11kmu1i_20260504_122503.jpg', label: 'Live class', caption: 'Working through a circuit module step by step' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/gwljm6r9_20260504_122607.jpg', label: 'Build station', caption: 'Pair-builds with the OLL IoT & AI Lab Kit' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/04pgqymv_20260504_123958.mp4', label: 'In action', caption: 'Real class footage — what a session feels like' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/tqatbciw_20260504_124243.jpg', label: 'Manipulative station', caption: 'Kids exploring components together' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/9p89o2y6_20260504_154936.mp4', label: 'Class showcase', caption: 'Students presenting what they built today' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/rhwyg94z_20260504_163950.jpg', label: 'Batch of builders', caption: 'End-of-class group photo — the whole crew' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/geb6vgey_VID20260504135039.mp4', label: 'Build moment', caption: 'Mid-class hands-on — heads-down focus' },
  { type: 'image', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/ctig02to_IMG-20260504-WA0020.jpg', label: 'Educator-led', caption: 'Trainers walking kids through their first build' },
  { type: 'video', src: 'https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/e7dknsgn_VID20260504155236.mp4', label: 'In progress', caption: 'Kids deep in their build — a real session glimpse' },
];

// Media house logos — infinite scroll ticker under the Shark Tank / KBC cards
const MEDIA_LOGOS = [
  { src: '/media-logos/yourstory.svg',       alt: 'YourStory' },
  { src: '/media-logos/sony-tv.svg',         alt: 'Sony Entertainment TV' },
  { src: '/media-logos/hindustan-times.svg', alt: 'Hindustan Times' },
  { src: '/media-logos/times-of-india.svg',  alt: 'The Times of India' },
  { src: '/media-logos/cnbc-tv18.svg',       alt: 'CNBC TV18' },
  { src: '/media-logos/indian-express.svg',  alt: 'The Indian Express' },
  { src: '/media-logos/business-insider.svg', alt: 'Business Insider' },
  { src: '/media-logos/pinkvilla.svg',       alt: 'Pinkvilla' },
];

// Shark Tank & KBC YouTube targets (sourced from the About page)
const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT        = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

const LandingPage = () => {
  const navigate = useNavigate();
  const { isLoggedIn, user } = useUserAuth();
  const [mediaOpen, setMediaOpen] = useState(null); // { type, src, label, caption }
  const [moreOpen, setMoreOpen] = useState(false);  // Techfest "View more" toggle (mobile only)

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Close lightbox on Escape
  useEffect(() => {
    if (!mediaOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setMediaOpen(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mediaOpen]);

  // ── SEO: imperative <head> injection (react-helmet-async unreliable here) ─
  useEffect(() => {
    const CANONICAL = 'https://oll.co/';
    const TITLE = 'OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship Classes';
    const DESC = "OLL offers Robotics, AI, Coding, Entrepreneurship & Financial Literacy skill classes for students of all ages. Lab setups & programs for ICSE, CBSE, State Board schools. Book a free demo today!";
    const KEYWORDS = "OLL, OLL India, robotics classes, AI classes, coding for kids, entrepreneurship classes, financial literacy, STEM education, robotics lab setup, ICSE robotics, CBSE robotics, skill education India, future skills, coding classes near me";
    const OG_IMG = 'https://static.prod-images.emergentagent.com/jobs/4048d873-d260-47ab-be01-5efb2f8a71c2/images/3484c900f20debbcd95f333ebd0b59a212adcaeebd3c2db1919581020c07de0c.png';
    document.title = TITLE;
    const upsertMeta = (key, value, attr = 'name') => {
      let el = document.head.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement('meta'); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute('content', value);
    };
    upsertMeta('description', DESC);
    upsertMeta('keywords', KEYWORDS);
    upsertMeta('robots', 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1');
    upsertMeta('theme-color', '#0A1F44');
    upsertMeta('og:type', 'website', 'property');
    upsertMeta('og:url', CANONICAL, 'property');
    upsertMeta('og:title', 'OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship', 'property');
    upsertMeta('og:description', 'Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Expert educators, flexible timings. Book a free demo!', 'property');
    upsertMeta('og:image', OG_IMG, 'property');
    upsertMeta('og:image:width', '1200', 'property');
    upsertMeta('og:image:height', '630', 'property');
    upsertMeta('og:site_name', 'OLL', 'property');
    upsertMeta('og:locale', 'en_IN', 'property');
    upsertMeta('twitter:card', 'summary_large_image');
    upsertMeta('twitter:url', CANONICAL);
    upsertMeta('twitter:title', 'OLL - Learn Future Skills | Robotics, AI, Coding & Entrepreneurship');
    upsertMeta('twitter:description', 'Transform your future with OLL. Learn Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Book a free demo!');
    upsertMeta('twitter:image', OG_IMG);
    let canon = document.head.querySelector('link[rel="canonical"]');
    if (!canon) { canon = document.createElement('link'); canon.rel = 'canonical'; document.head.appendChild(canon); }
    canon.href = CANONICAL;
    // Preconnects
    const preconnects = ['https://customer-assets.emergentagent.com', 'https://i.ytimg.com', 'https://fonts.googleapis.com'];
    preconnects.forEach((href) => {
      if (!document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) {
        const l = document.createElement('link'); l.rel = 'preconnect'; l.href = href; l.crossOrigin = 'anonymous'; document.head.appendChild(l);
      }
    });
    // JSON-LD schemas (Organization + WebSite already in index.html; only add page-specific ones)
    const schemas = [
      {
        "@context": "https://schema.org", "@type": "BreadcrumbList",
        "itemListElement": [{ "@type": "ListItem", "position": 1, "name": "Home", "item": "https://oll.co/" }]
      },
      {
        "@context": "https://schema.org", "@type": "ItemList", "name": "OLL Skill Courses",
        "itemListElement": [
          {"@type": "Course", "position": 1, "name": "Robotics for Kids", "description": "Build robots and learn electronics, mechanics & programming", "provider": {"@type": "Organization", "name": "OLL"}},
          {"@type": "Course", "position": 2, "name": "AI & Machine Learning", "description": "Learn artificial intelligence concepts and build AI projects", "provider": {"@type": "Organization", "name": "OLL"}},
          {"@type": "Course", "position": 3, "name": "Coding & Programming", "description": "Learn coding from scratch - Python, Scratch, JavaScript", "provider": {"@type": "Organization", "name": "OLL"}},
          {"@type": "Course", "position": 4, "name": "Entrepreneurship", "description": "Business thinking, innovation and startup fundamentals", "provider": {"@type": "Organization", "name": "OLL"}},
          {"@type": "Course", "position": 5, "name": "Financial Literacy", "description": "Money management, investing basics and financial planning", "provider": {"@type": "Organization", "name": "OLL"}}
        ]
      },
      {
        "@context": "https://schema.org", "@type": "VideoObject",
        "name": "OLL on Shark Tank India (Season 2)",
        "description": "OLL founder Shreyaan Daga pitches OLL to India's top investors on Shark Tank India S2, becoming one of the youngest founders to raise funding on national TV.",
        "thumbnailUrl": "https://i.ytimg.com/vi/aVzl6yzPPTw/maxresdefault.jpg",
        "uploadDate": "2023-03-01",
        "contentUrl": "https://www.youtube.com/watch?v=aVzl6yzPPTw",
        "embedUrl": "https://www.youtube.com/embed/aVzl6yzPPTw",
        "publisher": { "@type": "Organization", "name": "OLL", "logo": { "@type": "ImageObject", "url": "https://oll.co/favicon.png" } }
      },
      {
        "@context": "https://schema.org", "@type": "VideoObject",
        "name": "OLL on Kaun Banega Crorepati with Amitabh Bachchan",
        "description": "OLL founder Shreyaan Daga featured as one of India's leading young EdTech founders on Kaun Banega Crorepati with Amitabh Bachchan.",
        "thumbnailUrl": "https://i.ytimg.com/vi/8M3A_InpVKw/maxresdefault.jpg",
        "uploadDate": "2025-08-01",
        "contentUrl": "https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s",
        "embedUrl": "https://www.youtube.com/embed/8M3A_InpVKw?start=883",
        "publisher": { "@type": "Organization", "name": "OLL", "logo": { "@type": "ImageObject", "url": "https://oll.co/favicon.png" } }
      },
      {
        "@context": "https://schema.org", "@type": "FAQPage",
        "mainEntity": [
          { "@type": "Question", "name": "What does OLL offer?", "acceptedAnswer": { "@type": "Answer", "text": "OLL offers Robotics, AI, Coding, Entrepreneurship and Financial Literacy programs for kids and schools. We provide student classes and turnkey school lab setups for CBSE, ICSE and State Board schools." } },
          { "@type": "Question", "name": "Which grades does OLL teach?", "acceptedAnswer": { "@type": "Answer", "text": "OLL programs span Grades 1 to 10 with grade-wise curricula from Robotics Beginner (Grade 1-4) through Robotics Advanced (Grade 8-10), plus Computer Science and AI." } },
          { "@type": "Question", "name": "Is OLL accredited?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. OLL is STEM.org accredited and has been featured on Shark Tank India and Kaun Banega Crorepati as one of India's leading EdTech companies for kids." } },
          { "@type": "Question", "name": "How can I book a free demo?", "acceptedAnswer": { "@type": "Answer", "text": "Click Book Free Trial or Book Demo on the homepage — you can book a student demo, a school lab demo, or connect with an OLL centre near you." } },
          { "@type": "Question", "name": "Does OLL have physical centres?", "acceptedAnswer": { "@type": "Answer", "text": "Yes. OLL has centres across India where students attend weekly hands-on Robotics, Coding & AI classes. Use the Centres link in the nav to find the nearest one." } }
        ]
      }
    ];
    const addedIds = [];
    schemas.forEach((obj, i) => {
      const id = `home-jsonld-${i}`;
      let el = document.getElementById(id);
      if (!el) { el = document.createElement('script'); el.type = 'application/ld+json'; el.id = id; document.head.appendChild(el); }
      el.textContent = JSON.stringify(obj);
      addedIds.push(id);
    });
    return () => { addedIds.forEach((id) => { const el = document.getElementById(id); if (el) el.remove(); }); };
  }, []);

  // Redirect logged-in students to their bookings page
  useEffect(() => {
    if (isLoggedIn && user?.user_type === 'student') {
      navigate('/my-bookings');
    }
  }, [isLoggedIn, user, navigate]);

  const handleSchoolClick = () => {
    navigate('/for-schools');
  };

  const userTypes = [
    {
      id: 'student',
      title: 'Learner',
      subtitle: 'Learn Future-Ready Skills',
      description: 'Robotics, Coding, AI & more',
      icon: GraduationCap,
      path: '/student',
      gradient: 'from-[#1E3A5F] to-[#2C5282]',
      onClick: () => navigate('/student')
    },
    {
      id: 'educator',
      title: 'Educator',
      subtitle: 'Join Our Network',
      description: 'Teach & grow with OLL',
      icon: Users,
      path: '/educator',
      gradient: 'from-[#D63031] to-[#e84142]',
      onClick: () => navigate('/educator')
    },
    {
      id: 'school',
      title: 'School',
      subtitle: 'Partner With Us',
      description: 'Complete skill programs',
      icon: Building2,
      path: '/school',
      gradient: 'from-[#1E3A5F] to-[#D63031]',
      onClick: handleSchoolClick
    }
  ];

  return (
    <>
      
    <div className="min-h-screen bg-white flex flex-col">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Montserrat:wght@300;400;500;600;700;800&family=Anton&display=swap');
        @font-face {
          font-family: 'Zing Rust';
          src: url('https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/kfh1elso_zing.rust-demo-base.otf') format('opentype');
          font-weight: 400 900;
          font-display: swap;
        }
        .home-hero-h1 { font-family: 'Zing Rust', 'Anton', sans-serif; font-weight: 400; font-size: clamp(2.6rem, 6vw, 5rem); line-height: 1; letter-spacing: -0.01em; color: #0A1F44; }
        .home-h2 { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: clamp(2rem, 4.4vw, 3rem); line-height: 1.1; color: #0A1F44; margin-top: 0.4rem; letter-spacing: -0.005em; }
        .home-h2 strong { font-weight: 700; }
        .home-sub { font-family: 'Montserrat', sans-serif; font-weight: 300; font-size: 1rem; max-width: 640px; margin: 0.9rem auto 0; color: #475569; line-height: 1.6; }
        .home-script-heading { font-family: 'Caveat', 'Playfair Display', cursive; font-size: clamp(2rem, 4.4vw, 3rem); color: #DC2626; line-height: 1; font-weight: 700; }
        .home-eyebrow { font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 0.72rem; letter-spacing: 0.24em; text-transform: uppercase; color: #DC2626; }
        /* Media card caption/pill responsive tweaks */
        .home-media-caption { position: absolute; bottom: 20px; left: 22px; right: 22px; padding-right: 118px; }
        .home-media-caption .home-media-title { font-size: 1.5rem; }
        .home-media-caption .home-media-sub { font-size: 0.85rem; }
        @media (max-width: 640px) {
          .home-media-caption { left: 16px; right: 16px; bottom: 14px; padding-right: 100px; }
          .home-media-caption .home-media-title { font-size: 1.15rem; }
          .home-media-caption .home-media-sub { font-size: 0.75rem; }
          .home-watch-pill { bottom: 14px !important; right: 14px !important; padding: 7px 12px !important; font-size: 0.68rem !important; letter-spacing: 0.14em !important; }
        }
      `}</style>
      <Navbar variant="pill" />

      {/* Main Content - Desktop: Centered with max height cards */}
      <main className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12">
        {/* Tagline */}
        <div className="text-center mb-6 md:mb-10">
          <h1 className="home-hero-h1" style={{ color: '#1E3A5F' }}>
            Learn Future Skills for a Brighter Future
          </h1>
          <p className="text-base md:text-lg text-slate-500 mt-2">
            Robotics • AI • Coding • Entrepreneurship • Financial Literacy
          </p>
        </div>

        {/* User Type Cards - Tall cards on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-6xl mx-auto w-full px-4">
          {userTypes.map((type) => (
            <div
              key={type.id}
              onClick={type.onClick}
              className={`relative rounded-2xl md:rounded-3xl bg-gradient-to-br ${type.gradient} p-6 md:p-8 flex flex-col cursor-pointer hover:scale-[1.02] transition-all duration-300 shadow-lg hover:shadow-xl min-h-[180px] md:min-h-[400px]`}
              data-testid={`${type.id}-card`}
            >
              {/* Icon */}
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4">
                <type.icon className="w-6 h-6 md:w-8 md:h-8 text-white" />
              </div>
              
              {/* Content - pushed to bottom on desktop */}
              <div className="md:mt-auto">
                <p className="text-white/70 text-xs md:text-sm font-medium">{type.subtitle}</p>
                <h2 className="text-xl md:text-3xl lg:text-4xl font-bold text-white mt-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                  {type.title}
                </h2>
                <p className="text-white/60 text-sm md:text-base mt-2">{type.description}</p>
              </div>
              
              {/* Arrow positioned at bottom right */}
              <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center">
                <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Summer Camp section — HIDDEN (2026 camps closed; broadcast list flow only) */}
      {false && (
      <section style={{
        background: 'linear-gradient(to bottom, #ffffff 0%, #edf2f8 18%, #c2d4e8 38%, #4a7aaa 55%, #1e3a5f 72%, #0f172a 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '4rem',
        paddingBottom: 0,
      }}>

        {/* Above-card header (light background area) */}
        <div style={{ textAlign: 'center', paddingBottom: '2.5rem', paddingLeft: '1rem', paddingRight: '1rem' }}>
          <p style={{
            fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase',
            color: '#D63031', marginBottom: '0.75rem', fontFamily: 'Nunito Sans, sans-serif',
          }}>
            Exclusive · Limited Seats
          </p>
          <h2 style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 'clamp(2rem, 5vw, 3.25rem)',
            fontWeight: 900,
            color: '#0F172A',
            lineHeight: 1.15,
            marginBottom: '0.75rem',
          }}>
            Summer Camps 2026
          </h2>
          <p style={{ color: '#64748B', fontSize: '1rem', maxWidth: 480, margin: '0 auto', lineHeight: 1.6, fontFamily: 'Nunito Sans, sans-serif' }}>
            Intensive 2-week camps where kids build real tech projects with expert mentors
          </p>
        </div>

        {/* Standout dark card */}
        <div style={{ maxWidth: 1000, margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', paddingBottom: '5rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, #0B1628 0%, #0f2040 50%, #0B1628 100%)',
            borderRadius: '1.5rem',
            border: '1px solid rgba(0,229,255,0.15)',
            boxShadow: '0 40px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
            position: 'relative',
            overflow: 'hidden',
            padding: '2.5rem',
          }}>
            {/* Circuit overlay */}
            <div style={{ position: 'absolute', inset: 0, opacity: 0.1, pointerEvents: 'none' }}>
              <svg width="100%" height="100%">
                <defs>
                  <pattern id="circuit-card" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M60 0L0 0 0 60" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                    <circle cx="0" cy="0" r="2" fill="#00E5FF" />
                    <path d="M30 0L30 20 M30 40L30 60 M0 30L20 30 M40 30L60 30" fill="none" stroke="#00E5FF" strokeWidth="0.5" />
                    <circle cx="30" cy="30" r="3" fill="none" stroke="#00E5FF" strokeWidth="0.8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#circuit-card)" />
              </svg>
            </div>
            {/* Red glow */}
            <div style={{ position: 'absolute', top: '-60px', right: '8%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div className="grid md:grid-cols-[1fr_280px] gap-8" style={{ position: 'relative' }}>
              {/* Left: content */}
              <div>
                {/* Badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.25rem' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 12px', borderRadius: '999px', background: 'rgba(214,48,49,0.25)', border: '1px solid #D63031', color: '#FF6B6B', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#D63031', display: 'inline-block' }} />
                    Limited Spots
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 12px', borderRadius: '999px', background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.35)', color: '#00E5FF', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                    May 2026
                  </span>
                </div>

                {/* Heading */}
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 'clamp(1.5rem, 3.5vw, 2.25rem)', fontWeight: 900, lineHeight: 1.15, marginBottom: '0.75rem' }}>
                  <span style={{ color: '#F8FAFC', display: 'block' }}>Future Skills</span>
                  <span style={{ background: 'linear-gradient(90deg, #00E5FF, #7C3AED)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    Summer Camp 2026
                  </span>
                </h3>

                <p style={{ color: '#94A3B8', fontSize: '0.9rem', lineHeight: 1.65, marginBottom: '1.25rem', maxWidth: 400, fontFamily: 'Nunito Sans, sans-serif' }}>
                  Robotics · Coding · AI · 3D Design — 10 days of hands-on learning for ages 4–16. Online or at Mumbai centers.
                </p>

                {/* Feature pills */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: '1.75rem' }}>
                  {['Mumbai Centers', 'Online Option', '10 Kids/Batch', '4 Batch Weeks'].map(text => (
                    <span key={text} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: '#CBD5E1', fontSize: '0.75rem', fontFamily: 'Nunito Sans, sans-serif' }}>
                      {text}
                    </span>
                  ))}
                </div>

                {/* CTA */}
                <button
                  onClick={() => navigate('/summer-camp')}
                  data-testid="homepage-camp-book-btn"
                  style={{
                    background: '#D63031', color: '#fff',
                    fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '0.85rem',
                    padding: '0.85rem 2rem', borderRadius: '999px', border: 'none', cursor: 'pointer',
                    boxShadow: '0 0 28px rgba(214,48,49,0.4)',
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    transition: 'all 0.3s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#FF3366'; e.currentTarget.style.boxShadow = '0 0 40px rgba(255,51,102,0.55)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#D63031'; e.currentTarget.style.boxShadow = '0 0 28px rgba(214,48,49,0.4)'; }}
                >
                  Book Summer Camp
                  <ArrowRight style={{ width: 16, height: 16 }} />
                </button>
              </div>

              {/* Right: age group cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                {[
                  { ages: 'Ages 4–8',   label: 'Little Explorers',  color: '#00E5FF', icon: '🌱' },
                  { ages: 'Ages 9–12',  label: 'Tech Creators',     color: '#D63031', icon: '⚡' },
                  { ages: 'Ages 13–16', label: 'Future Innovators', color: '#7C3AED', icon: '🚀' },
                ].map(g => (
                  <div key={g.ages}
                    onClick={() => navigate('/summer-camp')}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.09)'; e.currentTarget.style.borderColor = g.color + '55'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '0.65rem', padding: '0.65rem 0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
                  >
                    <span style={{ fontSize: '1.15rem', lineHeight: 1, flexShrink: 0 }}>{g.icon}</span>
                    <div>
                      <div style={{ color: g.color, fontSize: '0.78rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2, whiteSpace: 'nowrap' }}>{g.ages}</div>
                      <div style={{ color: '#64748B', fontSize: '0.7rem', fontFamily: "'Nunito Sans', sans-serif", marginTop: '0.1rem' }}>{g.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* ── AS SEEN ON — Shark Tank India + KBC (Robotics Beginner theme) ── */}
      <section data-testid="homepage-as-seen-on" style={{
        position: 'relative', overflow: 'hidden',
        padding: '5rem 1.25rem',
        background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)',
        color: '#fff',
      }}>
        <div style={{ position: 'absolute', top: -140, left: '10%', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(220,38,38,0.28) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -140, right: '10%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.22) 0%, transparent 65%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="home-script-heading" style={{ color: '#FCA5A5' }}>
              our story
            </div>
            <h2 className="home-h2" style={{ color: '#FFFFFF' }}>
              From School Student to <span style={{ color: '#FCA5A5' }}>National Fame.</span>
            </h2>
            <p className="home-sub" style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(1.05rem, 1.55vw, 1.35rem)', lineHeight: 1.65, maxWidth: 880 }}>
              Shreyaan Daga started OLL in 2020 at just 15, while in 10th grade. By 18, he became one of India&apos;s youngest founders to raise funding on <strong style={{ color: '#FCA5A5', fontWeight: 700 }}>Shark Tank India S2</strong> and by 20, he was featured on <strong style={{ color: '#FCA5A5', fontWeight: 700 }}>Kaun Banega Crorepati</strong> with Amitabh Bachchan.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
            <a
              href={KBC_YT}
              target="_blank"
              rel="noreferrer"
              data-testid="homepage-media-kbc"
              style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 300, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 30px 60px rgba(0,0,0,0.35)', textDecoration: 'none', display: 'block', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 40px 70px rgba(0,0,0,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.35)'; }}
            >
              <img src={KBC_IMG} alt="Kaun Banega Crorepati" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.94) 100%)' }} />
              {/* Watch pill (top-right) — STEM.ORG-style badge */}
              <div className="home-watch-pill" data-testid="homepage-kbc-watch-pill" style={{ position: 'absolute', bottom: 20, right: 20, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.55)' }}>
                <Play size={13} fill="#fff" strokeWidth={0} /> Watch
              </div>
              <div className="home-media-caption">
                <div style={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Proxima Nova', sans-serif" }}>Sony · KBC</div>
                <div className="home-media-title" style={{ color: '#fff', fontWeight: 700, marginTop: 4, fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>Kaun Banega Crorepati</div>
                <div className="home-media-sub" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Featured as India&apos;s leading EdTech for kids</div>
              </div>
            </a>

            <a
              href={SHARK_TANK_YT}
              target="_blank"
              rel="noreferrer"
              data-testid="homepage-media-shark-tank"
              style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 300, border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 30px 60px rgba(0,0,0,0.35)', textDecoration: 'none', display: 'block', transition: 'transform 0.3s ease, box-shadow 0.3s ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 40px 70px rgba(0,0,0,0.45)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.35)'; }}
            >
              <img src={SHARK_TANK_IMG} alt="Shark Tank India" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.94) 100%)' }} />
              {/* Watch pill (top-right) — STEM.ORG-style badge */}
              <div className="home-watch-pill" data-testid="homepage-shark-tank-watch-pill" style={{ position: 'absolute', bottom: 20, right: 20, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.55)' }}>
                <Play size={13} fill="#fff" strokeWidth={0} /> Watch
              </div>
              <div className="home-media-caption">
                <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', fontFamily: "'Proxima Nova', sans-serif" }}>Sony LIV · Season Finale</div>
                <div className="home-media-title" style={{ color: '#fff', fontWeight: 700, marginTop: 4, fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>Shark Tank India</div>
                <div className="home-media-sub" style={{ color: 'rgba(255,255,255,0.85)', marginTop: 4 }}>Pitched to India&apos;s top investors on national TV</div>
              </div>
            </a>
          </div>

          {/* ── Media houses infinite scroll ticker ────────────────────── */}
          <div data-testid="homepage-media-logos" style={{ marginTop: '2.75rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <span style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(252,165,165,0.85)' }}>
                // Also covered by
              </span>
            </div>
            <style>{`
              @keyframes home-logo-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
              .home-logos-wrap { position: relative; overflow: hidden; padding: 8px 0; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
              .home-logos-track { display: inline-flex; gap: 3.25rem; padding: 0 1.5rem; align-items: center; animation: home-logo-scroll 38s linear infinite; will-change: transform; width: max-content; }
              .home-logos-track:hover { animation-play-state: paused; }
              .home-logo-item { flex-shrink: 0; height: 44px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.88; filter: brightness(0) invert(1); transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease; }
              .home-logo-item img { max-height: 44px; max-width: 170px; height: auto; width: auto; display: block; object-fit: contain; }
              .home-logo-item:hover { opacity: 1; filter: none; transform: scale(1.06); }
            `}</style>
            <div className="home-logos-wrap">
              <div className="home-logos-track">
                {[...MEDIA_LOGOS, ...MEDIA_LOGOS].map((l, i) => (
                  <div key={`${l.alt}-${i}`} className="home-logo-item" data-testid={i < MEDIA_LOGOS.length ? `homepage-media-logo-${i}` : undefined}>
                    <img src={l.src} alt={l.alt} loading="lazy" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ── SCHOOL PRODUCTS ────────────────────────────
          Two flagship product families sold to schools — Robotics + Computer
          Science curricula. Each tier click routes to a dedicated demo-booking
          landing page. */}
      <section data-testid="homepage-school-products" style={{
        background: 'linear-gradient(180deg, #F4F7FE 0%, #FFFFFF 55%, #FFF7EC 100%)',
        position: 'relative', overflow: 'hidden',
        paddingTop: '5rem', paddingBottom: '5rem',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <div className="home-script-heading">for schools</div>
            <h2 className="home-h2">School Products</h2>
            <p className="home-sub">
              End-to-end Robotics &amp; Computer Science curricula for K–12 schools. Book a live demo with our program expert to see the lab, syllabus and outcomes.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
            {/* ROBOTICS card family */}
            <div style={{ background: '#fff', borderRadius: '1.5rem', border: '2px solid #E2E8F0', padding: '1.75rem', boxShadow: '0 12px 40px rgba(15,30,80,0.08)' }} data-testid="school-products-robotics">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🤖</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#D63031', fontFamily: "'JetBrains Mono', monospace" }}>Product Family</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F1E33', fontFamily: "'JetBrains Mono', monospace" }}>Robotics</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'Pre-School',                           route: '/school/robotics/pre-school',   sub: 'Play + explore · Ages 3–5' },
                  { label: 'Robotics & AI Program for Schools',    route: '/school/robotics-ai-lab-for-schools-turnkey-solution/', sub: 'Grade 1–8 · Turnkey Robotics & AI Lab', highlight: true },
                  { label: 'ICSE — Group 3 Subject (9th & 10th)',  route: '/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th',      sub: 'Board-mapped elective' },
                ].map(t => (
                  <button key={t.label}
                    onClick={() => navigate(t.route)}
                    data-testid={`school-robotics-${t.label.split(' ')[0].toLowerCase()}`}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: t.highlight ? 'linear-gradient(90deg, #D63031, #1E3A5F)' : '#F8FAFC',
                      color: t.highlight ? '#fff' : '#0F1E33',
                      border: t.highlight ? 'none' : '1px solid #E2E8F0',
                      padding: '0.85rem 1.1rem', borderRadius: '0.75rem', cursor: 'pointer',
                      fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem',
                      textAlign: 'left', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <span>
                      {t.label}
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, opacity: 0.75, marginTop: '0.15rem' }}>{t.sub}</span>
                    </span>
                    <span style={{ fontWeight: 900 }}>→</span>
                  </button>
                ))}
              </div>
            </div>

            {/* COMPUTER SCIENCE card family */}
            <div style={{ background: '#fff', borderRadius: '1.5rem', border: '2px solid #E2E8F0', padding: '1.75rem', boxShadow: '0 12px 40px rgba(15,30,80,0.08)' }} data-testid="school-products-cs">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>💻</span>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#1E3A5F', fontFamily: "'JetBrains Mono', monospace" }}>Product Family</div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0F1E33', fontFamily: "'JetBrains Mono', monospace" }}>Computer Science</h3>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[
                  { label: 'ICSE — Future Skills',                 route: '/school/icse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8', sub: '4-in-1 · ICT · Coding · AI · Robotics · Grades 1-8', testid: 'school-cs-icse-future-skills' },
                  { label: 'CBSE — Future Skills',                 route: '/school/cbse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8', sub: '4-in-1 · ICT · Coding · AI · Robotics · Grades 1-8', testid: 'school-cs-cbse-future-skills' },
                  { label: 'CBSE — Computational Thinking & AI',   route: '/school/cs/cbse-ct-ai',         sub: 'CBSE Acad-15/2026 elective · Grades 3-8',            testid: 'school-cs-cbse-ct-ai' },
                ].map(t => (
                  <button key={t.label}
                    onClick={() => navigate(t.route)}
                    data-testid={t.testid}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: '#F8FAFC', color: '#0F1E33', border: '1px solid #E2E8F0',
                      padding: '0.85rem 1.1rem', borderRadius: '0.75rem', cursor: 'pointer',
                      fontFamily: "'Nunito Sans', sans-serif", fontWeight: 700, fontSize: '0.95rem',
                      textAlign: 'left', transition: 'transform 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <span>
                      {t.label}
                      <span style={{ display: 'block', fontSize: '0.72rem', fontWeight: 500, opacity: 0.75, marginTop: '0.15rem' }}>{t.sub}</span>
                    </span>
                    <span style={{ fontWeight: 900 }}>→</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SHARK TANK INDIA YOUNG FOUNDERS SPECIAL — poster-style banner ── */}
      <section data-testid="homepage-sti6-yf" style={{ ...STI_BG, padding: '4.5rem 1.25rem', position: 'relative', overflow: 'hidden' }}>
        <style>{`
          .home-sti-grid { max-width: 1180px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 3rem; align-items: center; position: relative; z-index: 1; }
          .home-sti-logos { display: flex; align-items: center; justify-content: center; gap: 2rem; }
          .home-sti-logos img { display: block; width: auto; filter: drop-shadow(0 18px 30px rgba(0,0,0,0.35)); }
          .home-sti-logos .st { height: 300px; }
          .home-sti-logos .yf { height: 220px; }
          .home-sti-knowmore { display: inline-flex; align-items: center; gap: 8px; padding: 13px 26px; border-radius: 999px; background: transparent; color: ${STI.yellow}; border: 2px solid ${STI.yellow}; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.85rem; text-decoration: none; transition: background-color 0.2s, color 0.2s, transform 0.2s; }
          .home-sti-knowmore:hover { background: ${STI.yellow}; color: ${STI.ink}; transform: translateY(-2px); }
          @media (max-width: 900px) {
            .home-sti-grid { grid-template-columns: 1fr; gap: 2rem; }
            .home-sti-logos .st { height: 200px; }
            .home-sti-logos .yf { height: 150px; }
          }
          @media (max-width: 480px) {
            .home-sti-logos { gap: 1rem; }
            .home-sti-logos .st { height: 160px; }
            .home-sti-logos .yf { height: 112px; }
          }
        `}</style>
        <div className="home-sti-grid">
          <div className="home-sti-logos">
            <img className="st" src={STI_LOGO} alt="Shark Tank India Season 6" loading="lazy" data-testid="homepage-sti6-logo" />
            <img className="yf" src={STI_YF_LOGO} alt="Young Founders Special" loading="lazy" data-testid="homepage-sti6-yf-logo" />
          </div>
          <div style={{ color: '#fff' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, border: '1px solid rgba(255,225,77,0.55)', color: STI.yellow, fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: STI.yellow, animation: 'pulse 2s infinite' }} /> Registrations Open
            </div>
            <h2 data-testid="homepage-sti6-title" style={{ fontFamily: STI_DISPLAY_FONT, fontWeight: 400, textTransform: 'uppercase', fontSize: 'clamp(2rem, 4.4vw, 3.4rem)', lineHeight: 1.02, margin: '1rem 0 0', letterSpacing: '0.01em' }}>
              Shark Tank India Season 6 <span style={{ color: STI.yellow }}>Young Founders Special</span>
            </h2>
            <h3 style={{ marginTop: '1.25rem', fontSize: '1.15rem', fontWeight: 800, color: STI.yellow }}>An Exciting Opportunity for Our School&apos;s Students</h3>
            <p style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, fontSize: '0.98rem' }}>
              Young founders with innovative business ideas or existing ventures now have an opportunity to apply for a chance to present their business ideas on national television through this special initiative.
            </p>
            <p style={{ marginTop: '0.75rem', color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, fontSize: '0.98rem' }}>
              Students who dream of building something of their own, have already started a venture, or are actively turning their ideas into reality are encouraged to explore this opportunity.
            </p>
            <p data-testid="homepage-sti6-contact" style={{ marginTop: '1rem', fontSize: '0.92rem', fontWeight: 700, color: '#fff' }}>
              For queries: <a href={`tel:+91${STI_CONTACT.phone}`} style={{ color: STI.yellow, textDecoration: 'none' }}>{STI_CONTACT.phone}</a> | <a href={`mailto:${STI_CONTACT.email}`} style={{ color: STI.yellow, textDecoration: 'none' }}>{STI_CONTACT.email}</a>
            </p>
            <Link to="/shark-tank-young-founders" className="home-sti-knowmore" data-testid="homepage-sti6-know-more" style={{ marginTop: '1.5rem' }}>
              Know More <ArrowRight className="w-4 h-4" />
            </Link>
            <p style={{ marginTop: '1.25rem', fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>
              Information shared by OLL as a community resource. Not affiliated with Sony Pictures / SonyLIV.
            </p>
          </div>
        </div>
      </section>

      {/* ── SCHOOLS WE WORK WITH — auto-scrolling videos + partner logos ── */}
      <section data-testid="homepage-schools-we-work-with" style={{
        position: 'relative', overflow: 'hidden',
        padding: '5rem 1.25rem 3rem',
        background: '#F8FAFC',
      }}>
        <style>{`
          @keyframes home-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
          .home-marquee-wrap { overflow: hidden; padding: 10px 0; }
          .home-marquee-track { display: inline-flex; gap: 1rem; padding: 4px 8px; animation: home-scroll 60s linear infinite; will-change: transform; }
          .home-marquee-track:hover { animation-play-state: paused; }
          .home-vid-card { flex-shrink: 0; width: 300px; background: #0A1F44; border-radius: 1rem; overflow: hidden; text-decoration: none; box-shadow: 0 12px 30px rgba(10,31,68,0.15); transition: transform 0.25s ease, box-shadow 0.25s ease; }
          .home-vid-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(10,31,68,0.25); }
          .home-vid-thumb { position: relative; aspect-ratio: 16/9; background: #0A1F44; }
          .home-vid-thumb img { width: 100%; height: 100%; object-fit: cover; }
          .home-vid-play { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.15); color: #fff; }
          .home-logo-track { animation-duration: 55s; }
        `}</style>

        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="home-script-heading">proof, not promises</div>
            <h2 className="home-h2">
              Schools we <span style={{ WebkitTextStroke: '2px #0A1F44', WebkitTextFillColor: 'transparent', color: 'transparent' }}>work with.</span>
            </h2>
            <p className="home-sub">Real classrooms. Real projects. Real principals telling the story in their own words.</p>
          </div>

          <div className="home-marquee-wrap" data-testid="home-schools-videos">
            <div className="home-marquee-track">
              {[...SCHOOL_VIDEOS, ...SCHOOL_VIDEOS].map((v, i) => (
                <a
                  key={`${v.id}-${i}`}
                  href={`https://youtu.be/${v.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="home-vid-card"
                  data-testid={i < SCHOOL_VIDEOS.length ? `home-video-${v.id}` : undefined}
                >
                  <div className="home-vid-thumb">
                    <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.name} loading="lazy" />
                    <div className="home-vid-play"><PlayCircle size={38} fill="rgba(255,255,255,0.18)" /></div>
                  </div>
                  <div style={{ padding: '0.9rem 1.1rem', color: '#fff', fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}>
                    <div style={{ fontSize: '0.98rem', fontWeight: 600, lineHeight: 1.25 }}>{v.name}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: "'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8' }}>
              A few of our partner schools
            </div>
            <div className="home-marquee-wrap">
              <div className="home-marquee-track home-logo-track" style={{ gap: '2rem', alignItems: 'center' }}>
                {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((src, i) => (
                  <div key={i} style={{ minWidth: 150, height: 90, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', boxShadow: '0 4px 12px rgba(15,30,80,0.05)', flexShrink: 0 }}>
                    <img src={src} alt="Partner school" loading="lazy" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>



      {/* ── Techfest · OLL Robotics Championship @ IIT Bombay 2026 ──── */}
      <section
        data-testid="homepage-techfest"
        style={{
          position: 'relative', overflow: 'hidden',
          padding: '5rem 1.25rem',
          background: 'radial-gradient(ellipse at 20% 0%, rgba(220,38,38,0.20), transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(139,92,246,0.18), transparent 55%), linear-gradient(180deg, #0A1F44 0%, #0f172a 100%)',
          color: '#fff',
        }}
        ref={(el) => {
          if (!el || el.__tfObserved) return;
          el.__tfObserved = true;
          const io = new IntersectionObserver((entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                el.classList.add('tf-curtain-open');
                io.disconnect();
              }
            });
          }, { threshold: 0.15 });
          io.observe(el);
        }}
      >
        <style>{`
          .home-tf-grain { position:absolute; inset:0; background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.35'/></svg>"); opacity:.09; mix-blend-mode:overlay; pointer-events:none; z-index:1; }

          /* ── Curtain (theatre reveal) ─────────────────────────────── */
          [data-testid="homepage-techfest"] .tf-curtain { position:absolute; top:0; bottom:0; width:52%; z-index:30; pointer-events:none; transition:transform 1.4s cubic-bezier(0.77, 0, 0.175, 1); will-change:transform; box-shadow:inset 0 0 120px rgba(0,0,0,0.55); }
          [data-testid="homepage-techfest"] .tf-curtain::before { content:""; position:absolute; inset:0; background: repeating-linear-gradient(90deg, rgba(120,10,10,0.85) 0 22px, rgba(180,20,20,0.85) 22px 44px, rgba(90,5,5,0.85) 44px 66px); }
          [data-testid="homepage-techfest"] .tf-curtain::after { content:""; position:absolute; inset:0; background: linear-gradient(180deg, rgba(255,255,255,0.10), transparent 30%, transparent 80%, rgba(0,0,0,0.45)); }
          [data-testid="homepage-techfest"] .tf-curtain-left  { left:0;  transform:translateX(0); border-right:1px solid rgba(0,0,0,0.35); }
          [data-testid="homepage-techfest"] .tf-curtain-right { right:0; transform:translateX(0); border-left:1px solid rgba(0,0,0,0.35); }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-curtain-left  { transform:translateX(-102%); }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-curtain-right { transform:translateX(102%); }
          [data-testid="homepage-techfest"] .tf-curtain-tie { position:absolute; top:50%; height:70px; width:14px; margin-top:-35px; background:radial-gradient(ellipse at center, #fbbf24, #b45309); border-radius:999px; box-shadow:0 6px 14px rgba(0,0,0,0.4); z-index:31; opacity:0; transition:opacity 0.6s ease 1s; }
          [data-testid="homepage-techfest"] .tf-curtain-tie-left  { left:calc(52% - 24px); }
          [data-testid="homepage-techfest"] .tf-curtain-tie-right { right:calc(52% - 24px); }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-curtain-tie { opacity:0; }
          @media (prefers-reduced-motion: reduce) {
            [data-testid="homepage-techfest"] .tf-curtain-left,
            [data-testid="homepage-techfest"] .tf-curtain-right { transform:translateX(-105%); }
            [data-testid="homepage-techfest"] .tf-curtain-right { transform:translateX(105%); }
          }

          /* ── Content reveals staggered after curtains open ─────────── */
          [data-testid="homepage-techfest"] .tf-reveal { opacity:0; transform:translateY(24px); transition:opacity 0.8s ease-out, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1); }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal { opacity:1; transform:translateY(0); }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-1 { transition-delay:0.7s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-2 { transition-delay:0.85s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-3 { transition-delay:1.0s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-4 { transition-delay:1.15s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-5 { transition-delay:1.3s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-6 { transition-delay:1.45s; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-reveal-7 { transition-delay:1.6s; }

          /* ── Spotlight sweep (subtle competition energy) ──────────── */
          [data-testid="homepage-techfest"] .tf-spot { position:absolute; top:-15%; left:50%; width:80%; height:130%; transform:translateX(-50%) rotate(6deg); background:radial-gradient(ellipse at center, rgba(255,220,150,0.10), transparent 60%); pointer-events:none; z-index:2; opacity:0; }
          [data-testid="homepage-techfest"].tf-curtain-open .tf-spot { animation: tf-spot-sweep 4s ease-in-out 1.4s infinite alternate; }
          @keyframes tf-spot-sweep {
            0%   { transform:translateX(-70%) rotate(6deg); opacity:0.25; }
            100% { transform:translateX(-30%) rotate(6deg); opacity:0.55; }
          }

          /* ── Logo lockup — two real logos side by side with divider ── */
          .home-tf-lockup { display:inline-flex; align-items:center; gap:1.15rem; padding:0.7rem 1.25rem 0.7rem 1rem; background:rgba(255,255,255,0.97); border-radius:18px; box-shadow:0 20px 45px rgba(0,0,0,0.28); border:1px solid rgba(255,255,255,0.45); }
          .home-tf-lockup .lockup-oll { height:38px; width:auto; display:block; }
          .home-tf-lockup .lockup-techfest { height:44px; width:auto; display:block; }
          .home-tf-lockup .lockup-divider { width:1.5px; height:32px; background:linear-gradient(180deg, transparent, rgba(15,23,42,0.25), transparent); }
          @media (max-width: 640px) {
            .home-tf-lockup { padding:0.55rem 0.9rem 0.55rem 0.75rem; gap:0.85rem; border-radius:14px; }
            .home-tf-lockup .lockup-oll { height:28px; }
            .home-tf-lockup .lockup-techfest { height:34px; }
            .home-tf-lockup .lockup-divider { height:24px; }
          }

          .home-tf-eyebrow { font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:900; letter-spacing:0.28em; text-transform:uppercase; color:#FCA5A5; }
          /* H2 · Proxima Nova Light (per user brief) */
          .home-tf-h2 { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:300; font-size:clamp(2rem, 4.6vw, 3.5rem); line-height:1.06; letter-spacing:-0.015em; color:#fff; }
          .home-tf-h2 em { font-family:'Caveat', cursive; font-style:normal; font-weight:700; color:#FCA5A5; }
          .home-tf-h2 strong { font-weight:700; }
          /* Single-line variant used at the top of the home Techfest section */
          .home-tf-topcenter { text-align:center; display:flex; flex-direction:column; align-items:center; gap:1.15rem; margin-bottom:2rem; }
          .home-tf-h2-single { text-align:center; font-size:clamp(1.75rem, 3.6vw, 2.75rem); line-height:1.15; white-space:nowrap; max-width:100%; }
          @media (max-width: 900px) {
            .home-tf-h2-single { white-space:normal; }
          }
          .home-tf-columns { align-items:start; }
          .home-tf-body { font-family:'Proxima Nova','Montserrat',sans-serif; font-weight:300; font-size:0.94rem; line-height:1.6; color:rgba(226,232,240,0.9); }

          /* Mobile description clamp + View more toggle */
          @media (max-width: 767px) {
            .home-tf-body { font-size:0.88rem; }
            .home-tf-body-clamped { display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden; }
          }
          .home-tf-more-btn { display:none; }
          @media (max-width: 767px) {
            .home-tf-more-btn { display:inline-flex; align-items:center; gap:0.3rem; margin-top:0.5rem; padding:0; background:transparent; border:0; color:#FCA5A5; font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; cursor:pointer; }
          }
          .home-tf-play-wrap { position:relative; display:block; width:100%; border-radius:1.5rem; overflow:hidden; aspect-ratio:16/9; border:2px solid rgba(255,255,255,0.10); box-shadow:0 30px 60px rgba(0,0,0,0.5); background:#0A1F44; padding:0; cursor:pointer; }
          .home-tf-poster-video { position:absolute; inset:0; width:100%; height:100%; object-fit:cover; opacity:0.55; pointer-events:none; }
          .home-tf-play-overlay { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:linear-gradient(180deg, rgba(10,31,68,0.25), rgba(10,31,68,0.65)); color:#fff; transition:background 0.35s ease; }
          .home-tf-play-wrap:hover .home-tf-play-overlay { background:linear-gradient(180deg, rgba(10,31,68,0.15), rgba(220,38,38,0.35)); }
          .home-tf-play-glyph { width:82px; height:82px; border-radius:999px; background:#DC2626; display:inline-flex; align-items:center; justify-content:center; box-shadow:0 20px 40px rgba(220,38,38,0.55), 0 0 0 8px rgba(255,255,255,0.06); transition:transform 0.25s ease; animation:tf-pulse 2.4s ease-in-out infinite; }
          .home-tf-play-wrap:hover .home-tf-play-glyph { transform:scale(1.07); }
          @keyframes tf-pulse { 0%,100%{ box-shadow:0 20px 40px rgba(220,38,38,0.55), 0 0 0 8px rgba(255,255,255,0.06);} 50%{ box-shadow:0 20px 40px rgba(220,38,38,0.55), 0 0 0 14px rgba(255,255,255,0.02);} }
          .home-tf-play-caption { position:absolute; left:0; right:0; bottom:0; padding:1rem 1.2rem; background:linear-gradient(180deg, transparent, rgba(0,0,0,0.65)); font-family:'Proxima Nova','Montserrat',sans-serif; font-size:0.82rem; font-weight:700; letter-spacing:0.06em; }
          .home-tf-comp-grid { display:grid; grid-template-columns:1fr; gap:0.9rem; margin-top:1.75rem; }
          @media (min-width: 640px) { .home-tf-comp-grid { grid-template-columns:repeat(3, minmax(0,1fr)); gap:0.75rem; } }
          .home-tf-comp-card { position:relative; padding:1rem 1.1rem; border-radius:1rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.10); backdrop-filter:blur(12px); transition:transform 0.25s ease, background 0.25s ease, border 0.25s ease; }
          .home-tf-comp-card:hover { transform:translateY(-3px); background:rgba(255,255,255,0.07); border-color:rgba(220,38,38,0.45); }
          .home-tf-comp-tag { font-family:'Montserrat',sans-serif; font-size:0.62rem; font-weight:900; letter-spacing:0.22em; text-transform:uppercase; color:#FCA5A5; }
          .home-tf-comp-title { font-family:'Proxima Nova','Montserrat',sans-serif; font-size:1.05rem; font-weight:800; color:#fff; margin-top:0.35rem; line-height:1.15; }
          .home-tf-comp-sub { font-family:'Proxima Nova','Montserrat',sans-serif; font-size:0.82rem; font-weight:300; color:rgba(226,232,240,0.75); margin-top:0.4rem; line-height:1.45; }
          .home-tf-chiprow { display:flex; flex-wrap:wrap; gap:0.5rem; margin-top:1.25rem; }
          .home-tf-chip { display:inline-flex; align-items:center; gap:0.4rem; padding:0.4rem 0.75rem; border-radius:999px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); font-family:'Montserrat',sans-serif; font-size:0.72rem; font-weight:700; color:rgba(226,232,240,0.9); letter-spacing:0.04em; }
          .home-tf-cta { display:inline-flex; align-items:center; gap:0.55rem; padding:0.9rem 1.5rem; border-radius:999px; background:#DC2626; color:#fff; font-family:'Montserrat',sans-serif; font-size:0.78rem; font-weight:900; letter-spacing:0.14em; text-transform:uppercase; text-decoration:none; box-shadow:0 20px 40px rgba(220,38,38,0.35); transition:transform 0.2s ease, box-shadow 0.2s ease; border:0; cursor:pointer; }
          .home-tf-cta:hover { transform:translateY(-2px); box-shadow:0 24px 46px rgba(220,38,38,0.55); }
          .home-tf-cta-ghost { display:inline-flex; align-items:center; gap:0.55rem; padding:0.85rem 1.4rem; border-radius:999px; background:transparent; color:#fff; font-family:'Montserrat',sans-serif; font-size:0.78rem; font-weight:800; letter-spacing:0.14em; text-transform:uppercase; text-decoration:none; border:1px solid rgba(255,255,255,0.25); transition:background 0.2s ease; }
          .home-tf-cta-ghost:hover { background:rgba(255,255,255,0.08); }
        `}</style>

        {/* Curtain reveal */}
        <span className="tf-curtain tf-curtain-left"  aria-hidden />
        <span className="tf-curtain tf-curtain-right" aria-hidden />
        <span className="tf-curtain-tie tf-curtain-tie-left"  aria-hidden />
        <span className="tf-curtain-tie tf-curtain-tie-right" aria-hidden />
        <span className="tf-spot" aria-hidden />
        <div className="home-tf-grain" aria-hidden />

        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: '0 1.5rem', zIndex: 3 }}>
          {/* ── Centered logo + heading (above description + video) ── */}
          <div className="home-tf-topcenter">
            <div className="tf-reveal tf-reveal-1 home-tf-lockup" data-testid="home-tf-lockup">
              <img className="lockup-oll" src="/techfest/logo-oll.png" alt="OLL — Online Live Learning · India's largest school robotics network" />
              <span className="lockup-divider" aria-hidden />
              <img className="lockup-techfest" src="/techfest/logo-techfest.png" alt="Techfest, IIT Bombay — Asia's largest science &amp; technology festival" />
            </div>

            <h2 className="tf-reveal tf-reveal-3 home-tf-h2 home-tf-h2-single" data-testid="home-tf-headline">
              India&rsquo;s <em>Biggest</em> School Robotics Championship.
            </h2>
          </div>

          {/* ── Description + video row (constrained to nav max-width) ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 items-center home-tf-columns">

            {/* Left · description + CTA */}
            <div>
              <p
                className={`tf-reveal tf-reveal-4 home-tf-body ${moreOpen ? '' : 'home-tf-body-clamped'}`}
                style={{ marginTop: 4, maxWidth: 620 }}
                data-testid="home-tf-body"
              >
                The <strong style={{ color: '#fff', fontWeight: 700 }}>OLL Robotics Championship</strong> — powered by <strong style={{ color: '#fff', fontWeight: 700 }}>Techfest, IIT Bombay 2026</strong>, Asia&rsquo;s largest science and technology festival. Grades 4–12 across three flagship tracks — <strong style={{ color: '#fff', fontWeight: 700 }}>RoboSumo, RoboRacer &amp; the Robotics Innovation Challenge</strong> — compete through online submission rounds and live Regional Qualifiers, culminating at the Grand Finale on the iconic <strong style={{ color: '#fff', fontWeight: 700 }}>IIT Bombay campus, 17 December 2026</strong>. Cash prizes up to ₹1,50,000, industry mentors, national visibility.
              </p>
              <button
                type="button"
                className="home-tf-more-btn"
                onClick={() => setMoreOpen((v) => !v)}
                data-testid="home-tf-more-toggle"
                aria-expanded={moreOpen}
              >
                {moreOpen ? 'View less ↑' : 'View more ↓'}
              </button>

              <div className="tf-reveal tf-reveal-5 home-tf-chiprow" data-testid="home-tf-chips">
                <span className="home-tf-chip"><Star size={12} /> Grades 4–12</span>
                <span className="home-tf-chip"><PlayCircle size={12} /> 5 Regional Zones</span>
                <span className="home-tf-chip"><Sparkles size={12} /> Prizes ₹1.5L</span>
                <span className="home-tf-chip">🏆 Grand Finale · 17 Dec 2026</span>
              </div>

              <div className="tf-reveal tf-reveal-6" style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginTop: '1.75rem' }}>
                <button
                  type="button"
                  onClick={() => navigate('/techfest')}
                  className="home-tf-cta"
                  data-testid="home-tf-know-more"
                >
                  Know more <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Right · Play-video poster */}
            <div className="tf-reveal tf-reveal-4">
              <button
                type="button"
                onClick={() => setMediaOpen({ type: 'video', src: '/techfest/hero-video.mp4', label: 'OLL Robotics Championship · Techfest IIT Bombay 2026', caption: 'The highlight reel — Grades 4–12 · 5 Zones · Grand Finale at IIT Bombay' })}
                aria-label="Play the OLL Robotics Championship at Techfest IIT Bombay trailer"
                className="home-tf-play-wrap"
                data-testid="home-tf-video-play"
              >
                <video
                  className="home-tf-poster-video"
                  src="/techfest/hero-video.mp4"
                  muted
                  loop
                  playsInline
                  autoPlay
                  preload="metadata"
                  aria-hidden
                />
                <span className="home-tf-play-overlay">
                  <span className="home-tf-play-glyph" aria-hidden>
                    <Play size={34} fill="#fff" style={{ marginLeft: 4 }} />
                  </span>
                </span>
                <span className="home-tf-play-caption">▶ Watch the 45-sec trailer · IIT Bombay Grand Finale reveal</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Future Skills · Year-Round Continuous Program (Grades 1–10) ── */}
      <section style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F0F7FF 60%, #FFFFFF 100%)',
        position: 'relative',
        overflow: 'hidden',
        paddingTop: '4.5rem',
        paddingBottom: '5rem',
      }} data-testid="homepage-future-skills-section">
        {/* Tech grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(#1E3A5F 1px, transparent 1px), linear-gradient(90deg, #1E3A5F 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }} />
        <div style={{ position: 'absolute', top: '-80px', right: '8%', width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(circle, rgba(214,48,49,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-60px', left: '6%', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,58,95,0.18) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div className="text-center" style={{ paddingBottom: '2.5rem', paddingLeft: '1rem', paddingRight: '1rem', position: 'relative' }}>
          <div className="home-script-heading">weekly · offline · grades 1 – 10</div>
          <h2 className="home-h2">
            <strong style={{ color: '#D63031' }}>Future Skills</strong> Continuous Program
          </h2>
          <p className="home-sub">
            Robotics · Coding · AI · 3D Design · Emerging Tech — once a week, year-round, at your nearest centre. Small batches of 10. Robotic kit free with yearly.
          </p>
        </div>

        <div style={{ maxWidth: 1000, margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem', position: 'relative' }}>
          <div style={{
            background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FBFF 100%)',
            borderRadius: '1.5rem',
            border: '2px solid rgba(30,58,95,0.22)',
            boxShadow: '0 30px 60px rgba(15,30,51,0.08), 0 0 0 1px rgba(214,48,49,0.06)',
            padding: '2.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div className="grid md:grid-cols-[1fr_280px] gap-8" style={{ position: 'relative' }}>
              <div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {['Robotics', 'Coding', 'AI', '3D Design', 'IoT', 'AR / VR', 'Drones'].map(t => (
                    <span key={t} style={{ fontSize: '0.7rem', padding: '0.25rem 0.65rem', borderRadius: 999, background: 'rgba(30,58,95,0.08)', color: '#1E3A5F', border: '1px solid rgba(30,58,95,0.2)', fontWeight: 700, fontFamily: "'Nunito Sans', sans-serif" }}>
                      {t}
                    </span>
                  ))}
                </div>
                <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '1.5rem', fontWeight: 900, color: '#0F1E33', marginBottom: '0.5rem' }}>
                  One weekly class. Five future-defining skills.
                </h3>
                <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem', fontFamily: "'Nunito Sans', sans-serif" }}>
                  Three age-mapped tiers — <strong style={{ color: '#D63031' }}>Junior (3–7)</strong>, <strong style={{ color: '#7B2C5C' }}>Middle (8–11)</strong>, <strong style={{ color: '#1E3A5F' }}>Senior (12–16)</strong>. Curiosity in, builders out.
                </p>
                <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#334155', fontFamily: "'Nunito Sans', sans-serif" }}>
                  <li>✓ 120-min hands-on offline class · 1 / week</li>
                  <li>✓ Small batches · max 10 students · educator-led</li>
                  <li>✓ 70+ projects · Robotic kit free with yearly · year-end Tech Showcase</li>
                </ul>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <button
                    onClick={() => navigate('/future-skills/book?mode=trial')}
                    data-testid="homepage-future-skills-trial-btn"
                    style={{ background: 'linear-gradient(90deg, #D63031, #1E3A5F)', color: '#fff', padding: '0.85rem 1.75rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: 'pointer', boxShadow: '0 12px 28px rgba(30,58,95,0.3)' }}
                  >
                    Book Free Trial →
                  </button>
                  <button
                    onClick={() => navigate('/future-skills')}
                    data-testid="homepage-future-skills-cta-btn"
                    style={{ background: 'transparent', color: '#1E3A5F', padding: '0.85rem 1.75rem', borderRadius: '999px', fontWeight: 800, fontSize: '0.95rem', border: '2px solid #1E3A5F', cursor: 'pointer' }}
                  >
                    See Curriculum
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 220 }}>
                {[
                  { k: '1 Class / Week', v: '120 min · offline', icon: '📅', accent: '#1E3A5F' },
                  { k: 'Max 10 / Batch',  v: 'Small group',     icon: '👥', accent: '#1E3A5F' },
                  { k: '₹2,000/mo',      v: 'Yearly · Save 20%', icon: '💸', accent: '#D63031' },
                  { k: 'Free Kit',       v: 'With yearly plan',  icon: '🎁', accent: '#D63031' },
                ].map(s => (
                  <div key={s.k}
                    onClick={() => navigate('/future-skills')}
                    style={{ background: 'rgba(30,58,95,0.05)', border: '1px solid rgba(30,58,95,0.15)', borderRadius: '0.65rem', padding: '0.65rem 0.9rem', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.65rem' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.1)'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(30,58,95,0.05)'; e.currentTarget.style.transform = 'translateX(0)'; }}
                  >
                    <span style={{ fontSize: '1.15rem', lineHeight: 1 }}>{s.icon}</span>
                    <div>
                      <div style={{ color: s.accent, fontSize: '0.78rem', fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.2 }}>{s.k}</div>
                      <div style={{ color: '#64748B', fontSize: '0.7rem', fontFamily: "'Nunito Sans', sans-serif", marginTop: '0.1rem' }}>{s.v}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Foundations section — removed per request */}

      {/* ── PARENTS FEEDBACK · rating card + video testimonials + written quotes ── */}
      <section data-testid="homepage-parents-feedback" style={{
        position: 'relative',
        padding: '5rem 1.25rem 4rem',
        background: '#FFFFFF',
      }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>

          {/* Rating summary card */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E5E7EB',
              borderRadius: '1.25rem',
              boxShadow: '0 20px 40px rgba(15,30,80,0.08)',
              padding: '2rem 2.25rem',
              maxWidth: 780,
              margin: '0 auto 3rem',
              display: 'grid',
              gridTemplateColumns: '220px 1fr',
              gap: '2rem',
              alignItems: 'center',
            }}
            className="home-rating-card"
            data-testid="home-rating-card"
          >
            <style>{`@media (max-width: 640px) { .home-rating-card { grid-template-columns: 1fr !important; gap: 1rem !important; padding: 1.5rem !important; } }`}</style>
            <div>
              <div style={{ fontFamily: "'Zing Rust', 'Anton', sans-serif", fontSize: 'clamp(3.5rem, 6vw, 5rem)', lineHeight: 1, color: '#DC2626', fontWeight: 900, letterSpacing: '-0.02em' }}>
                4.75<span style={{ fontSize: '0.4em', color: '#94A3B8', marginLeft: 6 }}>/5</span>
              </div>
              <div style={{ marginTop: '0.4rem', fontFamily: "'Montserrat', sans-serif", fontSize: '0.7rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#DC2626' }}>Parent Rating</div>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.6rem' }}>
                {[0,1,2,3,4].map((i) => <Star key={i} size={20} style={{ color: '#DC2626', fill: '#DC2626' }} />)}
                <span style={{ marginLeft: 8, color: '#64748B', fontSize: '0.85rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 300 }}>based on 500+ reviews</span>
              </div>
              {[{ s: 5, p: 82 }, { s: 4, p: 14 }, { s: 3, p: 3 }, { s: 2, p: 1 }].map((r) => (
                <div key={r.s} style={{ display: 'grid', gridTemplateColumns: '28px 1fr 44px', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontSize: '0.8rem', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: 500 }}>{r.s}★</div>
                  <div style={{ height: 8, background: '#F1F5F9', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${r.p}%`, background: 'linear-gradient(90deg, #DC2626, #0A1F44)', borderRadius: 999 }} />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: "'Montserrat', sans-serif", fontWeight: 500, textAlign: 'right' }}>{r.p}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section headline */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#DC2626', marginBottom: '0.5rem' }}>
              // Real voices · real builds
            </div>
            <h2 className="home-h2" style={{ color: '#0F1E33' }}>
              Hear it from our <span style={{ color: '#0F1E33' }}>parents &amp; students</span>
            </h2>
          </div>

          {/* Video testimonials grid */}
          <div className="home-testimonial-grid" data-testid="home-testimonial-grid">
            <style>{`
              .home-testimonial-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; }
              @media (max-width: 1000px) { .home-testimonial-grid { grid-template-columns: repeat(2, 1fr); } }
              @media (max-width: 560px)  { .home-testimonial-grid { grid-template-columns: 1fr; } }
              .home-tcard { position: relative; aspect-ratio: 4/5; border-radius: 1.1rem; overflow: hidden; background: #0A1F44; box-shadow: 0 18px 40px rgba(15,30,80,0.15); cursor: pointer; text-decoration: none; transition: transform 0.35s ease, box-shadow 0.35s ease; }
              .home-tcard:hover { transform: translateY(-6px); box-shadow: 0 28px 56px rgba(15,30,80,0.25); }
              .home-tcard video, .home-tcard img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
              .home-tcard::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.90) 100%); pointer-events: none; }
              .home-tbadge { position: absolute; top: 14px; left: 14px; z-index: 2; font-family: 'Montserrat', sans-serif; font-weight: 700; font-size: 0.68rem; letter-spacing: 0.18em; text-transform: uppercase; padding: 5px 12px; border-radius: 999px; color: #fff; }
              .home-tbadge.parent { background: #DC2626; }
              .home-tbadge.student { background: #0F1E33; }
              .home-tplay { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; color: #fff; opacity: 0.9; transition: transform 0.3s ease, opacity 0.3s ease; }
              .home-tcard:hover .home-tplay { transform: scale(1.08); opacity: 1; }
              .home-tcopy { position: absolute; bottom: 16px; left: 18px; right: 18px; z-index: 2; color: #fff; font-family: 'Montserrat', sans-serif; }
              .home-tname { font-size: 1.05rem; font-weight: 700; line-height: 1.2; }
              .home-tquote { margin-top: 4px; font-size: 0.82rem; color: rgba(255,255,255,0.85); font-style: italic; line-height: 1.4; }
            `}</style>
            {TESTIMONIALS.map((t, idx) => {
              const isYT = !!t.thumbYT;
              const props = isYT
                ? { as: 'a', href: `https://youtu.be/${t.thumbYT}`, target: '_blank', rel: 'noreferrer' }
                : {};
              return (
                <a
                  key={t.name}
                  href={isYT ? `https://youtu.be/${t.thumbYT}` : undefined}
                  target={isYT ? '_blank' : undefined}
                  rel={isYT ? 'noreferrer' : undefined}
                  className="home-tcard"
                  data-testid={`home-testimonial-${idx}`}
                  {...(!isYT ? { onClick: (e) => {
                    const vid = e.currentTarget.querySelector('video');
                    if (!vid) return;
                    // First click always unmutes + plays; subsequent clicks toggle play/pause with sound on
                    if (vid.muted) {
                      vid.muted = false;
                      vid.currentTime = 0;
                      const p = vid.play();
                      if (p && p.catch) p.catch(() => {});
                    } else if (vid.paused) {
                      const p = vid.play();
                      if (p && p.catch) p.catch(() => {});
                    } else {
                      vid.pause();
                    }
                  }} : {})}
                >
                  <span className={`home-tbadge ${t.role}`}>{t.label}</span>
                  {isYT ? (
                    <img src={`https://i.ytimg.com/vi/${t.thumbYT}/hqdefault.jpg`} alt={t.name} loading="lazy" />
                  ) : (
                    <video src={t.video} autoPlay muted loop playsInline />
                  )}
                  <div className="home-tplay"><PlayCircle size={54} strokeWidth={1.5} /></div>
                  <div className="home-tcopy">
                    <div className="home-tname">{t.name}</div>
                    <div className="home-tquote">{t.quote}</div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* Written quote cards */}
          <div style={{ marginTop: '2.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }} data-testid="home-written-quotes">
            {WRITTEN_QUOTES.map((q) => (
              <div key={q.name} style={{
                background: '#FFFFFF',
                border: '1px solid #F1F5F9',
                borderRadius: '1rem',
                padding: '1.75rem 1.5rem',
                boxShadow: '0 10px 24px rgba(15,30,80,0.05)',
              }}>
                <QuoteIcon size={22} style={{ color: '#DC2626' }} />
                <p style={{ marginTop: '1rem', fontFamily: "'Montserrat', sans-serif", fontStyle: 'italic', color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }}>
                  &ldquo;{q.quote}&rdquo;
                </p>
                <div style={{ marginTop: '1.15rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {[0,1,2,3,4].map((i) => <Star key={i} size={15} style={{ color: '#DC2626', fill: '#DC2626' }} />)}
                </div>
                <div style={{ marginTop: '0.5rem', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.9rem', color: '#0F1E33' }}>
                  {q.name}<span style={{ color: '#94A3B8', fontWeight: 500 }}>, {q.context}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INSIDE AN OLL CLASSROOM · horizontal auto-scroll (uneven cards) ── */}
      <section data-testid="homepage-inside-classroom" style={{
        position: 'relative', overflow: 'hidden',
        padding: '5rem 0 5.5rem',
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
      }}>
        <style>{`
          @keyframes home-class-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          .home-class-wrap { position: relative; overflow: hidden; padding: 14px 0; mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 4%, black 96%, transparent); }
          .home-class-track { display: inline-flex; gap: 1.15rem; padding: 4px 1rem; align-items: center; animation: home-class-scroll 70s linear infinite; will-change: transform; width: max-content; }
          .home-class-track:hover { animation-play-state: paused; }
          .home-class-card {
            flex-shrink: 0; position: relative; overflow: hidden; border-radius: 20px; cursor: pointer;
            background: linear-gradient(180deg, #0A1F44 0%, #1E3A5F 100%);
            border: 2px solid rgba(96,165,250,0.16);
            box-shadow: 0 22px 44px rgba(10,31,68,0.16);
            transition: transform 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease;
          }
          .home-class-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(10,31,68,0.28); border-color: #DC2626; }
          .home-class-card img, .home-class-card video {
            position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover;
            transition: transform 0.55s ease, opacity 0.35s ease;
          }
          .home-class-card:hover img { transform: scale(1.06); }
          .home-class-overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 45%, rgba(10,31,68,0.92) 100%); pointer-events: none; }
          .home-class-pill { position: absolute; top: 12px; left: 12px; z-index: 2; display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; font-family: 'Proxima Nova','Montserrat',sans-serif; font-size: 0.62rem; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: #fff; backdrop-filter: blur(6px); border: 1px solid; }
          .home-class-pill.video { background: rgba(220,38,38,0.72); border-color: #DC2626; }
          .home-class-pill.photo { background: rgba(30,58,95,0.72); border-color: #60A5FA; }
          .home-class-play { position: absolute; inset: 0; z-index: 2; display: flex; align-items: center; justify-content: center; pointer-events: none; }
          .home-class-play > div { width: 60px; height: 60px; border-radius: 999px; background: rgba(255,255,255,0.15); border: 2px solid rgba(255,255,255,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; box-shadow: 0 12px 28px rgba(0,0,0,0.35); transition: transform 0.3s ease, background 0.3s ease, border-color 0.3s ease; }
          .home-class-card:hover .home-class-play > div { transform: scale(1.12); background: #DC2626; border-color: #DC2626; }
          .home-class-cap { position: absolute; bottom: 14px; left: 16px; right: 16px; z-index: 2; color: #fff; font-family: 'Proxima Nova','Montserrat',sans-serif; }
          .home-class-cap-title { font-size: 0.98rem; font-weight: 800; line-height: 1.2; }
          .home-class-cap-sub { margin-top: 3px; font-size: 0.76rem; color: rgba(191,219,254,0.9); font-weight: 300; line-height: 1.4; }
          /* Uneven sizes — cycled per card index so the ribbon looks organic */
          .home-class-size-0 { width: 300px; height: 400px; }
          .home-class-size-1 { width: 380px; height: 280px; }
          .home-class-size-2 { width: 260px; height: 340px; }
          .home-class-size-3 { width: 420px; height: 320px; }
          .home-class-size-4 { width: 320px; height: 420px; }
          @media (max-width: 640px) {
            .home-class-size-0 { width: 200px; height: 280px; }
            .home-class-size-1 { width: 240px; height: 200px; }
            .home-class-size-2 { width: 180px; height: 240px; }
            .home-class-size-3 { width: 260px; height: 220px; }
            .home-class-size-4 { width: 210px; height: 290px; }
            .home-class-cap-title { font-size: 0.8rem !important; }
            .home-class-cap-sub { display: none; }
            .home-class-play > div { width: 46px; height: 46px; }
          }
        `}</style>

        <div style={{ textAlign: 'center', maxWidth: 1180, margin: '0 auto 2.5rem', padding: '0 1.25rem' }}>
          <div className="home-script-heading">what learning looks like</div>
          <h2 className="home-h2">
            Inside an <span style={{ WebkitTextStroke: '2px #0A1F44', WebkitTextFillColor: 'transparent', color: 'transparent' }}>OLL classroom.</span>
          </h2>
          <p className="home-sub">Not slides. Not lectures. Real components, real builds, real kids getting their hands dirty.</p>
          <div style={{ marginTop: '0.75rem', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
            Tap any card to play / view
          </div>
        </div>

        <div className="home-class-wrap" data-testid="home-classroom-slider">
          <div className="home-class-track">
            {[...CLASSROOM_MEDIA, ...CLASSROOM_MEDIA].map((m, i) => {
              const originalIdx = i % CLASSROOM_MEDIA.length;
              const sizeClass = `home-class-size-${i % 5}`;
              return (
                <div
                  key={`${m.src}-${i}`}
                  className={`home-class-card ${sizeClass}`}
                  onClick={() => setMediaOpen(m)}
                  data-testid={i < CLASSROOM_MEDIA.length ? `home-classroom-card-${originalIdx}` : undefined}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMediaOpen(m); } }}
                  aria-label={`View ${m.label}`}
                >
                  {m.type === 'video' ? (
                    <video src={m.src} muted playsInline preload="metadata" style={{ pointerEvents: 'none' }} />
                  ) : (
                    <img src={m.src} alt={m.label} loading="lazy" />
                  )}
                  <div className="home-class-overlay" />
                  <span className={`home-class-pill ${m.type}`}>
                    {m.type === 'video' ? <Video size={11} /> : <Sparkles size={11} />}
                    {m.type === 'video' ? 'Video' : 'Photo'}
                  </span>
                  {m.type === 'video' && (
                    <div className="home-class-play">
                      <div><Play size={22} fill="#fff" strokeWidth={0} style={{ marginLeft: 2 }} /></div>
                    </div>
                  )}
                  <div className="home-class-cap">
                    <div className="home-class-cap-title">{m.label}</div>
                    <div className="home-class-cap-sub">{m.caption}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.25rem', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', color: '#64748B', fontStyle: 'italic' }}>
          {CLASSROOM_MEDIA.length} moments · captured at our centres in May 2026
        </div>
      </section>

      {/* ── OLL Journal · Latest blogs from WordPress ─────────────────── */}
      <WordPressBlogsSection testid="homepage-blogs" />

      {/* ── Classroom media lightbox modal ────────────────────────────── */}
      {mediaOpen && (
        <div
          data-testid="home-classroom-lightbox"
          onClick={(e) => { if (e.target === e.currentTarget) setMediaOpen(null); }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,30,0.92)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', backdropFilter: 'blur(8px)' }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setMediaOpen(null); }}
            data-testid="home-classroom-lightbox-close"
            aria-label="Close"
            style={{ position: 'absolute', top: 20, right: 20, width: 42, height: 42, borderRadius: 999, background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          <div style={{ position: 'relative', width: '100%', maxWidth: 960, borderRadius: 20, overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.55)', background: '#0A1F44' }}>
            {mediaOpen.type === 'video' ? (
              <video src={mediaOpen.src} controls autoPlay playsInline style={{ width: '100%', maxHeight: '80vh', background: '#000', display: 'block' }} />
            ) : (
              <img src={mediaOpen.src} alt={mediaOpen.label} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain', background: '#000', display: 'block' }} />
            )}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(180deg, rgba(10,31,68,0.4), #0A1F44)', color: '#fff' }}>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#FCA5A5' }}>
                {mediaOpen.type === 'video' ? 'Class footage' : 'Class moment'}
              </div>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '1.15rem', fontWeight: 800, marginTop: 4 }}>{mediaOpen.label}</div>
              <div style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.9rem', marginTop: 4, color: 'rgba(191,219,254,0.9)' }}>{mediaOpen.caption}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Blog callouts: RoboSumo + ICSE Code 66 ────────────── */}
      <section
        style={{ maxWidth: 1180, margin: '0 auto', padding: '3rem 1.25rem 3.5rem' }}
        data-testid="home-blog-callouts"
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>
            From the OLL blog
          </div>
          <h2 style={{ fontFamily: 'Manrope, sans-serif', fontSize: '1.9rem', color: '#0A1F44', fontWeight: 700, margin: 0 }}>
            Deep dives, built for schools &amp; makers
          </h2>
        </div>

        <div className="home-blog-grid">
          {[
            {
              tid: 'home-blog-robosumo',
              href: '/blogs/how-to-build-robosumo-robot-iit-bombay-techfest',
              badge: 'OLL × TechFest · 18 min read',
              title: 'How to Build a RoboSumo Robot for Robotics Competitions',
              body:
                "A national winner's step-by-step build guide — ESP32, BTS7960 drivers, LiPo, code and testing — with a full ESP32 sketch and wiring diagram.",
              cover: '/blog-assets/robosumo/hero-robosumo-circuit-diagram.png',
              alt: 'Complete ESP32-S3 wiring diagram for a RoboSumo robot with dual BTS7960 motor drivers, LM2596 buck converter and 3S LiPo battery.',
            },
            {
              tid: 'home-blog-icse',
              href: '/blogs/icse-robotics-ai-code-66-classes-9-10-guide',
              badge: 'ICSE Code 66 · 22 min read',
              title: 'ICSE Robotics & AI Group 3 Subject (Code 66): Complete Guide for Schools',
              body:
                'CISCE syllabus, exam pattern, lab setup, Python and teacher support — the full implementation playbook for schools introducing Code 66.',
              cover: '/blog-assets/icse-code66/icse-code66-hero-banner-v2.jpg',
              alt: 'OLL ICSE Group 3 Subject — Code 66: Robotics & AI for Classes 9th & 10th. Implementation Guide for Schools banner.',
            },
          ].map((b) => (
            <a
              key={b.tid}
              href={b.href}
              data-testid={b.tid}
              className="home-blog-card"
            >
              <div className="home-blog-card__media">
                <img src={b.cover} alt={b.alt} width={1200} height={720} loading="lazy" />
              </div>
              <div className="home-blog-card__body">
                <div className="home-blog-card__badge">{b.badge}</div>
                <h3>{b.title}</h3>
                <p>{b.body}</p>
                <span className="home-blog-card__cta">Read the guide →</span>
              </div>
            </a>
          ))}
        </div>

        <style>{`
          .home-blog-grid {
            display: grid; grid-template-columns: 1fr 1fr; gap: 20px;
          }
          .home-blog-card {
            display: flex; flex-direction: column;
            border-radius: 22px; overflow: hidden;
            border: 1px solid #E2E8F0; background: #fff;
            box-shadow: 0 10px 30px rgba(10,31,68,0.06);
            text-decoration: none; color: inherit;
            transition: transform .2s ease, box-shadow .2s ease;
          }
          .home-blog-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 20px 50px rgba(10,31,68,0.12);
          }
          .home-blog-card__media { aspect-ratio: 16/9; background: #F8FAFC; overflow: hidden; }
          .home-blog-card__media img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .home-blog-card__body { padding: 1.4rem 1.5rem 1.6rem; }
          .home-blog-card__badge {
            font-size: 11px; letter-spacing: .18em; text-transform: uppercase;
            font-weight: 700; color: #DC2626; margin-bottom: 8px;
          }
          .home-blog-card h3 {
            font-family: 'Manrope', sans-serif;
            font-size: 1.2rem; line-height: 1.25; color: #0A1F44;
            font-weight: 700; margin: 0 0 .55rem;
          }
          .home-blog-card p { color: #475569; font-size: 14.5px; line-height: 1.6; margin: 0 0 1rem; }
          .home-blog-card__cta { color: #DC2626; font-weight: 600; font-size: 14px; }
          @media (max-width: 760px) {
            .home-blog-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </section>

      <Footer />
    </div>
    </>
  );
};

export default LandingPage;
