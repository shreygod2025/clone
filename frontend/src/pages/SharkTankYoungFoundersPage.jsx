import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Users, GraduationCap, Lightbulb, UserCheck, Flag, FileText, Info, ChevronDown, Phone, Mail } from 'lucide-react';
import { STI, STI_ACCENTS, STI_BG, STI_LOGO, STI_YF_LOGO, STI_CONTACT, STI_DISPLAY_FONT } from '../components/sharkTankTheme';

const OFFICIAL_URL = 'https://sharktank.sonyliv.com/youngfounder/oll';
const ST_LOGO = 'https://prd-emss3.sonyliv.com/Creatives/ST/Shark-Tank-India-S6-Logo.png';
const YF_LOGO = 'https://prd-emss3.sonyliv.com/Creatives/ST/YOUNF-FOUNDERS-SPECIAL-_PNG.png';
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const INFOGRAPHIC = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/bbe3d9a70d71debb_image.png';

const PAGE_URL = 'https://oll.co/shark-tank-india-season-6-young-founders-special';
const META_TITLE = 'Shark Tank India Young Founders Special 2026 — Eligibility, Dates & Info | OLL';
const META_DESC = 'Everything you need to know about the Shark Tank India Season 6 Young Founders Special. Eligibility (ages 6–15), key dates (registrations 12 Oct – 11 Nov 2026), and the official registration route. Information page by OLL.';

const FACTS = [
  { icon: Flag, label: 'Initiative', value: 'Shark Tank India Season 6 — Young Founders Special' },
  { icon: Users, label: 'Eligible age', value: '6 to 15 years (as of 12 October 2026)' },
  { icon: GraduationCap, label: 'Citizenship', value: 'Indian' },
  { icon: Calendar, label: 'Registrations open', value: '12 October 2026' },
  { icon: Calendar, label: 'Registrations close', value: '11 November 2026' },
  { icon: Calendar, label: 'Selection period', value: '12 October – 23 December 2026' },
  { icon: Info, label: 'Application fee', value: 'Free' },
  { icon: FileText, label: 'Registration route', value: 'Online via SonyLIV' },
];

const ELIGIBILITY = [
  { icon: Users, title: 'Age', body: 'Between 6 and 15 years old as of 12 October 2026.' },
  { icon: Flag, title: 'Citizenship', body: 'Must be an Indian citizen.' },
  { icon: GraduationCap, title: 'School status', body: 'School-going students, homeschooled children, and school dropouts are eligible, subject to the other stated requirements.' },
  { icon: Lightbulb, title: 'Business stage', body: 'Applicants can apply with just a business idea. An established company or existing revenue is not mandatory.' },
  { icon: UserCheck, title: 'Parent or legal guardian', body: 'Because applicants are minors, their parent or legal guardian must complete the registration on their behalf.' },
];

const FAQS = [
  { q: 'What is the Shark Tank India Young Founders Special?', a: 'It\'s an initiative under Shark Tank India Season 6 that brings the entrepreneurial platform to younger aspiring founders aged 6 to 15. Eligible children can apply with a business idea or an early-stage venture they want to develop.' },
  { q: 'Who is eligible to apply?', a: 'Indian citizens aged 6–15 years as of 12 October 2026. School-going students, homeschooled children, and school dropouts are all eligible, subject to the other requirements in the official FAQs. The applicant\'s parent or legal guardian must complete the registration.' },
  { q: 'Do I need to already have a running business?', a: 'No. According to the official FAQs, applicants can apply with just a business idea — including one that is still at the pre-revenue stage. An established company is not mandatory.' },
  { q: 'When do registrations open and close?', a: 'Registrations opened on 12 October 2026 and are scheduled to close on 11 November 2026. Dates may change, so always verify on the official SonyLIV registration page.' },
  { q: 'Is there an application fee?', a: 'No. Applications are free of charge.' },
  { q: 'Where do I register?', a: 'All applications are submitted online through SonyLIV\'s official registration page at sharktank.sonyliv.com/youngfounder/oll.' },
  { q: 'What happens after I register?', a: 'The selection process is scheduled to run between 12 October and 23 December 2026. The organisers reserve the right to change timelines, so applicants should keep an eye on the official platform for updates.' },
  { q: 'Is OLL affiliated with Shark Tank India?', a: 'No. OLL is sharing this information as a community resource for young founders and their families. "Shark Tank India" and related marks belong to Sony Pictures Networks India / SonyLIV. For authoritative information, refer to the official FAQs and registration page.' },
];

