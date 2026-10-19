import { useEffect, useState } from 'react';
import { School, GraduationCap, MapPin, Play, ChevronLeft, ChevronRight } from 'lucide-react';

// Shared "About OLL" + "Real Schools, Real Results" sections (Robotics & AI Program, Pre-School).
const OLL_LOGO_WHITE =
  'https://customer-assets.emergentagent.com/job_0add39d8-6ba8-4c9a-b97e-1c8e22260bae/artifacts/bnp5i3h5_OLL-horizontal-logo-white.png';

const KBC_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/mkbfftaz_KBC%20Website%20%281%29.png';
const SHARK_TANK_IMG =
  'https://customer-assets.emergentagent.com/job_bd46440b-dd5c-4da0-88ea-ad65b8f91d70/artifacts/1a3c9g9x_KBC%20%26%20Shark%20Tank%20Website.png';

const SHARK_TANK_YT = 'https://www.youtube.com/watch?v=aVzl6yzPPTw';
const KBC_YT        = 'https://www.youtube.com/watch?v=8M3A_InpVKw&t=883s';

// Media house logos — infinite scroll ticker under the Shark Tank / KBC cards
export const MEDIA_LOGOS = [
  { src: '/media-logos/yourstory.svg',       alt: 'YourStory' },
  { src: '/media-logos/sony-tv.svg',         alt: 'Sony Entertainment TV' },
  { src: '/media-logos/hindustan-times.svg', alt: 'Hindustan Times' },
  { src: '/media-logos/times-of-india.svg',  alt: 'The Times of India' },
  { src: '/media-logos/cnbc-tv18.svg',       alt: 'CNBC TV18' },
  { src: '/media-logos/indian-express.svg',  alt: 'The Indian Express' },
  { src: '/media-logos/business-insider.svg', alt: 'Business Insider' },
  { src: '/media-logos/pinkvilla.svg',       alt: 'Pinkvilla' },
];

export const PARTNER_LOGOS = Array.from({ length: 46 }, (_, i) => `/school-logos/${i + 1}.png`);

