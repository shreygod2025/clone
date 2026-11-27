import { RB_SHARED_CSS } from './RbTrustSections';

const SKILLS = [
  { l: 'Drones',           src: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=600&h=800&fit=crop' },
  { l: 'Robotics',         src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/4y2zbq59_Robotics.gif' },
  { l: 'Design Thinking',  src: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=800&fit=crop' },
  { l: 'Coding',           src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/8i8zob06_Pyhton%20.gif' },
  { l: 'Aeromodelling',    src: 'https://customer-assets-v7afamib.emergentagent.net/job_fb8cd4bf-3b7a-429f-a2a5-3e03f993cb50/artifacts/w1wq10h8_image.png' },
  { l: '3D Design',        src: 'https://customer-assets.emergentagent.com/job_2a8df49e-1feb-4d6f-a87f-46645bc0c91f/artifacts/xj8dva2y_3D%20Design.gif' },
  { l: 'Space Technology', src: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=600&h=800&fit=crop' },
];

const SKILLS_CSS = `
  /* Skills auto-scrolling marquee — no visible scrollbar, uneven heights */
  .rb-skills-wrap {
    overflow: hidden;
    padding: 30px 0 40px;
    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
            mask-image: linear-gradient(90deg, transparent 0, #000 30px, #000 calc(100% - 30px), transparent 100%);
  }
  .rb-skills-track {
    display: flex;
    gap: 1rem;
    width: max-content;
    animation: rb-skills-scroll 42s linear infinite;
  }
  .rb-skills-wrap:hover .rb-skills-track { /* keep running on hover — no pause */ }
  @keyframes rb-skills-scroll {
    from { transform: translateX(0); }
    to   { transform: translateX(-50%); }
  }
  .rb-skill-card {
    position: relative;
    flex: 0 0 240px;
    border-radius: 22px;
    overflow: hidden;
    box-shadow: 0 22px 44px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.06) inset;
    transition: transform .4s ease, box-shadow .4s ease;
    background: rgba(255,255,255,0.05);
  }
  .rb-skill-card:hover { transform: translateY(-6px); box-shadow: 0 30px 60px rgba(220,38,38,0.28), 0 0 0 1px rgba(255,255,255,0.1) inset; }
  .rb-skill-card img { display: block; width: 100%; height: 100%; object-fit: cover; }
  .rb-skill-card::after {
    content: '';
    position: absolute; left: 0; right: 0; bottom: 0; height: 55%;
    background: linear-gradient(180deg, transparent 0%, rgba(10,15,40,0.9) 100%);
    pointer-events: none;
  }
  .rb-skill-label {
    position: absolute; left: 18px; right: 18px; bottom: 18px;
    color: #fff;
    font-family: 'Proxima Nova','Montserrat',sans-serif; font-weight: 700;
    font-size: 1.15rem; letter-spacing: -0.005em;
    z-index: 2;
  }
  .rb-skill-card:nth-child(5n+1) { height: 340px; margin-top: 40px; }
  .rb-skill-card:nth-child(5n+2) { height: 420px; margin-top: 0px; }
  .rb-skill-card:nth-child(5n+3) { height: 360px; margin-top: 60px; }
  .rb-skill-card:nth-child(5n+4) { height: 400px; margin-top: 10px; }
  .rb-skill-card:nth-child(5n+5) { height: 340px; margin-top: 50px; }
`;

// "the easiest way to start" skills marquee (Robotics & AI Lab landing). Copy is configurable.
export const RbSkillsCarousel = ({ eyebrow, title, subtitle, testid = 'rb-skills', bg = '#F8FAFC', eyebrowBelow = false }) => (
  <section data-testid={testid} style={{ position: 'relative', padding: '4rem 1.5rem', background: bg, overflow: 'hidden' }}>
    <style>{RB_SHARED_CSS + SKILLS_CSS}</style>
    <div style={{ position: 'relative', maxWidth: 1280, margin: '0 auto', background: '#0A1F44', color: '#fff', borderRadius: '32px', overflow: 'hidden', padding: '3.5rem 0 3rem', boxShadow: '0 30px 80px rgba(10,31,68,0.35)' }}>
      <div className="rb-orb rb-orb-red" style={{ width: 420, height: 420, top: -140, right: -80 }} />
      <div className="rb-orb rb-orb-light" style={{ width: 380, height: 380, bottom: -140, left: -60 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem', padding: '0 1.5rem' }}>
          {!eyebrowBelow && <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem' }}>{eyebrow}</div>}
          <h2 className="rb-h2" style={{ fontSize: 'clamp(2rem, 4.4vw, 3rem)', lineHeight: 1.05, color: '#fff' }}>{title}</h2>
          {eyebrowBelow && <div className="rb-hand" style={{ color: '#FCA5A5', fontSize: '1.5rem', marginTop: '0.6rem' }}>{eyebrow}</div>}
          <p style={{ fontFamily: "'Proxima Nova', 'Montserrat', sans-serif", fontWeight: 300, fontSize: '1rem', maxWidth: 700, margin: '0.9rem auto 0', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6 }}>{subtitle}</p>
        </div>
        <div className="rb-skills-wrap" data-testid={`${testid}-scroll`}>
          <div className="rb-skills-track">
            {[...SKILLS, ...SKILLS].map((s, i) => (
              <div key={`${s.l}-${i}`} className="rb-skill-card" data-testid={i < SKILLS.length ? `rb-skill-${s.l.toLowerCase().replace(/\s+/g, '-')}` : undefined}>
                <img src={s.src} alt={s.l} loading="lazy" />
                <div className="rb-skill-label">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </section>
);
