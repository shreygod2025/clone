import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Zap, Users, ArrowRight, Star, CheckCircle } from 'lucide-react';

// ── Data Definitions ─────────────────────────────────────────────────────────

const LOCATIONS = {
  'andheri-west': {
    name: 'Andheri West',
    fullName: 'Andheri West, Mumbai',
    area: 'Andheri West',
    city: 'Mumbai',
    address: 'Lokhandwala Complex, Andheri West, Mumbai – 400053',
    nearby: ['Versova', 'Four Bungalows', 'DN Nagar', 'Oshiwara'],
  },
  'mira-road': {
    name: 'Mira Road',
    fullName: 'Mira Road, Mumbai',
    area: 'Mira Road East',
    city: 'Mumbai',
    address: 'Sector 1, Mira Road East, Thane – 401107',
    nearby: ['Bhayandar', 'Dahisar', 'Mira Bhayandar'],
  },
  'dombivli': {
    name: 'Dombivli',
    fullName: 'Dombivli, Mumbai',
    area: 'Dombivli East',
    city: 'Mumbai',
    address: 'Pallava, Dombivli East, Thane – 421201',
    nearby: ['Kalyan', 'Thane', 'Ulhasnagar'],
  },
  'dahisar': {
    name: 'Dahisar',
    fullName: 'Dahisar, Mumbai',
    area: 'Dahisar East',
    city: 'Mumbai',
    address: 'Dahisar East, Mumbai – 400068',
    nearby: ['Borivali', 'Kandivali', 'Mira Road'],
  },
  'online': {
    name: 'Online',
    fullName: 'Online – Anywhere in India',
    area: 'Online',
    city: 'India',
    address: 'Live Zoom classes – join from anywhere in India',
    nearby: ['Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'],
  },
};

const SKILLS = {
  'robotics': {
    name: 'Robotics',
    icon: '🤖',
    headline: 'Robotics Summer Camp for Kids',
    description: 'Kids build real robots from scratch using Arduino, sensors and actuators. They program the robots to navigate mazes, detect obstacles and complete missions.',
    projects: ['Line-following robot', 'Obstacle-avoiding bot', 'Robotic arm', 'Sumo bot'],
    keywords: ['robotics for kids', 'kids robotics camp', 'build robots summer camp'],
  },
  'coding': {
    name: 'Coding & Python',
    icon: '💻',
    headline: 'Coding Summer Camp for Kids',
    description: 'Children learn Python programming and Scratch visual coding. They build real apps, games, and automation scripts — going from "Hello World" to full projects in just 10 days.',
    projects: ['Python quiz game', 'Scratch animation', 'Password generator', 'Mini calculator app'],
    keywords: ['coding for kids', 'python summer camp', 'programming camp for kids'],
  },
  'ai': {
    name: 'Artificial Intelligence',
    icon: '🧠',
    headline: 'AI Summer Camp for Kids',
    description: 'Children explore machine learning concepts, train image recognition models, and build AI-powered apps. No prior experience needed — just curiosity.',
    projects: ['Image classifier', 'AI chatbot', 'Gesture-controlled robot', 'Teachable Machine model'],
    keywords: ['AI for kids', 'machine learning summer camp', 'artificial intelligence kids camp'],
  },
  '3d-design': {
    name: '3D Design',
    icon: '🎨',
    headline: '3D Design & Printing Summer Camp',
    description: 'Kids design real 3D models using professional tools like Tinkercad and Fusion 360. They see their designs come to life on 3D printers.',
    projects: ['Custom keychain', '3D phone stand', 'Architectural model', 'Wearable accessory'],
    keywords: ['3D design for kids', '3D printing camp', 'CAD summer camp'],
  },
  'financial-literacy': {
    name: 'Financial Literacy',
    icon: '💰',
    headline: 'Financial Literacy Summer Camp for Kids',
    description: 'Children learn about money, investing, budgeting, and entrepreneurship in an age-appropriate, hands-on format. Builds habits that last a lifetime.',
    projects: ['Business plan pitch', 'Stock market simulation', 'Budget planner', 'Mini startup idea'],
    keywords: ['financial literacy for kids', 'money management kids', 'entrepreneurship camp'],
  },
};

