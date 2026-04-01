import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { MapPin, Users, ArrowRight, Star, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import Footer from '../components/Footer';

// ── Data ─────────────────────────────────────────────────────────────────────

const LOCATIONS = {
  'andheri-west': { name: 'Andheri West', fullName: 'Andheri West, Mumbai', area: 'Andheri West', city: 'Mumbai', address: 'Lokhandwala Complex, Andheri West, Mumbai – 400053', nearby: ['Versova', 'Four Bungalows', 'DN Nagar', 'Oshiwara', 'Lokhandwala'] },
  'mira-road':    { name: 'Mira Road',    fullName: 'Mira Road, Mumbai',    area: 'Mira Road East', city: 'Mumbai', address: 'Sector 1, Mira Road East, Thane – 401107', nearby: ['Bhayandar', 'Dahisar', 'Mira Bhayandar', 'Kashimira'] },
  'dombivli':     { name: 'Dombivli',     fullName: 'Dombivli, Mumbai',     area: 'Dombivli East',  city: 'Mumbai', address: 'Pallava, Dombivli East, Thane – 421201', nearby: ['Kalyan', 'Thane', 'Ulhasnagar', 'Ambernath'] },
  'dahisar':      { name: 'Dahisar',      fullName: 'Dahisar, Mumbai',      area: 'Dahisar East',   city: 'Mumbai', address: 'Dahisar East, Mumbai – 400068', nearby: ['Borivali', 'Kandivali', 'Mira Road', 'Bhayander'] },
  'online':       { name: 'Online',       fullName: 'Online – Anywhere in India', area: 'Online', city: 'India', address: 'Live Zoom classes – join from anywhere in India', nearby: ['Delhi', 'Bangalore', 'Pune', 'Hyderabad', 'Chennai'] },
};

const SKILLS = {
  'robotics':           { name: 'Robotics',              icon: '🤖', headline: 'Robotics Summer Camp for Kids', description: 'Kids build real robots from scratch using Arduino, sensors and actuators. They program the robots to navigate mazes, detect obstacles and complete missions — no experience needed.', projects: ['Line-following robot', 'Obstacle-avoiding bot', 'Robotic arm', 'Sumo wrestling bot', 'Smart home sensor'] },
  'coding':             { name: 'Coding & Python',        icon: '💻', headline: 'Coding Summer Camp for Kids',  description: 'Children learn Python programming and Scratch visual coding. They build real apps, games, and automation scripts — going from "Hello World" to fully-working projects in just 10 days.', projects: ['Python quiz game', 'Scratch animation', 'Password generator', 'Weather app', 'Mini calculator'] },
  'ai':                 { name: 'AI & Machine Learning',  icon: '🧠', headline: 'AI Summer Camp for Kids',      description: 'Children explore machine learning concepts, train image recognition models, and build AI-powered apps using Python. No prior experience needed — just curiosity and enthusiasm.', projects: ['Image classifier', 'AI chatbot', 'Gesture-controlled robot', 'Teachable Machine model', 'Prediction model'] },
  '3d-design':          { name: '3D Design & Printing',   icon: '🎨', headline: '3D Design Summer Camp for Kids', description: 'Kids design real 3D models using professional tools like Tinkercad and Fusion 360. They see their designs come to life on 3D printers — creating objects they can actually hold.', projects: ['Custom keychain', '3D phone stand', 'Architectural model', 'Wearable accessory', 'Miniature sculpture'] },
  'financial-literacy': { name: 'Financial Literacy',     icon: '💰', headline: 'Financial Literacy Summer Camp for Kids', description: 'Children learn about money, investing, budgeting, and entrepreneurship in an age-appropriate, hands-on format. They pitch business ideas and run simulated markets.', projects: ['Business plan pitch', 'Stock market simulation', 'Budget planner', 'Mini startup idea', 'Investment calculator'] },
};

const AGE_GROUPS = {
  '4-6':   { label: '4 – 6 Years',  headline: 'Summer Camp for 4–6 Year Olds',    campGroup: 'Little Explorers',   description: 'Our youngest campers explore block coding, basic electronics, and simple robotics through play-based learning. Every activity is designed for small fingers and big curiosity.', skills: ['Block coding with Scratch Jr', 'LED circuits & sensors', 'Simple robotic toy kits', 'Creative building challenges'] },
  '6-8':   { label: '6 – 8 Years',  headline: 'Summer Camp for 6–8 Year Olds',    campGroup: 'Little Explorers',   description: 'Children aged 6–8 dive into Scratch coding, build their first circuits, and assemble beginner robots. They leave with real projects they built themselves — and a lot of pride.', skills: ['Scratch visual coding', 'Basic Arduino circuits', 'Sensor-driven projects', 'Simple automation'] },
  '8-10':  { label: '8 – 10 Years', headline: 'Summer Camp for 8–10 Year Olds',   campGroup: 'Tech Creators',      description: 'Eight to ten year olds tackle Python basics, robotics kits, and their first AI experiments. This is where curiosity turns into real, demonstrable skills.', skills: ['Python programming intro', 'Robotics kit assembly', 'AI introduction experiments', '3D modelling basics'] },
  '10-12': { label: '10 – 12 Years',headline: 'Summer Camp for 10–12 Year Olds',  campGroup: 'Tech Creators',      description: 'Pre-teens in this group write real Python code, build Arduino robots, and explore machine learning — at a level that matches their growing capabilities and ambition.', skills: ['Python & data structures', 'Arduino robotics projects', 'Machine learning basics', '3D Design in Tinkercad'] },
  '12-14': { label: '12 – 14 Years',headline: 'Summer Camp for 12–14 Year Olds',  campGroup: 'Future Innovators',  description: 'Teenagers tackle advanced robotics, AI model training, and 3D Design for printing. They\'re ready for serious tech skills that go beyond school curriculum.', skills: ['Advanced Python & APIs', 'AI/ML model training', '3D printing workflow', 'Entrepreneurship fundamentals'] },
  '14-16': { label: '14 – 16 Years',headline: 'Summer Camp for Teenagers 14–16',  campGroup: 'Future Innovators',  description: 'High schoolers work on college-portfolio worthy projects: AI models, custom robots, and tech startup pitches. Build skills that impress university admissions committees.', skills: ['Advanced AI & ML projects', 'Custom robot design & code', '3D Design & printing', 'Startup pitch & business plan'] },
};

const MEDIA = ['Shark Tank India', 'Kaun Banega Crorepati', 'NDTV', 'Times of India', 'Economic Times', 'India Today', 'YourStory', 'Inc42'];

const STATS = [
  { num: '12,000+', label: 'Students Trained' },
  { num: '500+',    label: 'Schools Partnered' },
  { num: '4.9★',   label: 'Parent Rating' },
  { num: '6+',      label: 'Years Experience' },
];

const FAQS = [
  { q: 'What is the age range for the summer camp?', a: 'Our camp is designed for children aged 4 to 16 years. We have three age groups: Little Explorers (4–8), Tech Creators (9–12), and Future Innovators (13–16). Each group has age-appropriate curriculum and activities.' },
  { q: 'How many students are in each batch?', a: 'We cap each batch at 15 students to ensure every child receives personalised attention from our educators. This small-batch model is a core part of the OLL experience.' },
  { q: 'What is included in the ₹1,999 fee?', a: 'Everything — all robotics kits and materials, access to our 3D printers, course workbooks, a project certificate from STEM.org, and the graduation ceremony. No hidden costs.' },
  { q: 'Do children need any prior experience?', a: 'Absolutely not. Our curriculum is designed for complete beginners. Our educators are trained to meet each child at their level and build confidence from day one.' },
  { q: 'Is there an online option?', a: 'Yes! Our Online camp is a live, instructor-led Zoom experience with physical kits shipped to your home before the camp begins. Children across India (and abroad) can join.' },
  { q: 'What certification do children receive?', a: 'Every child receives a STEM.org-accredited certificate of completion. This is internationally recognised and can be added to school portfolios and college applications.' },
];

// ── Styles ────────────────────────────────────────────────────────────────────

const JB = "'JetBrains Mono', monospace";
const NU = "'Nunito Sans', sans-serif";

const css = `
  .seo-card { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 1.5rem; position: relative; transition: border-color 0.25s; }
  .seo-card:hover { border-color: rgba(0,229,255,0.25); }
  .seo-cta { display:inline-flex; align-items:center; gap:8px; background:linear-gradient(135deg,#D63031 0%,#c02626 100%); color:#fff; font-family:${JB}; font-weight:700; font-size:1rem; padding:0.9rem 2rem; border-radius:8px; text-decoration:none; transition:transform 0.18s,box-shadow 0.18s; }
  .seo-cta:hover { transform:translateY(-2px); box-shadow:0 8px 32px rgba(214,48,49,0.35); }
  .seo-cta-ghost { display:inline-flex; align-items:center; gap:8px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.12); color:#CBD5E1; font-family:${JB}; font-weight:700; font-size:0.95rem; padding:0.9rem 2rem; border-radius:8px; text-decoration:none; transition:border-color 0.2s,color 0.2s; }
  .seo-cta-ghost:hover { border-color:rgba(255,255,255,0.3); color:#F8FAFC; }
  .cert-badge { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:2rem; display:flex; flex-direction:column; align-items:center; text-align:center; transition:border-color 0.3s,box-shadow 0.3s; }
  .cert-badge:hover { border-color:rgba(0,229,255,0.3); box-shadow:0 0 40px rgba(0,229,255,0.08); }
  .media-pill { background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:999px; padding:0.5rem 1.2rem; font-family:${JB}; font-size:0.82rem; font-weight:700; color:#CBD5E1; white-space:nowrap; transition:border-color 0.2s,color 0.2s; }
  .media-pill:hover { border-color:rgba(0,229,255,0.3); color:#00E5FF; }
  .faq-item { border-bottom:1px solid rgba(255,255,255,0.07); }
  .faq-btn { width:100%; display:flex; justify-content:space-between; align-items:center; padding:1.25rem 0; background:none; border:none; cursor:pointer; text-align:left; }
  .link-pill { display:flex; align-items:center; gap:6px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:8px; padding:0.6rem 1rem; text-decoration:none; color:#CBD5E1; font-size:0.88rem; transition:border-color 0.2s,color 0.2s; }
  .link-pill:hover { border-color:rgba(0,229,255,0.3); color:#00E5FF; }
`;

// ── FAQ Accordion ─────────────────────────────────────────────────────────────
function FAQ() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      {FAQS.map((f, i) => (
        <div key={i} className="faq-item">
          <button className="faq-btn" onClick={() => setOpen(open === i ? null : i)}>
            <span style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.95rem', color: '#F0F4F8', paddingRight: '1rem' }}>{f.q}</span>
            {open === i ? <ChevronUp size={18} style={{ color: '#00E5FF', flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: '#64748B', flexShrink: 0 }} />}
          </button>
          {open === i && (
            <p style={{ color: '#94A3B8', lineHeight: 1.7, fontSize: '0.95rem', paddingBottom: '1.25rem', margin: 0, fontFamily: NU }}>{f.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SummerCampSEOPage() {
  const { type, slug } = useParams();

  const locData   = type === 'location' ? LOCATIONS[slug]  : null;
  const skillData = type === 'skill'    ? SKILLS[slug]     : null;
  const ageData   = type === 'age'      ? AGE_GROUPS[slug] : null;

  if (!locData && !skillData && !ageData) {
    return (
      <div style={{ background: '#080C16', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: NU, color: '#F8FAFC' }}>
        <h1>Page not found</h1>
        <Link to="/summer-camp" style={{ color: '#00E5FF' }}>← Back to Summer Camp</Link>
      </div>
    );
  }

  const pageTitle = locData
    ? `Robotics & AI Summer Camp in ${locData.fullName} 2026 | OLL`
    : skillData
    ? `${skillData.headline} 2026 | Mumbai & Online | OLL`
    : `${ageData.headline} | Robotics, AI & Coding 2026 | OLL`;

  const metaDesc = locData
    ? `Join OLL's 10-day future-skills summer camp at our ${locData.name} center, ${locData.city}. Robotics, Coding, AI & 3D Design for ages 4–16. STEM.org certified. Weekday & weekend batches. May 2026 — limited seats.`
    : skillData
    ? `India's best ${skillData.name} summer camp for kids. 10-day intensive hands-on program in Mumbai & Online. Build real projects. Ages 4–16. STEM.org certified. As seen on Shark Tank India & KBC. May 2026.`
    : `${ageData.campGroup} summer camp for kids aged ${ageData.label}. Robotics, Coding, AI & 3D Design — 10 days of hands-on tech learning in Mumbai & Online. STEM.org certified. May 2026.`;

  const canonical = `https://oll.co/summer-camp/${type}/${slug}`;

  const h1 = locData ? `Summer Camp in ${locData.name}` : skillData ? skillData.headline : ageData.headline;
  const intro = locData
    ? `OLL's 10-day tech summer camp is at ${locData.name}, ${locData.city}. Kids aged 4–16 build robots, write Python code, explore AI, and design in 3D — in 10 action-packed days. May 2026 batches. Limited to 15 seats per batch.`
    : skillData ? skillData.description : ageData.description;

  const learnItems = locData
    ? ['Arduino Robotics', 'Python & AI Coding', '3D Design & Printing', 'Financial Literacy', 'Entrepreneurship Pitch']
    : skillData ? skillData.projects : ageData.skills;

  const learnHeading = locData
    ? `What Kids Learn at the ${locData.name} Camp`
    : skillData ? 'Real Projects Your Child Will Build' : `Skills Taught for Ages ${ageData.label}`;

  return (
    <div style={{ background: '#080C16', minHeight: '100vh', fontFamily: NU, color: '#F0F4F8' }}>
      <style>{css}</style>

      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={metaDesc} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/ko80g3wd_images.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={metaDesc} />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationEvent",
          "name": h1 + ' 2026',
          "description": metaDesc,
          "startDate": "2026-05-01",
          "endDate": "2026-05-31",
          "eventStatus": "https://schema.org/EventScheduled",
          "eventAttendanceMode": locData?.name === 'Online' ? "https://schema.org/OnlineEventAttendanceMode" : "https://schema.org/OfflineEventAttendanceMode",
          "location": locData ? { "@type": "Place", "name": `OLL Center – ${locData.name}`, "address": { "@type": "PostalAddress", "streetAddress": locData.address, "addressLocality": locData.city, "addressRegion": "Maharashtra", "addressCountry": "IN" } } : { "@type": "Place", "name": "OLL – Multiple Centers in Mumbai & Online" },
          "organizer": { "@type": "Organization", "name": "OLL – Online Live Learning", "url": "https://oll.co", "logo": "https://oll.co/favicon.png" },
          "offers": { "@type": "Offer", "price": "1999", "priceCurrency": "INR", "url": "https://oll.co/summer-camp/book", "availability": "https://schema.org/LimitedAvailability" },
          "audience": { "@type": "Audience", "audienceType": "Children aged 4–16" }
        })}</script>
      </Helmet>

      {/* ── Navbar ── */}
      <nav style={{ padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.07)', position: 'sticky', top: 0, background: 'rgba(8,12,22,0.92)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <img
            src="https://customer-assets.emergentagent.com/job_oll-skill-edu/artifacts/wzn0gh6k_OLL-horizontal-logo-white.png"
            alt="OLL – Learn Future Skills"
            style={{ height: 36, width: 'auto' }}
          />
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link to="/summer-camp" style={{ color: '#94A3B8', fontSize: '0.88rem', textDecoration: 'none' }}>← Camp Home</Link>
          <Link to="/summer-camp/book" className="seo-cta" style={{ padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>Book Now</Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ maxWidth: 900, margin: '0 auto', padding: '5rem 2rem 3.5rem', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', borderRadius: 999, padding: '0.35rem 1rem', fontSize: '0.78rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, letterSpacing: '0.06em', marginBottom: '1.5rem' }}>
          <Star size={11} /> Summer Camp 2026 · STEM.org Certified · As Seen on Shark Tank India
        </div>
        <h1 style={{ fontFamily: JB, fontWeight: 800, fontSize: 'clamp(1.9rem, 4vw, 3.2rem)', lineHeight: 1.1, color: '#F8FAFC', marginBottom: '1.2rem' }}>{h1}</h1>
        <p style={{ fontSize: '1.1rem', color: '#94A3B8', lineHeight: 1.75, maxWidth: 680, margin: '0 auto 2.5rem' }}>{intro}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/summer-camp/book" className="seo-cta">Book Your Spot — ₹1,999 <ArrowRight size={16} /></Link>
          <Link to="/summer-camp" className="seo-cta-ghost">View Full Camp Details</Link>
        </div>
      </section>

      {/* ── Quick Stats ── */}
      <section style={{ background: 'rgba(0,229,255,0.03)', borderTop: '1px solid rgba(0,229,255,0.08)', borderBottom: '1px solid rgba(0,229,255,0.08)', padding: '2rem 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1.5rem', textAlign: 'center' }}>
          {STATS.map(s => (
            <div key={s.num}>
              <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '1.8rem', color: '#00E5FF', lineHeight: 1 }}>{s.num}</div>
              <div style={{ fontSize: '0.82rem', color: '#64748B', marginTop: '0.35rem', fontFamily: JB }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Key Info ── */}
      <section style={{ maxWidth: 1000, margin: '0 auto', padding: '4rem 2rem 2rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '4rem' }}>
          {[
            { icon: '🗓️', label: 'Duration', value: '10 Days' },
            { icon: '👦', label: 'Ages',     value: ageData ? ageData.label : '4 – 16 Years' },
            { icon: '📍', label: 'Location', value: locData ? locData.name : 'Mumbai + Online' },
            { icon: '🏫', label: 'Batch Size',value: 'Max 15 Students' },
            { icon: '🏅', label: 'Certificate',value: 'STEM.org Certified' },
            { icon: '💰', label: 'Fee',       value: '₹1,999 (All-in)' },
          ].map(item => (
            <div key={item.label} className="seo-card">
              <div style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontSize: '0.7rem', color: '#64748B', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.2rem' }}>{item.label}</div>
              <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '1rem', color: '#F8FAFC' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* ── What They Learn ── */}
        <h2 style={{ fontFamily: JB, fontWeight: 700, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#F8FAFC', marginBottom: '1.25rem' }}>{learnHeading}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginBottom: '4rem' }}>
          {learnItems.map(item => (
            <div key={item} className="seo-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '1rem 1.25rem' }}>
              <CheckCircle size={16} style={{ color: '#00E5FF', flexShrink: 0 }} />
              <span style={{ color: '#CBD5E1', fontSize: '0.95rem' }}>{item}</span>
            </div>
          ))}
        </div>

        {/* ── About OLL ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '4rem', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '0.78rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>About OLL</p>
            <h2 style={{ fontFamily: JB, fontWeight: 800, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#F8FAFC', marginBottom: '1rem', lineHeight: 1.2 }}>India's #1 Future-Skills Platform for Kids</h2>
            <p style={{ color: '#94A3B8', lineHeight: 1.75, marginBottom: '1rem', fontSize: '0.95rem' }}>
              OLL (Online Live Learning) was founded in 2018 with a single mission: make world-class tech education accessible to every Indian child. We've trained over 12,000 students across 500+ schools, running programs in Robotics, AI, Coding, 3D Design, and Financial Literacy.
            </p>
            <p style={{ color: '#94A3B8', lineHeight: 1.75, marginBottom: '1.5rem', fontSize: '0.95rem' }}>
              Our Summer Camps are an intensive 10-day version of what we do year-round — distilled into the most fun, hands-on, transformative experience your child will have this summer.
            </p>
            <Link to="/summer-camp/book" className="seo-cta">Secure a Spot — ₹1,999 <ArrowRight size={16} /></Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {['STEM.org Accredited', 'UNESCO Aligned', 'IIT-Trained Educators', 'Max 15 Kids/Batch', 'Hands-on Projects', 'Certificate Included'].map(f => (
              <div key={f} className="seo-card" style={{ padding: '1rem', textAlign: 'center' }}>
                <CheckCircle size={16} style={{ color: '#00E5FF', margin: '0 auto 0.5rem' }} />
                <div style={{ fontSize: '0.82rem', fontFamily: JB, fontWeight: 700, color: '#CBD5E1', lineHeight: 1.3 }}>{f}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Location-specific nearby areas ── */}
        {locData && (
          <div className="seo-card" style={{ marginBottom: '4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem' }}>
              <MapPin size={16} style={{ color: '#00E5FF' }} />
              <span style={{ fontFamily: JB, fontWeight: 700, color: '#F8FAFC' }}>Center Address</span>
            </div>
            <p style={{ color: '#94A3B8', margin: '0 0 0.5rem', lineHeight: 1.6 }}>{locData.address}</p>
            <p style={{ color: '#64748B', margin: 0, fontSize: '0.85rem' }}>Convenient for families in {locData.nearby.join(', ')}</p>
          </div>
        )}

        {/* ── Certifications ── */}
        <div style={{ marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem', textAlign: 'center' }}>globally.recognised</p>
          <h2 style={{ fontFamily: JB, fontWeight: 700, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#F8FAFC', textAlign: 'center', marginBottom: '0.75rem' }}>Certified by the World's Best</h2>
          <p style={{ color: '#64748B', textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', maxWidth: 520, margin: '0 auto 2rem' }}>
            Our curriculum is accredited by STEM.org and aligned with UNESCO's global education framework.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            <div className="cert-badge" style={{ borderColor: 'rgba(230,85,13,0.25)' }}>
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/ko80g3wd_images.png"
                alt="STEM.org Accredited Educational Experience" loading="lazy"
                style={{ width: 110, height: 110, objectFit: 'contain', marginBottom: '1rem', borderRadius: 8 }} />
              <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.6rem', color: '#E6550D', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>STEM.ORG</div>
              <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', color: '#F0F4F8', marginBottom: '0.5rem', lineHeight: 1.3 }}>Accredited Educational Experience™</div>
              <p style={{ color: '#64748B', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>Every session is certified by STEM.org — ensuring a world-class, hands-on learning experience.</p>
            </div>
            <div className="cert-badge" style={{ borderColor: 'rgba(30,80,180,0.25)' }}>
              <img src="https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/cqfv2iw2_USFUCA%20logo%203.jpg"
                alt="UNESCO USFUCA Recognised" loading="lazy"
                style={{ width: 140, height: 90, objectFit: 'contain', marginBottom: '1rem', borderRadius: 8 }} />
              <div style={{ fontFamily: JB, fontWeight: 700, fontSize: '0.6rem', color: '#3264CC', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '0.35rem' }}>UNESCO ALIGNED</div>
              <div style={{ fontFamily: JB, fontWeight: 800, fontSize: '0.95rem', color: '#F0F4F8', marginBottom: '0.5rem', lineHeight: 1.3 }}>UNESCO USFUCA Recognised Program</div>
              <p style={{ color: '#64748B', fontSize: '0.82rem', lineHeight: 1.6, margin: 0 }}>Curriculum designed in alignment with UNESCO's global framework for 21st-century education.</p>
            </div>
          </div>
        </div>

        {/* ── As Seen On ── */}
        <div style={{ marginBottom: '4rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#64748B', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', textAlign: 'center', marginBottom: '1.25rem' }}>As Seen On</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', justifyContent: 'center' }}>
            {MEDIA.map(m => <span key={m} className="media-pill">{m}</span>)}
          </div>
          <p style={{ color: '#475569', textAlign: 'center', fontSize: '0.85rem', marginTop: '1rem' }}>OLL has been featured on India's top media platforms, recognised on Shark Tank India and Kaun Banega Crorepati for our work in future-skills education.</p>
        </div>

        {/* ── CTA Banner ── */}
        <div style={{ background: 'linear-gradient(135deg, rgba(214,48,49,0.1) 0%, rgba(0,229,255,0.05) 100%)', border: '1px solid rgba(214,48,49,0.2)', borderRadius: 16, padding: '3rem 2rem', textAlign: 'center', marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: JB, fontWeight: 800, fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: '#F8FAFC', marginBottom: '0.75rem' }}>Limited to 15 Seats Per Batch</h2>
          <p style={{ color: '#94A3B8', marginBottom: '2rem', lineHeight: 1.65, maxWidth: 500, margin: '0 auto 2rem', fontSize: '0.95rem' }}>
            May 2026 batches are filling up fast. Secure your child's spot today — full fee refund if you change your mind before the camp starts.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/summer-camp/book" className="seo-cta">Book Now — ₹1,999 <ArrowRight size={16} /></Link>
            <Link to="/summer-camp" className="seo-cta-ghost">Learn More</Link>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div style={{ marginBottom: '4rem' }}>
          <h2 style={{ fontFamily: JB, fontWeight: 700, fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)', color: '#F8FAFC', marginBottom: '1.5rem' }}>Frequently Asked Questions</h2>
          <FAQ />
        </div>

        {/* ── Related Pages ── */}
        <div style={{ marginBottom: '3rem' }}>
          <h3 style={{ fontFamily: JB, fontWeight: 700, color: '#F8FAFC', fontSize: '1rem', marginBottom: '1.5rem' }}>Explore More Summer Camp Options</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
            {type !== 'location' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>By Location</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {Object.entries(LOCATIONS).map(([s, d]) => (
                    <Link key={s} to={`/summer-camp/location/${s}`} className="link-pill"><MapPin size={12} style={{ color: '#00E5FF' }} />{d.fullName}</Link>
                  ))}
                </div>
              </div>
            )}
            {type !== 'skill' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>By Skill</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {Object.entries(SKILLS).map(([s, d]) => (
                    <Link key={s} to={`/summer-camp/skill/${s}`} className="link-pill"><span style={{ fontSize: '0.9rem' }}>{d.icon}</span>{d.name}</Link>
                  ))}
                </div>
              </div>
            )}
            {type !== 'age' && (
              <div>
                <p style={{ fontSize: '0.72rem', color: '#00E5FF', fontFamily: JB, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>By Age Group</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {Object.entries(AGE_GROUPS).map(([s, d]) => (
                    <Link key={s} to={`/summer-camp/age/${s}`} className="link-pill"><Users size={12} style={{ color: '#00E5FF' }} />Ages {d.label}</Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: '1rem' }}>
          <Link to="/summer-camp" style={{ color: '#475569', textDecoration: 'none', fontSize: '0.88rem' }}>← View full summer camp details at OLL</Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
