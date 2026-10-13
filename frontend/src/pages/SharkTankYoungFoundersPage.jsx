import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Calendar, Users, GraduationCap, Lightbulb, UserCheck, Flag, FileText, Info, ChevronDown, Sparkles } from 'lucide-react';

const OFFICIAL_URL = 'https://sharktank.sonyliv.com/youngfounder/oll';
const ST_LOGO = 'https://prd-emss3.sonyliv.com/Creatives/ST/Shark-Tank-India-S6-Logo.png';
const YF_LOGO = 'https://prd-emss3.sonyliv.com/Creatives/ST/YOUNF-FOUNDERS-SPECIAL-_PNG.png';
const OLL_LOGO = 'https://customer-assets.emergentagent.com/job_51f7c152-ec6b-4d38-953a-09a434414bba/artifacts/gdvjdp6s_OLL-horizontal-logo-1.png';
const INFOGRAPHIC = 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/bbe3d9a70d71debb_image.png';

const PAGE_URL = 'https://oll.co/shark-tank-young-founders';
const META_TITLE = 'Shark Tank India Young Founders Special 2026 — Eligibility, Dates & Info | OLL';
const META_DESC = 'Everything you need to know about the Shark Tank India Season 6 Young Founders Special. Eligibility (ages 6–15), key dates (registrations 12 Oct – 11 Nov 2026), and the official registration route. Information page by OLL — Online Learning Launchpad.';

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
  { q: 'Is OLL affiliated with Shark Tank India?', a: 'No. OLL (Online Learning Launchpad) is sharing this information as a community resource for young founders and their families. "Shark Tank India" and related marks belong to Sony Pictures Networks India / SonyLIV. For authoritative information, refer to the official FAQs and registration page.' },
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