export const SCHOOL_VIDEOS = [
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


const RB_SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;700&family=Montserrat:wght@300;400;500;600;700;800;900&display=swap');
  .rb-h2, .rb-h3 { font-family: 'Proxima Nova', 'Montserrat', 'Inter', sans-serif; font-weight: 300; letter-spacing: -0.01em; text-transform: none; }
  .rb-num { font-family: 'Proxima Nova', 'Montserrat', sans-serif; font-weight: 700; letter-spacing: -0.02em; }
  .rb-hand { font-family: 'Caveat', cursive; }
  .rb-serif { font-family: 'Libre Baskerville', Georgia, serif; }
  .rb-stroke { background-image: linear-gradient(90deg, #DC2626, #1E3A8A); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .rb-media-caption { position: absolute; bottom: 20px; left: 22px; right: 22px; padding-right: 118px; }
  .rb-media-caption .rb-media-title { font-size: 1.35rem; }
  .rb-media-caption .rb-media-sub { font-size: 0.85rem; }
  @media (max-width: 640px) {
    .rb-media-caption { left: 16px; right: 16px; bottom: 14px; padding-right: 100px; }
    .rb-media-caption .rb-media-title { font-size: 1.1rem; }
    .rb-media-caption .rb-media-sub { font-size: 0.75rem; }
    .rb-watch-pill { bottom: 14px !important; right: 14px !important; padding: 7px 12px !important; font-size: 0.68rem !important; letter-spacing: 0.14em !important; }
  }
  .rb-orb { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
  .rb-orb-red { background: rgba(220,38,38,0.5); }
  .rb-orb-light { background: rgba(96,165,250,0.5); }
  .rb-skills-wrap { overflow: hidden; padding: 30px 0 40px; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%); mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%); }
  .rb-skills-track { display: flex; gap: 1rem; width: max-content; animation: rb-skills-scroll 42s linear infinite; }
  @keyframes rb-skills-scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;

export const RbAboutOLL = () => (
  <>
    <style>{RB_SHARED_CSS}</style>
    {/* ═══════════ 08 — ABOUT OLL (Shark Tank / KBC + Trust Stats) ═══════════ */}
    <section data-testid="rb-about-oll" style={{ position: 'relative', padding: '5rem 1.25rem', background: 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)', color: '#fff', overflow: 'hidden' }}>
      <div className="rb-orb rb-orb-red"   style={{ width: 420, height: 420, top: -140, left: '10%' }} />
      <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, right: '10%' }} />

      <div style={{ position: 'relative', maxWidth: 1180, margin: '0 auto', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.8rem' }}>about us</div>
          <img src={OLL_LOGO_WHITE} alt="OLL" style={{ height: 90, margin: '1rem auto 1.5rem', display: 'block' }} data-testid="rb-oll-logo-big" />
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05 }}>
            Trusted by schools <span style={{ color: '#FCA5A5' }}>across India.</span>
          </h2>

          {/* Quick stat pills — school / student / city counts */}
          <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>
            {[
              { i: School,        k: '500+',      l: 'Schools',  c: '#DC2626' },
              { i: GraduationCap, k: '2,00,000+', l: 'Students', c: '#60A5FA' },
              { i: MapPin,        k: '35',        l: 'Cities',   c: '#FBBF24' },
            ].map((s) => (
              <div key={s.l} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', padding: '0.65rem 1.1rem', borderRadius: 999, backdropFilter: 'blur(8px)' }}>
                <s.i size={20} style={{ color: s.c }} />
                <span className="rb-num" style={{ fontSize: '1.25rem', color: '#fff' }}>{s.k}</span>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* Team card row */}
          <div style={{ marginTop: '3rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '1.5rem', padding: '2rem 1.5rem', backdropFilter: 'blur(10px)' }} data-testid="rb-team">
            <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.2rem', marginBottom: '0.35rem' }}>meet the team</div>
            <h3 className="rb-h3" style={{ fontSize: '1.5rem', color: '#fff', fontWeight: 600, marginBottom: '1.5rem' }}>The people behind OLL.</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                { name: 'Shreyaan Daga',     role: 'Founder & CEO',          bio: 'Youngest on Shark Tank India, on the Hot Seat of KBC.',            img: '/team/shreyaan.png?v=2' },
                { name: 'Vidushi Daga',      role: 'Chairperson · OLL',      bio: '15+ years in education. Taught over 5 lakh kids across India.',    img: '/team/vidushi.png?v=2' },
                { name: 'Amit Modi',         role: 'IIT Bombay Alumni',      bio: '10+ years in Robotics education for kids across India.',           img: '/team/amit.png?v=2' },
                { name: 'Heather Andersson', role: 'President · UNESCO WGF', bio: '15+ years in education. President, UNESCO World Genesis Foundation.', img: '/team/heather.png?v=2' },
              ].map((m) => (
                <div key={m.name} style={{ textAlign: 'center', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif" }}>
                  <div style={{ width: 140, height: 140, borderRadius: '50%', margin: '0 auto', overflow: 'hidden', background: '#FFFFFF', border: '3px solid #FBBF24', boxShadow: '0 20px 40px rgba(0,0,0,0.35), 0 0 0 6px rgba(251,191,36,0.18)' }}>
                    <img src={m.img} alt={m.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ marginTop: '1rem', fontSize: '1.05rem', color: '#fff', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase' }}>{m.name}</div>
                  <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: '#FCA5A5', fontWeight: 600 }}>{m.role}</div>
                  <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.78)', fontWeight: 300, lineHeight: 1.5 }}>{m.bio}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* As seen on */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
          <a
            href={KBC_YT}
            target="_blank"
            rel="noreferrer"
            data-testid="rb-media-kbc"
            style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', display: 'block', transition: 'transform 0.3s ease, box-shadow 0.3s ease', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'; }}
          >
            <img src={KBC_IMG} alt="Kaun Banega Crorepati" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
            <div className="rb-watch-pill" data-testid="rb-kbc-watch-pill" style={{ position: 'absolute', bottom: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.55)' }}>
              <Play size={13} fill="#fff" strokeWidth={0} /> Watch
            </div>
            <div className="rb-media-caption">
              <div style={{ fontSize: '0.7rem', color: '#FCA5A5', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony · KBC</div>
              <div className="rb-h3 rb-media-title" style={{ marginTop: 4 }}>Kaun Banega Crorepati</div>
              <div className="rb-media-sub" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Featured as India&apos;s leading EdTech for kids</div>
            </div>
          </a>

          <a
            href={SHARK_TANK_YT}
            target="_blank"
            rel="noreferrer"
            data-testid="rb-media-shark-tank"
            style={{ position: 'relative', borderRadius: '1.25rem', overflow: 'hidden', height: 260, border: '1px solid rgba(255,255,255,0.15)', textDecoration: 'none', display: 'block', transition: 'transform 0.3s ease, box-shadow 0.3s ease', boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 30px 60px rgba(0,0,0,0.45)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 20px 40px rgba(0,0,0,0.3)'; }}
          >
            <img src={SHARK_TANK_IMG} alt="Shark Tank India" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 40%, rgba(10,31,68,0.92) 100%)' }} />
            <div className="rb-watch-pill" data-testid="rb-shark-tank-watch-pill" style={{ position: 'absolute', bottom: 18, right: 18, display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 999, background: 'linear-gradient(180deg, #EF4444 0%, #B91C1C 100%)', color: '#fff', fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.78rem', fontWeight: 900, letterSpacing: '0.18em', textTransform: 'uppercase', boxShadow: '0 14px 28px rgba(220,38,38,0.5), inset 0 1px 0 rgba(255,255,255,0.35)', border: '2px solid rgba(255,255,255,0.55)' }}>
              <Play size={13} fill="#fff" strokeWidth={0} /> Watch
            </div>
            <div className="rb-media-caption">
              <div style={{ fontSize: '0.7rem', color: '#60A5FA', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>Sony LIV · Season Finale</div>
              <div className="rb-h3 rb-media-title" style={{ marginTop: 4 }}>Shark Tank India</div>
              <div className="rb-media-sub" style={{ color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>Pitched to India&apos;s top investors on national TV</div>
            </div>
          </a>
        </div>

        {/* ── Media houses infinite scroll ticker ─────────────────── */}
        <div data-testid="rb-media-logos" style={{ marginBottom: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
            <span style={{ fontFamily: "'Proxima Nova','Montserrat',sans-serif", fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: 'rgba(252,165,165,0.85)' }}>
              // Also covered by
            </span>
          </div>
          <style>{`
            @keyframes rb-logo-scroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .rb-logos-wrap { position: relative; overflow: hidden; padding: 8px 0; mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent); }
            .rb-logos-track { display: inline-flex; gap: 3.25rem; padding: 0 1.5rem; align-items: center; animation: rb-logo-scroll 38s linear infinite; will-change: transform; width: max-content; }
            .rb-logos-track:hover { animation-play-state: paused; }
            .rb-logo-item { flex-shrink: 0; height: 44px; display: inline-flex; align-items: center; justify-content: center; opacity: 0.88; filter: brightness(0) invert(1); transition: opacity 0.25s ease, filter 0.25s ease, transform 0.25s ease; }
            .rb-logo-item img { max-height: 44px; max-width: 170px; height: auto; width: auto; display: block; object-fit: contain; }
            .rb-logo-item:hover { opacity: 1; filter: none; transform: scale(1.06); }
          `}</style>
          <div className="rb-logos-wrap">
            <div className="rb-logos-track">
              {[...MEDIA_LOGOS, ...MEDIA_LOGOS].map((l, i) => (
                <div key={`${l.alt}-${i}`} className="rb-logo-item" data-testid={i < MEDIA_LOGOS.length ? `rb-media-logo-${i}` : undefined}>
                  <img src={l.src} alt={l.alt} loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trust stats + principal testimonials removed per request */}
      </div>
    </section>
  </>
);

export const RbRealSchools = () => {
  const [schoolsIdx, setSchoolsIdx] = useState(0);
  useEffect(() => {
    const s = setInterval(() => setSchoolsIdx((i) => (i + 1) % SCHOOL_VIDEOS.length), 5500);
    return () => clearInterval(s);
  }, []);
  const goSchools = (i) => setSchoolsIdx((i + SCHOOL_VIDEOS.length) % SCHOOL_VIDEOS.length);
  return (
    <>
      <style>{RB_SHARED_CSS}</style>
      {/* ═══════════ 08B — REAL SCHOOLS, REAL RESULTS ═══════════ */}
      <section data-testid="rb-real-schools" style={{ position: 'relative', padding: '5rem 1.25rem 3rem', background: '#F8FAFC', overflow: 'hidden' }}>
        <div style={{ position: 'relative', maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="rb-hand" style={{ color: '#DC2626', fontSize: '1.6rem' }}>proof, not promises</div>
            <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#0A1F44' }}>
              Real Schools, <span className="rb-stroke">Real Results.</span>
            </h2>
            <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 640, margin: '0.9rem auto 0', color: '#475569', lineHeight: 1.6 }}>
              Real classrooms. Real projects. Real principals telling the story in their own words.
            </p>
          </div>

          {/* Autoplay YouTube video carousel with arrow navigation */}
          <div className="rb-rs-carousel" data-testid="rb-real-schools-carousel">
            <div className="rb-rs-viewport">
              <div
                className="rb-rs-track"
                style={{ transform: `translateX(calc(-${schoolsIdx} * (100% / 3) - ${schoolsIdx * 1}rem))` }}
              >
                {SCHOOL_VIDEOS.map((v, i) => (
                  <a
                    key={`rs-${v.id}`}
                    href={`https://youtu.be/${v.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`rb-rs-card ${i === schoolsIdx ? 'is-active' : ''}`}
                    data-testid={`rb-real-schools-video-${v.id}`}
                  >
                    <div className="rb-rs-thumb">
                      <img src={`https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`} alt={v.name} loading="lazy" />
                      <div className="rb-rs-play"><Play size={26} fill="#fff" strokeWidth={0} /></div>
                    </div>
                    <div className="rb-rs-meta">
                      <div className="rb-rs-name">{v.name}</div>
                      <div className="rb-rs-hint">Watch the story →</div>
                    </div>
                  </a>
                ))}
              </div>
            </div>

            {/* Arrow controls */}
            <button
              className="rb-rs-arrow rb-rs-arrow-prev"
              onClick={() => goSchools(schoolsIdx - 1)}
              aria-label="Previous school video"
              data-testid="rb-real-schools-prev"
              type="button"
            >
              <ChevronLeft size={26} />
            </button>
            <button
              className="rb-rs-arrow rb-rs-arrow-next"
              onClick={() => goSchools(schoolsIdx + 1)}
              aria-label="Next school video"
              data-testid="rb-real-schools-next"
              type="button"
            >
              <ChevronRight size={26} />
            </button>

            {/* Dots */}
            <div className="rb-rs-dots">
              {SCHOOL_VIDEOS.map((_, i) => (
                <button
                  key={`rs-dot-${i}`}
                  onClick={() => goSchools(i)}
                  aria-label={`Go to school ${i + 1}`}
                  data-testid={`rb-real-schools-dot-${i}`}
                  className={`rb-rs-dot ${i === schoolsIdx ? 'is-active' : ''}`}
                  type="button"
                />
              ))}
            </div>
          </div>

          {/* Rolling logo bar */}
          <div style={{ marginTop: '3rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1rem', fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8' }}>
              A few of our partner schools
            </div>
            <div className="rb-skills-wrap" style={{ padding: '10px 0' }}>
              <div className="rb-skills-track" style={{ gap: '2rem', animationDuration: '55s', alignItems: 'center' }}>
                {[...PARTNER_LOGOS, ...PARTNER_LOGOS].map((src, i) => (
                  <div key={i} style={{ minWidth: 150, height: 90, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', boxShadow: '0 4px 12px rgba(15,30,80,0.05)' }}>
                    <img src={src} alt="Partner school" loading="lazy" style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .rb-rs-carousel { position: relative; padding: 0 clamp(1rem, 4vw, 3.5rem); }
          .rb-rs-viewport { overflow: hidden; border-radius: 1.25rem; }
          .rb-rs-track { display: flex; gap: 1rem; transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; }
          .rb-rs-card { flex: 0 0 calc((100% - 2rem) / 3); position: relative; border-radius: 1rem; overflow: hidden; text-decoration: none; background: #0A1F44; transition: transform 0.35s ease, box-shadow 0.35s ease; box-shadow: 0 12px 30px rgba(15,30,80,0.08); }
          .rb-rs-card.is-active { transform: scale(1.02); box-shadow: 0 24px 50px rgba(220,38,38,0.22); }
          .rb-rs-card:hover { transform: translateY(-4px) scale(1.02); box-shadow: 0 24px 50px rgba(220,38,38,0.28); }
          .rb-rs-thumb { position: relative; aspect-ratio: 16 / 10; overflow: hidden; }
          .rb-rs-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .rb-rs-thumb::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(10,31,68,0.05) 0%, rgba(10,31,68,0.8) 100%); }
          .rb-rs-play { position: absolute; inset: 0; margin: auto; width: 64px; height: 64px; z-index: 2; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #DC2626; color: #fff; border: 3px solid rgba(255,255,255,0.85); box-shadow: 0 14px 30px rgba(220,38,38,0.5); }
          .rb-rs-play svg { margin-left: 4px; }
          .rb-rs-meta { padding: 0.9rem 1.1rem 1rem; color: #fff; font-family: 'Proxima Nova', 'Montserrat', sans-serif; }
          .rb-rs-name { font-size: 1rem; font-weight: 700; line-height: 1.25; }
          .rb-rs-hint { font-size: 0.72rem; color: #FCA5A5; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; margin-top: 5px; }
          .rb-rs-arrow { position: absolute; top: 40%; transform: translateY(-50%); width: 46px; height: 46px; border-radius: 50%; border: 1px solid #E2E8F0; background: #FFFFFF; color: #0A1F44; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 12px 28px rgba(15,30,80,0.12); z-index: 3; transition: all 0.25s ease; }
          .rb-rs-arrow:hover { background: #DC2626; color: #fff; border-color: #DC2626; transform: translateY(-50%) scale(1.06); box-shadow: 0 18px 32px rgba(220,38,38,0.35); }
          .rb-rs-arrow-prev { left: 0; }
          .rb-rs-arrow-next { right: 0; }
          .rb-rs-dots { display: flex; justify-content: center; gap: 6px; margin-top: 1.5rem; flex-wrap: wrap; }
          .rb-rs-dot { width: 8px; height: 8px; border-radius: 999px; border: none; background: rgba(15,30,80,0.2); cursor: pointer; transition: all 0.25s ease; padding: 0; }
          .rb-rs-dot.is-active { width: 22px; background: #DC2626; }
          @media (max-width: 900px) { .rb-rs-card { flex: 0 0 calc((100% - 1rem) / 2); } .rb-rs-track { transform: translateX(calc(-${schoolsIdx} * 50% - ${schoolsIdx} * 0.5rem)) !important; } }
          @media (max-width: 600px) { .rb-rs-card { flex: 0 0 100%; } .rb-rs-track { transform: translateX(calc(-${schoolsIdx} * 100%)) !important; } .rb-rs-arrow { width: 40px; height: 40px; } }
        `}</style>
      </section>
    </>
  );
};