const AGE_GROUPS = {
  '4-6': { label: '4 – 6 Years', headline: 'Summer Camp for 4–6 Year Olds', campGroup: 'Little Explorers', description: 'Our youngest campers explore block coding, basic electronics, and simple robotics through play-based learning. Every activity is hands-on and designed for small fingers and big curiosity.', skills: ['Block coding with Scratch Jr', 'LED circuits', 'Simple robotic toys', 'Creative building'] },
  '6-8': { label: '6 – 8 Years', headline: 'Summer Camp for 6–8 Year Olds', campGroup: 'Little Explorers', description: 'Children aged 6–8 dive into Scratch coding, build their first circuits, and assemble beginner robots. They leave with real projects they built themselves.', skills: ['Scratch coding', 'Basic Arduino', 'Sensor projects', 'Simple automation'] },
  '8-10': { label: '8 – 10 Years', headline: 'Summer Camp for 8–10 Year Olds', campGroup: 'Tech Creators', description: 'Eight to ten year olds tackle Python basics, robotics kits, and their first AI experiments. This is where curiosity turns into real skills.', skills: ['Python programming', 'Robotics kit', 'AI introduction', '3D modelling basics'] },
  '10-12': { label: '10 – 12 Years', headline: 'Summer Camp for 10–12 Year Olds', campGroup: 'Tech Creators', description: 'Pre-teens in this group write real Python code, build Arduino robots, and explore machine learning. Camp intensity matches their growing capabilities.', skills: ['Python & Scratch', 'Arduino robotics', 'Machine learning basics', '3D Design in Tinkercad'] },
  '12-14': { label: '12 – 14 Years', headline: 'Summer Camp for 12–14 Year Olds', campGroup: 'Future Innovators', description: 'Teenagers in this group tackle advanced robotics, AI model training, and 3D Design for 3D printing. They\'re ready for serious tech skills.', skills: ['Advanced Python', 'AI/ML projects', '3D printing', 'Entrepreneurship basics'] },
  '14-16': { label: '14 – 16 Years', headline: 'Summer Camp for Teenagers 14–16', campGroup: 'Future Innovators', description: 'High schoolers work on college-portfolio worthy projects: AI models, custom robots, and tech startup pitches. Build skills that impress university admissions.', skills: ['Advanced AI & ML', 'Custom robot design', '3D Design & printing', 'Startup pitch'] },
};

const ALL_LOCATIONS = Object.entries(LOCATIONS);
const ALL_SKILLS = Object.entries(SKILLS);
const ALL_AGES = Object.entries(AGE_GROUPS);