function useDocumentMeta() {
  useEffect(() => {
    document.title = META_TITLE;
    const upsert = (sel, attr, val) => {
      let el = document.querySelector(sel);
      if (!el) {
        el = document.createElement('meta');
        const [k, v] = sel.match(/\[(.+?)="(.+?)"\]/).slice(1, 3);
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, val);
    };
    upsert('meta[name="description"]', 'content', META_DESC);
    upsert('meta[property="og:title"]', 'content', META_TITLE);
    upsert('meta[property="og:description"]', 'content', META_DESC);
    upsert('meta[property="og:type"]', 'content', 'article');
    upsert('meta[property="og:url"]', 'content', PAGE_URL);
    upsert('meta[property="og:image"]', 'content', ST_LOGO);
    upsert('meta[name="twitter:card"]', 'content', 'summary_large_image');
    upsert('meta[name="twitter:title"]', 'content', META_TITLE);
    upsert('meta[name="twitter:description"]', 'content', META_DESC);
    upsert('meta[name="twitter:image"]', 'content', ST_LOGO);
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.setAttribute('rel', 'canonical'); document.head.appendChild(canonical); }
    canonical.setAttribute('href', PAGE_URL);
    const ldId = 'sti6-yf-jsonld';
    document.getElementById(ldId)?.remove();
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.id = ldId;
    ld.textContent = JSON.stringify([
      {
        '@context': 'https://schema.org', '@type': 'Event',
        name: 'Shark Tank India Season 6 — Young Founders Special',
        description: META_DESC,
        startDate: '2026-10-12', endDate: '2026-11-11',
        eventStatus: 'https://schema.org/EventScheduled',
        eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
        location: { '@type': 'VirtualLocation', url: OFFICIAL_URL },
        image: [ST_LOGO, YF_LOGO],
        organizer: { '@type': 'Organization', name: 'Shark Tank India / SonyLIV', url: 'https://sharktank.sonyliv.com' },
        offers: { '@type': 'Offer', url: OFFICIAL_URL, price: '0', priceCurrency: 'INR', availability: 'https://schema.org/InStock', validFrom: '2026-10-12' },
      },
      {
        '@context': 'https://schema.org', '@type': 'FAQPage',
        mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://oll.co' },
          { '@type': 'ListItem', position: 2, name: 'Shark Tank India Young Founders Special', item: PAGE_URL },
        ],
      },
    ]);
    document.head.appendChild(ld);
    return () => document.getElementById(ldId)?.remove();
  }, []);
}

const H2 = ({ children, color = STI.ink }) => (
  <h2 style={{ fontFamily: STI_DISPLAY_FONT, fontWeight: 400, textTransform: 'uppercase', fontSize: 'clamp(2rem, 4vw, 3rem)', lineHeight: 1.02, letterSpacing: '0.01em', color, margin: '10px 0 0' }}>{children}</h2>
);

const Contact = ({ dark }) => (
  <div data-testid="stf-contact" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.95rem', color: dark ? '#fff' : STI.ink }}>
    <span>For queries:</span>
    <a href={`tel:+91${STI_CONTACT.phone}`} data-testid="stf-contact-phone" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: dark ? STI.yellow : STI.blue, textDecoration: 'none' }}><Phone className="w-4 h-4" />{STI_CONTACT.phone}</a>
    <a href={`mailto:${STI_CONTACT.email}`} data-testid="stf-contact-email" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: dark ? STI.yellow : STI.blue, textDecoration: 'none' }}><Mail className="w-4 h-4" />{STI_CONTACT.email}</a>
  </div>
);