export default function SharkTankYoungFoundersPage() {
  useDocumentMeta();
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="stf-page" data-testid="shark-tank-yf-page">
      <style>{`
        .stf-page { font-family: 'Proxima Nova', 'Montserrat', -apple-system, sans-serif; color: #0A1F44; background: #fff; }
        .stf-hero-bg {
          background: linear-gradient(135deg, #0A1F44 0%, #0E1B3E 45%, #4C1D1D 85%, #7F1D1D 100%);
          position: relative; overflow: hidden;
        }
        .stf-hero-bg::before {
          content: ''; position: absolute; inset: 0;
          background:
            radial-gradient(circle at 15% 20%, rgba(245,158,11,0.18), transparent 55%),
            radial-gradient(circle at 85% 70%, rgba(220,38,38,0.42), transparent 55%);
          pointer-events: none;
        }
        /* Pill nav — same shape as techfest */
        .stf-pillnav { position: sticky; top: 12px; z-index: 60; margin: 0 auto; padding: 12px 12px 0; }
        .stf-pillnav-inner {
          max-width: 1180px; margin: 0 auto;
          background: rgba(255,255,255,0.96);
          -webkit-backdrop-filter: saturate(180%) blur(14px);
          backdrop-filter: saturate(180%) blur(14px);
          border: 1px solid rgba(255,255,255,0.5);
          box-shadow: 0 20px 44px rgba(0,0,0,0.28), 0 2px 6px rgba(0,0,0,0.12);
          border-radius: 999px;
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 10px 8px 18px;
        }
        .stf-pillnav-brands { display: flex; align-items: center; gap: 14px; min-width: 0; }
        .stf-pillnav-brands .divider { width: 1px; height: 36px; background: rgba(10,31,68,0.15); }
        .stf-pillnav-brands img { display: block; height: 40px; width: auto; }
        .stf-pillnav-brands img.stf-yf { height: 48px; }
        .stf-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 10px 18px; border-radius: 999px;
          font-weight: 800; font-size: 0.78rem; letter-spacing: 0.04em; text-transform: uppercase;
          transition: transform 0.2s, box-shadow 0.2s, background 0.2s;
          cursor: pointer; text-decoration: none; border: none;
        }
        .stf-btn.primary { background: #DC2626; color: #fff; box-shadow: 0 12px 22px rgba(220,38,38,0.35); }
        .stf-btn.primary:hover { background: #B91C1C; transform: translateY(-1px); }
        .stf-btn.ghost-dark { background: transparent; color: #0A1F44; border: 1.5px solid rgba(10,31,68,0.28); }
        .stf-btn.ghost-dark:hover { background: #0A1F44; color: #fff; border-color: #0A1F44; }
        .stf-btn.gold { background: #F59E0B; color: #0A1F44; box-shadow: 0 12px 22px rgba(245,158,11,0.4); }
        .stf-btn.gold:hover { background: #D97706; color: #fff; transform: translateY(-1px); }
        .stf-h1 { font-weight: 900; letter-spacing: -0.02em; line-height: 1.04; }
        .stf-eyebrow { font-weight: 800; letter-spacing: 0.22em; text-transform: uppercase; font-size: 0.72rem; }
        .stf-faq-item { border: 1.5px solid #E2E8F0; border-radius: 14px; background: #fff; transition: border-color 0.2s, box-shadow 0.2s; }
        .stf-faq-item.open { border-color: #DC2626; box-shadow: 0 10px 24px -12px rgba(220,38,38,0.35); }
        .stf-faq-q { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 1rem; padding: 1.1rem 1.3rem; background: transparent; border: none; cursor: pointer; text-align: left; font-weight: 700; color: #0A1F44; font-size: 1rem; }
        .stf-faq-a { padding: 0 1.3rem 1.1rem; color: #475569; line-height: 1.6; font-size: 0.95rem; }
        @keyframes stf-pulse { 0%,100% { opacity:1; } 50% { opacity:.5; } }
        @media (max-width: 640px) {
          .stf-pillnav { top: 8px; padding: 8px 8px 0; }
          .stf-pillnav-inner { padding: 6px 6px 6px 10px; }
          .stf-pillnav-brands { gap: 8px; }
          .stf-pillnav-brands img { height: 28px; }
          .stf-pillnav-brands img.stf-yf { height: 34px; }
          .stf-pillnav-brands .divider { height: 24px; }
          .stf-btn { padding: 8px 10px; font-size: 0.65rem; letter-spacing: 0.03em; gap: 4px; }
          .stf-btn .stf-hide-sm { display: none; }
        }
      `}</style>

      {/* ── Hero section with pill nav floating on top ── */}
      <section className="stf-hero-bg">
        <nav className="stf-pillnav" aria-label="Primary navigation" data-testid="stf-pillnav">
          <div className="stf-pillnav-inner">
            <div className="stf-pillnav-brands">
              <Link to="/" aria-label="OLL Home" data-testid="stf-nav-oll">
                <img src={OLL_LOGO} alt="OLL" />
              </Link>
              <span className="divider" aria-hidden="true" />
              <img src={ST_LOGO} alt="Shark Tank India Season 6" />
              <span className="divider" aria-hidden="true" />
              <img className="stf-yf" src={YF_LOGO} alt="Young Founders Special" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/" className="stf-btn ghost-dark" data-testid="stf-nav-home">
                <span className="stf-hide-sm">OLL </span>Home
              </Link>
              <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn primary" data-testid="stf-nav-apply">
                Official<span className="stf-hide-sm"> Site</span> <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </nav>

        <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', padding: '3.5rem 1.5rem 5rem', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 999, color: '#fff', backdropFilter: 'blur(10px)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', animation: 'stf-pulse 2s infinite' }} />
            <span className="stf-eyebrow" style={{ color: 'rgba(255,255,255,0.9)' }}>Informational · External Opportunity</span>
          </div>

          <div style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2.5rem', alignItems: 'center' }}>
            <div>
              <h1 className="stf-h1" style={{ fontSize: 'clamp(2.5rem, 5.5vw, 4.5rem)', color: '#fff', margin: 0 }}>
                Young <span style={{ color: '#F59E0B' }}>Founders</span><br />
                Special — Season 6
              </h1>
              <p style={{ marginTop: '1.25rem', color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', lineHeight: 1.6, maxWidth: 560 }}>
                A quick, no-nonsense guide to the Shark Tank India Young Founders Special — who can apply, important dates, and where to register. We're sharing this because we think young builders deserve to know it exists.
              </p>
              <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn gold" data-testid="stf-hero-apply">
                  Visit the Official Page <ArrowUpRight className="w-4 h-4" />
                </a>
                <a href="#eligibility" className="stf-btn ghost-dark" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Who can apply?
                </a>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {[
                ['AGES', '6 – 15 yrs', '#F59E0B'],
                ['CITIZENSHIP', 'Indian', '#DC2626'],
                ['REGISTRATIONS', '12 Oct – 11 Nov', '#F59E0B'],
                ['APPLICATION FEE', 'Free', '#DC2626'],
              ].map(([k, v, c]) => (
                <div key={k} style={{ padding: 16, background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 14 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.16em', color: c }}>{k}</div>
                  <div style={{ marginTop: 6, fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── What is it ── */}
      <section style={{ padding: '4rem 1.25rem', background: '#fff' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: '#DC2626' }}>About the Initiative</span>
          <h2 className="stf-h1" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginTop: 10 }}>What is the Young Founders Special?</h2>
          <div style={{ marginTop: '1.25rem', color: '#334155', lineHeight: 1.7, fontSize: '1rem' }}>
            <p>Shark Tank India is a business reality show where entrepreneurs present their businesses to a panel of investors — the Sharks. Founders explain what they are building, the problem they solve, their customers, and how they plan to grow. The Sharks evaluate these opportunities and may offer financial support under agreed terms.</p>
            <p style={{ marginTop: 14 }}>The <strong>Young Founders Special for Season 6</strong> brings this entrepreneurial platform to younger aspiring founders. Unlike the assumption that you need years of business experience to pursue entrepreneurship, this initiative welcomes eligible children who have a business idea or an early-stage venture they want to develop.</p>
            <p style={{ marginTop: 14 }}>The opportunity is not limited to children who already operate established companies. According to the official FAQs, applicants can apply with a business idea, including one that is still at the pre-revenue stage.</p>
          </div>
        </div>
      </section>

      {/* ── Who can apply ── */}
      <section id="eligibility" style={{ padding: '4rem 1.25rem', background: 'linear-gradient(180deg, #FEF2F2 0%, #fff 100%)' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: '#DC2626' }}>Eligibility</span>
          <h2 className="stf-h1" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginTop: 10 }}>Who can apply?</h2>
          <p style={{ marginTop: 12, color: '#475569', maxWidth: 620, lineHeight: 1.6 }}>
            Before beginning the application, families should check whether the applicant meets the eligibility requirements listed on the official FAQs.
          </p>
          <img src={INFOGRAPHIC} alt="Eligibility — ages 6–15, Indian citizens, school-going/homeschooled/dropouts, idea-stage, parent registers" style={{ marginTop: 28, width: '100%', borderRadius: 20, border: '1px solid rgba(220,38,38,0.15)', boxShadow: '0 20px 50px -20px rgba(10,31,68,0.3)' }} loading="lazy" />
          <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
            {ELIGIBILITY.map((c, i) => (
              <div key={i} style={{ padding: 20, background: '#fff', borderRadius: 14, border: '1.5px solid #E2E8F0', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: i % 2 ? '#DC2626' : '#F59E0B' }} />
                <div style={{ width: 42, height: 42, borderRadius: 10, background: i % 2 ? 'linear-gradient(135deg, #DC2626, #991B1B)' : 'linear-gradient(135deg, #0A1F44, #1E3A5F)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <c.icon className="w-5 h-5" />
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#DC2626' }}>{c.title}</div>
                <p style={{ marginTop: 6, fontSize: '0.9rem', color: '#475569', lineHeight: 1.55 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Important dates ── */}
      <section style={{ padding: '4rem 1.25rem', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: '#DC2626' }}>Important Info</span>
          <h2 className="stf-h1" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginTop: 10 }}>Dates &amp; details</h2>
          <p style={{ marginTop: 12, color: '#475569', lineHeight: 1.6 }}>
            Registrations opened on <strong style={{color:'#0A1F44'}}>12 October 2026</strong> and are scheduled to close on <strong style={{color:'#0A1F44'}}>11 November 2026</strong>. The selection process runs between <strong>12 October and 23 December 2026</strong>. Organisers reserve the right to change timelines.
          </p>
          <div style={{ marginTop: 24, borderRadius: 16, overflow: 'hidden', border: '1.5px solid #E2E8F0' }}>
            {FACTS.map((f, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '56px 1fr 2fr', alignItems: 'center', padding: '14px 20px', background: i % 2 === 0 ? '#fff' : '#F8FAFC', borderBottom: i < FACTS.length - 1 ? '1px solid #E2E8F0' : 'none' }}>
                <f.icon className="w-5 h-5" style={{ color: i % 3 === 0 ? '#DC2626' : i % 3 === 1 ? '#0A1F44' : '#F59E0B' }} aria-hidden="true" />
                <div style={{ fontWeight: 700, color: '#64748B', fontSize: '0.85rem', letterSpacing: '0.02em' }}>{f.label}</div>
                <div style={{ fontWeight: 700, color: '#0A1F44', fontSize: '0.95rem' }}>{f.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, padding: 16, background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <Info className="w-5 h-5" style={{ color: '#B45309', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#78350F' }}>
              <strong>Important:</strong> Dates and selection timelines may change. Always verify the latest information on the official SonyLIV registration page before applying.
            </p>
          </div>
        </div>
      </section>

      {/* ── FAQ accordion ── */}
      <section style={{ padding: '4rem 1.25rem', background: 'linear-gradient(180deg, #F8FAFC 0%, #fff 100%)' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <span className="stf-eyebrow" style={{ color: '#DC2626' }}>Frequently Asked</span>
          <h2 className="stf-h1" style={{ fontSize: 'clamp(1.75rem, 3.5vw, 2.4rem)', marginTop: 10 }}>Common questions</h2>
          <p style={{ marginTop: 12, color: '#475569', lineHeight: 1.6 }}>
            Based on the official Shark Tank India Season 6 Young Founders Special FAQs (dated 12 October 2026).
          </p>
          <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((f, i) => (
              <div key={i} className={`stf-faq-item ${openFaq === i ? 'open' : ''}`} data-testid={`stf-faq-${i}`}>
                <button className="stf-faq-q" onClick={() => setOpenFaq(openFaq === i ? -1 : i)} aria-expanded={openFaq === i}>
                  <span>{f.q}</span>
                  <ChevronDown className="w-5 h-5" style={{ color: openFaq === i ? '#DC2626' : '#94A3B8', transition: 'transform 0.2s', transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0)' }} />
                </button>
                {openFaq === i && <div className="stf-faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Where to register — Shark Tank themed CTA block ── */}
      <section style={{ padding: '5rem 1.25rem', background: 'linear-gradient(135deg, #0A1F44 0%, #4C1D1D 55%, #DC2626 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 50%, rgba(245,158,11,0.25), transparent 60%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
          <Sparkles className="w-10 h-10" style={{ color: '#F59E0B', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.6rem)', color: '#fff', fontWeight: 900, margin: 0, letterSpacing: '-0.015em' }}>
            Where to register
          </h2>
          <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.9)', lineHeight: 1.65, fontSize: '1.05rem' }}>
            All applications are submitted online through SonyLIV's official registration route. There is no application fee. For any changes to timelines, rules, or eligibility, the official page is the single source of truth.
          </p>
          <a href={OFFICIAL_URL} target="_blank" rel="noopener noreferrer" className="stf-btn gold" style={{ marginTop: 32, padding: '14px 26px', fontSize: '0.9rem' }} data-testid="stf-cta-bottom">
            Open the Official Page <ArrowUpRight className="w-4 h-4" />
          </a>
          <p style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,0.6)', wordBreak: 'break-all' }}>{OFFICIAL_URL}</p>
        </div>
      </section>

      {/* ── Disclaimer ── */}
      <section style={{ padding: '2.5rem 1.25rem', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 820, margin: '0 auto', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.6 }}>
          <strong style={{ color: '#334155' }}>Disclaimer:</strong> OLL (Online Learning Launchpad) is sharing this information as a community resource for young founders and their families. We are not the organiser of this programme. "Shark Tank India", the Shark Tank India Season 6 logo and "Young Founders Special" belong to their respective owners (Sony Pictures Networks India / SonyLIV). Logos are used solely for informational reference. Always refer to the official Shark Tank India Young Founders Special FAQs and registration page for authoritative information. Content on this page is based on the publicly released FAQs dated 12 October 2026 and may be out of date; verify before applying.
        </div>
      </section>
    </div>
  );
}
