/**
 * SEO route metadata — single source of truth used by `seo-prerender.cjs`
 * at build time to inject route-specific `<title>` / `<meta>` / `<link rel="canonical">`
 * / OpenGraph / Twitter tags into per-route static HTML.
 *
 * Why this exists
 * ───────────────
 * `react-snap` was brittle (puppeteer races with `react-helmet-async`, API
 * timeouts on certain pages broke the whole build, React 19 strict-mode
 * effects sometimes never flushed Helmet's tags into the static DOM). The
 * result: per-route HTML files either weren't produced or had a stripped
 * `<head>`, so WhatsApp/Facebook/Google saw the SPA shell (homepage OG
 * tags) for every URL.
 *
 * This config is read by a tiny deterministic Node script after CRA's
 * `build/` is generated. No browser, no React, no race condition.
 *
 * Notes
 * ─────
 *  - `og:image` URLs are auto-wrapped via wsrv.nl so they always render
 *    under WhatsApp's hard ~1 MB ceiling. The wrapper is idempotent.
 *  - The SITE constant must match `<link rel="canonical">` in
 *    `public/index.html` and the URL configured in Cashfree/social verifiers.
 */

const SITE = 'https://oll.co';

// wsrv.nl CDN proxy — resizes huge marketing PNGs (often 1.5–3 MB) to a
// 1200×630 JPG @ q80, which lands at 150–300 KB. WhatsApp won't fetch
// anything heavier than ~1 MB, so this is the difference between a link
// preview that shows the image and one that silently falls back to the
// generic homepage thumbnail.
const WSRV = 'https://wsrv.nl/?';
function ogImage(src, { w = 1200, h = 630, q = 80 } = {}) {
  if (!src) return src;
  if (src.startsWith(WSRV)) return src;
  const params = new URLSearchParams({
    url: src,
    w: String(w),
    h: String(h),
    fit: 'cover',
    output: 'jpg',
    q: String(q),
    we: '1',
  });
  return `${WSRV}${params.toString()}`;
}

const DEFAULT_OG_IMAGE = `${SITE}/og-default.png`;