export default function SharkTankYoungFoundersPage() {
  useDocumentMeta();
  const [openFaq, setOpenFaq] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="stf-page" data-testid="shark-tank-yf-page">
      <style>{`
        .stf-page { font-family: 'Manrope', 'Proxima Nova', 'Montserrat', sans-serif; color: ${STI.ink}; background: ${STI.blue}; }
        .stf-pillnav { position: fixed; top: 0; left: 0; right: 0; z-index: 60; padding: 12px 12px 0; }
        .stf-pillnav-inner { max-width: 1180px; margin: 0 auto; background: rgba(255,255,255,0.95); -webkit-backdrop-filter: saturate(180%) blur(16px); backdrop-filter: saturate(180%) blur(16px); border: 1px solid rgba(255,255,255,0.6); box-shadow: 0 20px 44px rgba(3,20,80,0.35); border-radius: 999px; display: flex; align-items: center; justify-content: space-between; padding: 8px 10px 8px 20px; }
        .stf-pillnav-inner img { display: block; height: 34px; width: auto; }
        .stf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px; border-radius: 999px; font-weight: 800; font-size: 0.78rem; letter-spacing: 0.06em; text-transform: uppercase; transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s; cursor: pointer; text-decoration: none; border: none; }
        .stf-btn.primary { background: ${STI.blue}; color: #fff; box-shadow: 0 12px 22px rgba(11,63,176,0.35); }
        .stf-btn.primary:hover { background: ${STI.deep}; transform: translateY(-1px); }
        .stf-btn.ghost-dark { background: transparent; color: ${STI.ink}; border: 1.5px solid rgba(10,31,92,0.25); }
        .stf-btn.ghost-dark:hover { background: ${STI.ink}; color: #fff; }
        .stf-btn.gold { background: ${STI.yellow}; color: ${STI.ink}; box-shadow: 0 14px 28px rgba(255,225,77,0.35); }
        .stf-btn.gold:hover { background: #fff; transform: translateY(-2px); }
        .stf-btn.ghost-light { background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.45); }
        .stf-btn.ghost-light:hover { background: rgba(255,255,255,0.12); }
        .stf-eyebrow { font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.72rem; }
        .stf-hero-logos { display: flex; align-items: center; justify-content: center; gap: clamp(1.25rem, 4vw, 3.5rem); flex-wrap: wrap; }
        .stf-hero-logos img { display: block; width: auto; filter: drop-shadow(0 22px 36px rgba(0,0,0,0.4)); animation: stf-rise 0.7s ease both; }
        .stf-hero-logos .st { height: clamp(150px, 30vw, 380px); }
        .stf-hero-logos .yf { height: clamp(105px, 21vw, 270px); animation-delay: 0.15s; }
        .stf-bulb { position: relative; margin: 2.5rem auto 0; max-width: 760px; padding: 2.25rem 1.5rem; border-radius: 48% 48% 36% 36% / 60% 60% 40% 40%; background: radial-gradient(ellipse at 50% 45%, #FFFDF0 0%, #FFF4B8 45%, rgba(255,225,77,0.55) 70%, transparent 100%); box-shadow: 0 0 120px 30px rgba(255,236,150,0.35); animation: stf-rise 0.7s 0.3s ease both; }
        .stf-bulb-big { font-family: ${STI_DISPLAY_FONT}; text-transform: uppercase; color: #1544C0; line-height: 0.95; margin: 0; font-weight: 400; }
        .stf-card { padding: 22px; background: #fff; border-radius: 18px; border: 2px solid ${STI.ink}; box-shadow: 6px 6px 0 ${STI.ink}; transition: transform 0.2s, box-shadow 0.2s; }
        .stf-card:hover { transform: translate(-2px, -2px); box-shadow: 8px 8px 0 ${STI.ink}; }
        .stf-faq-item { border: 2px solid rgba(255,255,255,0.18); border-radius: 16px; background: rgba(255,255,255,0.08); -webkit-backdrop-filter: blur(14px); backdrop-filter: blur(14px); transition: border-color 0.2s, background-color 0.2s; }
        .stf-faq-item.open { border-color: ${STI.yellow}; background: rgba(255,255,255,0.14); }
        .stf-faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.3rem; background: transparent; border: none; cursor: pointer; text-align: left; font-weight: 800; color: #fff; font-size: 1rem; font-family: inherit; }
        .stf-faq-a { padding: 0 1.3rem 1.2rem; color: rgba(255,255,255,0.85); line-height: 1.65; font-size: 0.95rem; }
        @keyframes stf-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
        @keyframes stf-pulse { 0%,100% { opacity:1; } 50% { opacity:.4; } }
        @media (max-width: 640px) {
          .stf-pillnav { padding: 8px 8px 0; }
          .stf-pillnav-inner { padding: 6px 6px 6px 12px; }
          .stf-pillnav-inner img { height: 26px; }
          .stf-btn { padding: 8px 12px; font-size: 0.66rem; gap: 4px; }
          .stf-btn .stf-hide-sm { display: none; }
          .stf-bulb { border-radius: 32px; }
          .stf-date-row { grid-template-columns: 36px 1fr !important; }
          .stf-date-row > div:last-child { grid-column: 2; }
        }
      `}</style>

      <nav className="stf-pillnav" aria-label="Primary navigation" data-testid="stf-pillnav">
        <div className="stf-pillnav-inner">
          <Link to="/" aria-label="OLL Home" data-testid="stf-nav-oll"><img src={OLL_LOGO} alt="OLL" /></Link>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/" className="stf-btn ghost-dark" data-testid="stf-nav-home"><span className="stf-hide-sm">OLL </span>Home</Link>
            <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn primary" data-testid="stf-nav-apply">
              Register Now <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Poster hero ── */}
      <section data-testid="stf-hero" style={{ ...STI_BG, padding: '8rem 1.25rem 5rem', textAlign: 'center', color: '#fff' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <h1 style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>Shark Tank India Season 6 — Young Founders Special</h1>
          <div className="stf-hero-logos">
            <img className="st" src={STI_LOGO} alt="Shark Tank India Season 6" data-testid="stf-hero-st-logo" />
            <img className="yf" src={STI_YF_LOGO} alt="Young Founders Special" data-testid="stf-hero-yf-logo" />
          </div>

          <div className="stf-bulb" data-testid="stf-registration-open">
            <p className="stf-bulb-big" style={{ fontSize: 'clamp(2.8rem, 8vw, 6rem)' }}>Registration Open</p>
            <p className="stf-bulb-big" style={{ fontSize: 'clamp(1.8rem, 4.6vw, 3.4rem)', marginTop: 10 }}>12<sup style={{ fontSize: '0.45em' }}>th</sup> Oct – 11<sup style={{ fontSize: '0.45em' }}>th</sup> Nov</p>
            <p className="stf-bulb-big" style={{ fontSize: 'clamp(1.3rem, 3.2vw, 2.3rem)', marginTop: 8, color: STI.deep }}>Ages 6 – 15 Years</p>
          </div>

          <div style={{ maxWidth: 720, margin: '2.75rem auto 0' }}>
            <h2 style={{ fontFamily: STI_DISPLAY_FONT, fontWeight: 400, textTransform: 'uppercase', fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)', color: STI.yellow, margin: 0 }}>An Exciting Opportunity for Our School&apos;s Students</h2>
            <p data-testid="stf-hero-desc" style={{ marginTop: '1rem', color: 'rgba(255,255,255,0.9)', fontSize: '1.05rem', lineHeight: 1.7 }}>
              Young founders with innovative business ideas or existing ventures can now apply for a chance to present them on national television — whether you dream of building something of your own, have already started a venture, or are turning your ideas into reality.
            </p>
            <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
              <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn gold" style={{ padding: '14px 26px', fontSize: '0.88rem' }} data-testid="stf-hero-apply">
                Register Now <ArrowUpRight className="w-4 h-4" />
              </a>
              <a href="#eligibility" className="stf-btn ghost-light" style={{ padding: '14px 26px', fontSize: '0.88rem' }} data-testid="stf-hero-eligibility">Who can apply?</a>
            </div>
            <div style={{ marginTop: '1.75rem' }}><Contact dark /></div>
          </div>
        </div>
      </section>

      {/* ── What is it ── */}
      <section style={{ padding: '5rem 1.25rem', background: STI.cream }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', alignItems: 'start' }}>
          <div>
            <span className="stf-eyebrow" style={{ color: STI.orange }}>About the Initiative</span>
            <H2>What is the <span style={{ color: STI.blue }}>Young Founders</span> Special?</H2>
            <div style={{ marginTop: 18, display: 'flex', gap: 6 }}>
              {STI_ACCENTS.map(c => <span key={c} style={{ width: 34, height: 8, borderRadius: 4, background: c, border: `1.5px solid ${STI.ink}` }} />)}
            </div>
          </div>
          <div style={{ color: '#26325A', lineHeight: 1.75, fontSize: '1rem' }} data-testid="stf-about">
            <p style={{ margin: 0 }}>A Season 6 special that gives young founders aged 6–15 the chance to pitch their business idea to the Sharks on national TV — no established company needed.</p>
            {aboutOpen && (
              <div data-testid="stf-about-details">
                <p style={{ marginTop: 14 }}>Shark Tank India is a business reality show where entrepreneurs present their businesses to a panel of investors — the Sharks. Founders explain what they are building, the problem they solve, their customers, and how they plan to grow. The Sharks evaluate these opportunities and may offer financial support under agreed terms.</p>
                <p style={{ marginTop: 14 }}>The <strong>Young Founders Special for Season 6</strong> brings this platform to younger aspiring founders. Eligible children with a business idea or an early-stage venture they want to develop are welcome to apply.</p>
                <p style={{ marginTop: 14 }}>According to the official FAQs, applicants can apply with just an idea, including one that is still at the pre-revenue stage.</p>
              </div>
            )}
            <button type="button" onClick={() => setAboutOpen(o => !o)} aria-expanded={aboutOpen} data-testid="stf-about-read-more"
              style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', color: STI.blue, fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: 'inherit' }}>
              {aboutOpen ? 'Read less' : 'Read more'}
              <ChevronDown className="w-4 h-4" style={{ transition: 'transform 0.2s', transform: aboutOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Who can apply ── */}
      <section id="eligibility" style={{ ...STI_BG, padding: '5rem 1.25rem' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: STI.yellow }}>Eligibility</span>
          <H2 color="#fff">Who can <span style={{ color: STI.yellow }}>apply?</span></H2>
          <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.85)', maxWidth: 620, lineHeight: 1.65 }}>
            Before beginning the application, families should check whether the applicant meets the eligibility requirements listed on the official FAQs.
          </p>
          <img src={INFOGRAPHIC} alt="Eligibility — ages 6–15, Indian citizens, school-going/homeschooled/dropouts, idea-stage, parent registers" style={{ marginTop: 28, width: '100%', borderRadius: 20, border: `3px solid ${STI.yellow}`, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.5)' }} loading="lazy" />
          <div style={{ marginTop: 36, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
            {ELIGIBILITY.map((c, i) => {
              const accent = STI_ACCENTS[i % STI_ACCENTS.length];
              return (
                <div key={c.title} className="stf-card" data-testid={`stf-eligibility-${i}`}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: accent, border: `2px solid ${STI.ink}`, color: STI.ink, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                    <c.icon className="w-5 h-5" />
                  </div>
                  <div style={{ fontFamily: STI_DISPLAY_FONT, fontSize: '1.35rem', textTransform: 'uppercase', color: STI.ink, letterSpacing: '0.02em' }}>{c.title}</div>
                  <p style={{ marginTop: 6, fontSize: '0.9rem', color: '#3B4670', lineHeight: 1.6 }}>{c.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Important dates ── */}
      <section style={{ padding: '5rem 1.25rem', background: STI.cream }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: STI.pink }}>Important Info</span>
          <H2>Dates &amp; <span style={{ color: STI.blue }}>details</span></H2>
          <p style={{ marginTop: 12, color: '#3B4670', lineHeight: 1.65 }}>
            Registrations opened on <strong>12 October 2026</strong> and are scheduled to close on <strong>11 November 2026</strong>. The selection process runs between <strong>12 October and 23 December 2026</strong>. Organisers reserve the right to change timelines.
          </p>
          <div style={{ marginTop: 26, borderRadius: 18, overflow: 'hidden', border: `2px solid ${STI.ink}`, boxShadow: `6px 6px 0 ${STI.ink}`, background: '#fff' }}>
            {FACTS.map((f, i) => (
              <div key={f.label} className="stf-date-row" style={{ display: 'grid', gridTemplateColumns: '56px 1fr 2fr', alignItems: 'center', gap: 6, padding: '14px 20px', background: i % 2 === 0 ? '#fff' : '#F4F7FF', borderBottom: i < FACTS.length - 1 ? '1px solid #E3E8F5' : 'none' }}>
                <span style={{ width: 32, height: 32, borderRadius: 8, background: STI_ACCENTS[i % STI_ACCENTS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${STI.ink}` }}>
                  <f.icon className="w-4 h-4" style={{ color: STI.ink }} aria-hidden="true" />
                </span>
                <div style={{ fontWeight: 700, color: '#5A6488', fontSize: '0.85rem' }}>{f.label}</div>
                <div style={{ fontWeight: 800, color: STI.ink, fontSize: '0.95rem' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 22, padding: 16, background: '#FFF3B0', border: `2px solid ${STI.ink}`, borderRadius: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Info className="w-5 h-5" style={{ color: STI.ink, flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: STI.ink }}>
              <strong>Important:</strong> Dates and selection timelines may change. Always verify the latest information on the official SonyLIV registration page before applying.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ accordion ── */}
      <section style={{ ...STI_BG, padding: '5rem 1.25rem' }}>
        <div style={{ maxWidth: 840, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: STI.yellow }}>Frequently Asked</span>
          <H2 color="#fff">Common <span style={{ color: STI.yellow }}>questions</span></H2>
          <p style={{ marginTop: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 1.6 }}>
            Based on the official Shark Tank India Season 6 Young Founders Special FAQs (dated 12 October 2026).
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f, i) => (
              <div key={f.q} className={`stf-faq-item ${openFaq === i ? 'open' : ''}`} data-testid={`stf-faq-${i}`}>
                <button className="stf-faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i} data-testid={`stf-faq-toggle-${i}`}>
                  <span>{f.q}</span>
                  <ChevronDown className="w-5 h-5" style={{ flexShrink: 0, color: openFaq === i ? STI.yellow : 'rgba(255,255,255,0.6)', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
                {openFaq === i && <div className="stf-faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where to register ── */}
      <section style={{ padding: '5rem 1.25rem', background: STI.cream, textAlign: 'center' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <Lightbulb className="w-10 h-10" style={{ color: STI.orange, margin: '0 auto 8px' }} />
          <H2>Where to <span style={{ color: STI.blue }}>register</span></H2>
          <p style={{ marginTop: 16, color: '#3B4670', lineHeight: 1.7, fontSize: '1.05rem' }}>
            All applications are submitted online through SonyLIV's official registration route. There is no application fee. For any changes to timelines, rules, or eligibility, the official page is the single source of truth.
          </p>
          <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn primary" style={{ marginTop: 28, padding: '14px 28px', fontSize: '0.9rem' }} data-testid="stf-cta-bottom">
            Register Now <ArrowUpRight className="w-4 h-4" />
          </a>
          <p style={{ marginTop: 14, fontSize: 12, color: '#5A6488', wordBreak: 'break-all' }}>{OFFICIAL_URL}</p>
          <div style={{ marginTop: 26 }}><Contact /></div>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section style={{ padding: '2.5rem 1.25rem', background: STI.deep }}>
        <div style={{ maxWidth: 840, margin: '0 auto', fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.6 }}>
          <strong style={{ color: '#fff' }}>Disclaimer:</strong> OLL is sharing this information as a community resource for young founders and their families. We are not the organiser of this programme. "Shark Tank India", the Shark Tank India Season 6 logo and "Young Founders Special" belong to their respective owners (Sony Pictures Networks India / SonyLIV). Logos are used solely for informational reference. Always refer to the official Shark Tank India Young Founders Special FAQs and registration page for authoritative information. Content on this page is based on the publicly released FAQs dated 12 October 2026 and may be out of date; verify before applying.
        </div>
      </section>
    </div>
  );
}