// ── Styles ────────────────────────────────────────────────────────────────────
const S = {
  page: { background: '#080C16', minHeight: '100vh', fontFamily: "'Nunito Sans', sans-serif", color: '#F0F4F8' },
  nav: { padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)' },
  hero: { maxWidth: 900, margin: '0 auto', padding: '5rem 2rem 3rem', textAlign: 'center' },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.8rem', color: '#00E5FF', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: '0.05em', marginBottom: '1.5rem' },
  h1: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 800, fontSize: 'clamp(1.8rem, 4vw, 3rem)', lineHeight: 1.1, color: '#F8FAFC', marginBottom: '1.2rem' },
  desc: { fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.7, maxWidth: 680, margin: '0 auto 2.5rem' },
  cta: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #D63031 0%, #c02626 100%)', color: '#fff', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1rem', padding: '0.9rem 2rem', borderRadius: 8, textDecoration: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' },
  section: { maxWidth: 900, margin: '0 auto', padding: '3rem 2rem' },
  card: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '1.5rem' },
  h2: { fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#F8FAFC', marginBottom: '1rem' },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem', marginTop: '1rem' },
  linkPill: { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.6rem 1rem', textDecoration: 'none', color: '#CBD5E1', fontSize: '0.88rem', fontFamily: "'Nunito Sans', sans-serif", transition: 'border-color 0.2s, color 0.2s' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SummerCampSEOPage() {
  const { type, slug } = useParams();

  const locData = type === 'location' ? LOCATIONS[slug] : null;
  const skillData = type === 'skill' ? SKILLS[slug] : null;
  const ageData = type === 'age' ? AGE_GROUPS[slug] : null;

  if (!locData && !skillData && !ageData) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <h1 style={{ color: '#F8FAFC' }}>Page not found</h1>
        <Link to="/summer-camp" style={{ color: '#00E5FF' }}>← Back to Summer Camp</Link>
      </div>
    );
  }

  const title = locData
    ? `Robotics & AI Summer Camp in ${locData.fullName} 2026 | OLL`
    : skillData
    ? `${skillData.headline} 2026 | Mumbai | OLL`
    : `${ageData.headline} | Robotics, AI & Coding 2026 | OLL`;

  const metaDesc = locData
    ? `Join OLL's 10-day future-skills summer camp at our ${locData.name} center in ${locData.city}. Robotics, Coding, AI & 3D Design for ages 4–16. Weekday & weekend batches. STEM.org certified. Book now for May 2026.`
    : skillData
    ? `India's best ${skillData.name} summer camp for kids. 10-day intensive hands-on program. Build real projects in Mumbai & Online. Ages 4–16. STEM.org certified. May 2026.`
    : `${ageData.campGroup} summer camp for kids aged ${ageData.label}. Robotics, Coding, AI & 3D Design — 10 days of hands-on tech learning. Mumbai & Online. May 2026.`;

  const canonical = `https://www.ollindia.com/summer-camp/${type}/${slug}`;

  return (
    <div style={S.page}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/ko80g3wd_images.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={metaDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Event",
          "name": title.replace(' | OLL', ''),
          "description": metaDesc,
          "startDate": "2026-05-01",
          "endDate": "2026-05-31",
          "eventStatus": "https://schema.org/EventScheduled",
          "location": locData ? {
            "@type": "Place",
            "name": `OLL Center – ${locData.name}`,
            "address": { "@type": "PostalAddress", "streetAddress": locData.address, "addressLocality": locData.city, "addressRegion": "Maharashtra", "addressCountry": "IN" }
          } : { "@type": "Place", "name": "OLL – Multiple Centers in Mumbai & Online" },
          "organizer": { "@type": "Organization", "name": "OLL – Online Live Learning", "url": "https://www.ollindia.com" },
          "offers": { "@type": "Offer", "price": "1999", "priceCurrency": "INR", "url": "https://www.ollindia.com/summer-camp/book", "availability": "https://schema.org/LimitedAvailability" }
        })}</script>
      </Helmet>

      {/* Nav */}
      <nav style={S.nav}>
        <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/favicon.png" alt="OLL" style={{ width: 32, height: 32, borderRadius: 6 }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#F8FAFC', fontSize: '1rem' }}>OLL</span>
        </Link>
        <Link to="/summer-camp" style={{ color: '#94A3B8', fontSize: '0.9rem', textDecoration: 'none' }}>← Summer Camp Home</Link>
      </nav>

      {/* Hero */}
      <section style={S.hero}>
        <div style={S.tag}>
          <Star size={12} />
          Summer Camp 2026 · STEM.org Certified
        </div>

        <h1 style={S.h1}>
          {locData && `Summer Camp in ${locData.name}`}
          {skillData && skillData.headline}
          {ageData && ageData.headline}
        </h1>

        <p style={S.desc}>
          {locData && `OLL's 10-day tech summer camp is coming to ${locData.name}, ${locData.city}! Kids aged 4–16 build robots, write Python code, explore AI, and design in 3D — all in just 10 action-packed days. Batches starting May 2026.`}
          {skillData && skillData.description}
          {ageData && ageData.description}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/summer-camp/book" style={S.cta}>
            Book Your Spot — ₹1,999 <ArrowRight size={16} />
          </Link>
          <Link to="/summer-camp" style={{ ...S.cta, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
            View Full Camp Details
          </Link>
        </div>
      </section>

      {/* Key Info Cards */}
      <section style={S.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
          {[
            { icon: '🗓️', label: 'Duration', value: '10 Days' },
            { icon: '👦', label: 'Ages', value: ageData ? ageData.label : '4 – 16 Years' },
            { icon: '📍', label: 'Location', value: locData ? locData.name : 'Mumbai + Online' },
            { icon: '💰', label: 'Fee', value: '₹1,999 all-in' },
          ].map(item => (
            <div key={item.label} style={S.card}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>{item.label}</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: '1.1rem', color: '#F8FAFC' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* What They Learn */}
        <h2 style={S.h2}>
          {locData && `What Kids Learn at the ${locData.name} Camp`}
          {skillData && `What Your Child Will Build`}
          {ageData && `Curriculum for ${ageData.label}`}
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginBottom: '3rem' }}>
          {(locData
            ? ['Robotics & Arduino', 'Python & AI Coding', '3D Design', 'Financial Literacy', 'Entrepreneurship']
            : skillData
            ? skillData.projects
            : ageData.skills
          ).map(item => (
            <div key={item} style={{ ...S.card, display: 'flex', alignItems: 'center', gap: 10 }}>
              <CheckCircle size={16} style={{ color: '#00E5FF', flexShrink: 0 }} />
              <span style={{ color: '#CBD5E1', fontSize: '0.95rem' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* Location-specific nearby areas */}
        {locData && (
          <div style={{ ...S.card, marginBottom: '3rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <MapPin size={16} style={{ color: '#00E5FF' }} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#F8FAFC' }}>Center Address</span>
            </div>
            <p style={{ color: '#94A3B8', margin: 0, lineHeight: 1.6 }}>{locData.address}</p>
            <p style={{ color: '#64748B', margin: '0.5rem 0 0', fontSize: '0.85rem' }}>
              Convenient for families in {locData.nearby.join(', ')}
            </p>
          </div>
        )}

        {/* CTA Banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(214,48,49,0.12) 0%, rgba(0,229,255,0.06) 100%)', border: '1px solid rgba(214,48,49,0.25)', borderRadius: 16, padding: '2.5rem', textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ ...S.h2, marginBottom: '0.75rem' }}>Limited Seats — May 2026</h2>
          <p style={{ color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Each batch has a maximum of 15 students to ensure personalised attention. Seats fill fast — secure yours now.
          </p>
          <Link to="/summer-camp/book" style={S.cta}>
            Book Now — ₹1,999 <ArrowRight size={16} />
          </Link>
        </div>

        {/* Related Pages */}
        <div style={{ marginBottom: '2rem' }}>
          {type !== 'location' && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#94A3B8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Explore by Location</h3>
              <div style={S.linkGrid}>
                {ALL_LOCATIONS.map(([s, d]) => (
                  <Link key={s} to={`/summer-camp/location/${s}`} style={S.linkPill}>
                    <MapPin size={12} style={{ color: '#00E5FF', flexShrink: 0 }} /> {d.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {type !== 'skill' && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#94A3B8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Explore by Skill</h3>
              <div style={S.linkGrid}>
                {ALL_SKILLS.map(([s, d]) => (
                  <Link key={s} to={`/summer-camp/skill/${s}`} style={S.linkPill}>
                    <span>{d.icon}</span> {d.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {type !== 'age' && (
            <div>
              <h3 style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: '#94A3B8', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Explore by Age</h3>
              <div style={S.linkGrid}>
                {ALL_AGES.map(([s, d]) => (
                  <Link key={s} to={`/summer-camp/age/${s}`} style={S.linkPill}>
                    <Users size={12} style={{ color: '#00E5FF', flexShrink: 0 }} /> Age {d.label}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <Link to="/summer-camp" style={{ color: '#64748B', textDecoration: 'none', fontSize: '0.9rem' }}>
            ← View all summer camp details at OLL
          </Link>
        </div>
      </section>
    </div>
  );
}