// Each route's metadata. The keys are URL paths (with leading slash, no
// trailing slash except '/'). If a route is missing here it still gets
// the default SPA shell — so we only need to list routes where the
// dynamic Helmet meta is critical for sharing/SEO.
const ROUTES = {
  '/': {
    title: 'OLL — Robotics, AI & Coding Classes for Kids in India | Skill Education',
    description: "OLL is India's leading future-skills platform for kids age 4-16. Live online & in-centre Robotics, AI, Coding, Entrepreneurship & Financial Literacy classes. Trusted by 500+ schools nationwide.",
    ogTitle: 'OLL — Robotics, AI & Coding Classes for Kids in India',
    ogDescription: 'Live future-skills classes for ages 4-16. Robotics, AI, Coding, Entrepreneurship & Financial Literacy. As seen on Shark Tank India.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/workshops/fathers-day-robotics': {
    title: "Father's Day 2026 Robotics Workshop · ₹500 OFF till Sunday · Mumbai · OLL",
    description: "Father's Day 2026 in Mumbai — spend Sunday 21 June building a real robot with your child (ages 4–12). ₹500 OFF, now ₹1,499 (was ₹1,999) — offer ends Sunday. Screen-free, hands-on, Kandivali & Mira Road.",
    ogTitle: "Father's Day 2026 Robotics Workshop · ₹500 OFF · Mumbai · OLL",
    ogDescription: "₹500 OFF — now ₹1,499 (was ₹1,999) till Sunday only. Build a real robot with your child (ages 4–12). Screen-free · Sun 21 June · Mumbai.",
    ogImage: ogImage('https://customer-assets.emergentagent.com/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/2t1vu6l9_ChatGPT%20Image%20Jun%204%2C%202026%2C%2012_50_47%20PM.png'),
    ogType: 'event',
  },

  '/workshops': {
    title: 'OLL Workshops — Hands-on Robotics, AI & STEM Events for Kids',
    description: 'Browse upcoming OLL workshops in Mumbai & online — Robotics, AI, Coding, Father\'s Day specials and parent-child bonding events for ages 4-16.',
    ogTitle: 'OLL Workshops — Robotics, AI & STEM Events for Kids',
    ogDescription: 'Hands-on weekend & holiday workshops for kids age 4-16. Robotics, AI, Coding & parent-child specials.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/about': {
    title: 'About OLL — India\'s Future-Skills Platform for Kids',
    description: 'Meet OLL — India\'s leading future-skills education platform for kids age 4-16. Featured on Shark Tank India and KBC. 500+ schools served nationwide.',
    ogTitle: 'About OLL — As seen on Shark Tank India',
    ogDescription: 'India\'s leading future-skills education platform for kids age 4-16. Robotics, AI, Coding, Entrepreneurship & Financial Literacy.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/offerings': {
    title: 'OLL Offerings — Robotics, AI, Coding & Financial Literacy for Kids',
    description: 'Explore OLL\'s full catalogue of live skill classes & in-school programs: Robotics, AI, Coding, Entrepreneurship and Financial Literacy for ages 4-16.',
    ogTitle: 'OLL Offerings — Live Future-Skills Classes for Kids',
    ogDescription: 'Robotics, AI, Coding, Entrepreneurship & Financial Literacy — taught by trained educators, live online & in-centre.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/centers': {
    title: 'OLL Centers — Find a Robotics & Coding Centre Near You',
    description: 'OLL skill-education centres across India. Find your nearest centre for Robotics, AI, Coding, Entrepreneurship and Financial Literacy classes.',
    ogTitle: 'Find an OLL Centre Near You',
    ogDescription: 'Robotics, AI, Coding & STEM centres across India — find the closest one to your child.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/for-schools': {
    title: 'OLL for Schools — Robotics Labs, AI Centres & Coding Programs',
    description: 'Turn your school into a future-skills hub. OLL sets up Robotics Labs, AI Centres of Excellence, Coding curriculum and Entrepreneurship workshops in 500+ schools across India.',
    ogTitle: 'Transform Your School with OLL',
    ogDescription: 'Robotics Labs, AI Centres of Excellence, Coding programs & Entrepreneurship workshops for schools across India.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/summer-camp': {
    title: 'OLL Summer Camp 2026 — Robotics, AI & Coding for Kids in Mumbai',
    description: 'OLL Summer Camp 2026 — week-long Robotics, AI, Coding, 3D Design and Financial Literacy programs for kids age 4-16 across Mumbai & online.',
    ogTitle: 'OLL Summer Camp 2026 — Robotics, AI & Coding for Kids',
    ogDescription: 'Week-long future-skill camps for kids age 4-16. Robotics · AI · Coding · 3D Design · Financial Literacy. Mumbai & online.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/ai-foundations': {
    title: 'AI Foundations — Live AI Course for Teens age 11-16 | OLL',
    description: 'Live cohort-based AI Foundations course for teens 11-16. Build real AI projects, learn LLMs, agents and prompt engineering with OLL\'s trained educators.',
    ogTitle: 'AI Foundations — Live AI Course for Teens',
    ogDescription: 'Cohort-based live AI course for teens age 11-16. Build real AI projects, learn LLMs, agents and prompt engineering.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/future-skills': {
    title: 'OLL Future Skills — Continuous Learning Program for Kids',
    description: 'OLL\'s flagship continuous learning program — Robotics, AI, Coding, Entrepreneurship & Financial Literacy for kids age 4-16.',
    ogTitle: 'OLL Future Skills — Continuous Learning for Kids',
    ogDescription: 'Build real future-skill mastery — Robotics, AI, Coding, Entrepreneurship & Financial Literacy. Cohort-based, live, in-centre or online.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/social-media-intern': {
    title: 'Social Media Internship Readiness Program — OLL',
    description: 'Get internship-ready in social media. Learn content strategy, paid ads, analytics & community building from OLL\'s in-house marketing team.',
    ogTitle: 'Social Media Internship Readiness Program',
    ogDescription: 'Hands-on social media internship-readiness program — content, ads, analytics & community building.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/growth-partner': {
    title: 'OLL Growth Partner Program — Earn While Spreading Future Skills',
    description: 'Become an OLL Growth Partner — partner with India\'s leading future-skills brand and earn while bringing Robotics, AI & Coding to families & schools near you.',
    ogTitle: 'OLL Growth Partner Program',
    ogDescription: 'Partner with India\'s leading future-skills brand and earn while bringing Robotics, AI & Coding to families & schools near you.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/join-team': {
    title: 'Join OLL — Careers in EdTech & Future-Skills Education',
    description: 'Build the future of education with OLL. Open roles across teaching, content, growth, ops & engineering. Featured on Shark Tank India.',
    ogTitle: 'Join the OLL Team',
    ogDescription: 'Build the future of education. Open roles across teaching, content, growth, ops & engineering.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/blogs': {
    title: 'OLL Blog — Robotics, AI, Coding & Parenting Insights',
    description: 'OLL Blog — practical guides on Robotics, AI, Coding, parenting & raising future-ready kids in India.',
    ogTitle: 'OLL Blog — Future-Skills Insights for Parents',
    ogDescription: 'Practical guides on Robotics, AI, Coding & parenting from OLL\'s educators and product team.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/resources': {
    title: 'OLL Resources — Free Worksheets, Curriculum & Parent Guides',
    description: 'Free OLL resources — worksheets, mini-curricula, parent guides and skill-building activities for kids age 4-16.',
    ogTitle: 'OLL Resources — Free Worksheets & Parent Guides',
    ogDescription: 'Free worksheets, mini-curricula and skill-building activities for kids age 4-16.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/faq': {
    title: 'OLL FAQ — Common Questions About Classes, Pricing & Schedule',
    description: 'Answers to common questions about OLL\'s classes, pricing, schedule, refund policy and how live future-skills learning works.',
    ogTitle: 'OLL FAQ',
    ogDescription: 'Common questions about OLL\'s classes, pricing, schedule and refund policy.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/student': {
    title: 'OLL for Students — Live Robotics, AI & Coding Classes',
    description: 'OLL\'s live future-skills classes for students age 4-16. Robotics, AI, Coding, Entrepreneurship & Financial Literacy — book a free demo today.',
    ogTitle: 'OLL for Students — Live Future-Skills Classes',
    ogDescription: 'Live cohort-based Robotics, AI, Coding & Entrepreneurship classes for kids age 4-16.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/educator': {
    title: 'Become an OLL Educator — Teach Robotics, AI & Coding Live',
    description: 'Teach future-skills with OLL. We hire and train passionate educators to deliver live Robotics, AI, Coding & Financial Literacy classes across India.',
    ogTitle: 'Become an OLL Educator',
    ogDescription: 'Teach Robotics, AI, Coding & Financial Literacy live — across India, with full training & support.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/terms': {
    title: 'Terms of Service — OLL',
    description: 'Terms of Service for OLL — India\'s future-skills education platform.',
    ogTitle: 'OLL — Terms of Service',
    ogDescription: 'Terms of Service for OLL.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },

  '/privacy': {
    title: 'Privacy Policy — OLL',
    description: 'Privacy Policy for OLL — how we collect, use and protect your data.',
    ogTitle: 'OLL — Privacy Policy',
    ogDescription: 'Privacy Policy for OLL — how we collect, use and protect your data.',
    ogImage: DEFAULT_OG_IMAGE,
    ogType: 'website',
  },
};

module.exports = { SITE, ROUTES, DEFAULT_OG_IMAGE, ogImage };
