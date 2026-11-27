/**
 * SchoolRelatedPrograms — cross-linking module rendered near the bottom of
 * every school landing page. Serves two jobs at once:
 *
 *  1. SEO internal-linking / topical authority — Google sees each landing
 *     page pointing to its siblings with keyword-rich anchor text, tying
 *     the four pages into one strong "school programs" hub.
 *  2. User next-step — a principal reading the CBSE CT&AI page might also
 *     need the Robotics kit, so we surface the other three programs as
 *     tap-and-go cards instead of forcing them back to the homepage.
 */
import { ArrowUpRight } from 'lucide-react';

const ALL_PROGRAMS = {
  'cbse-ct-ai': {
    href: '/school/cs/cbse-computational-thinking-ai-books-activities-for-classes-3-to-8',
    title: 'CBSE Computational Thinking & AI',
    tag: 'CBSE · Classes 3-8',
    body: 'Books, Virtual Lab and Teacher LMS — mapped to CBSE Circular Acad-15/2026 (NEP 2020).',
    color: '#0EA5E9',
  },
  'future-skills-icse': {
    href: '/school/icse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8',
    title: 'ICSE Future Skills (4-in-1)',
    tag: 'ICSE · Classes 1-8',
    body: 'ICT + Coding + AI + Robotics under one curriculum, one book, one weekly period.',
    color: '#8B5CF6',
  },
  'future-skills-cbse': {
    href: '/school/cbse-ict-robotics-ai-and-coding-curriculum-with-practical-activity-books-for-class-1-to-8',
    title: 'CBSE Future Skills (4-in-1)',
    tag: 'CBSE · Classes 1-8',
    body: 'ICT + Coding + AI + Robotics under one curriculum, one book, one weekly period.',
    color: '#F59E0B',
  },
  'robotics-icse-9-10': {
    href: '/school/icse-robotics-and-ai-curriculum-books-with-practical-activity-kits-for-class-9th-and10th',
    title: 'ICSE Robotics & AI Kits · Class 9 & 10',
    tag: 'ICSE · Group 3 · Code 66',
    body: 'STEM.org-accredited kit + Grade 9 & 10 textbooks — 30+ hands-on activities.',
    color: '#DC2626',
  },
  'robotics-beginner': {
    href: '/school/robotics-ai-lab-for-schools-turnkey-solution/',
    title: 'AI & Robotics Lab for Schools',
    tag: 'CBSE · ICSE · State · Grades 1-8',
    body: 'Turnkey Robotics & AI Lab — curriculum, kits, teacher training, STEM.org accreditation. Aligned with NEP 2020 & NCF 2023.',
    color: '#10B981',
  },
  'advance-robotics': {
    href: '/school/advance-robotics-and-ai-curriculum-books-with-kits-for-grades-3-to-10',
    title: 'Advance Robotics & AI Program · Grades 3–10',
    tag: 'Motion · Sensors · Arduino · IoT',
    body: 'Complete Grade 3–10 curriculum with snap-fit parts, smart coding hubs, sensors, microcontrollers & Voice AI.',
    color: '#D63031',
  },
  'composite-skill-lab': {
    href: '/school/composite-skill-lab-cbse-skill-education-grades-6-to-10',
    title: 'Composite Skill Lab (CSL) · Grades 6–10',
    tag: 'CBSE Skill-75/2024 · NEP 2020',
    body: 'Turnkey 110-hr multi-skill lab: Life Forms, Machines & Materials, Human Services & Kaushal Bodh.',
    color: '#16A34A',
  },
  'after-school-club': {
    href: '/school/after-school-robo-club-robotics-ai-stem-learning-center',
    title: 'After-School Robo Club · Ages 3–16',
    tag: 'In-School Innovation & Revenue Hub',
    body: 'Turnkey Robotics, AI, Coding & 3D Printing center. Monetize space, prepare for IIT Bombay Finale.',
    color: '#DC2626',
  },
  'entrepreneurship-bootcamp': {
    href: '/school/entrepreneurship-and-financial-literacy-bootcamp-for-schools',
    title: 'Entrepreneurship & Financial Literacy Bootcamp',
    tag: 'Ages 3–16 · Real Money & Venture Skills',
    body: 'Hands-on mock banks, simulations, product prototyping & startup pitches. Founded by Shark Tank prodigy.',
    color: '#D97706',
  },
};

export default function SchoolRelatedPrograms({ current, theme = 'light', testid = 'school-related-programs' }) {
  const items = Object.entries(ALL_PROGRAMS)
    .filter(([key]) => key !== current)
    .map(([key, val]) => ({ key, ...val }));

  const isDark = theme === 'dark';
  const bg = isDark ? 'linear-gradient(180deg, #0A1F44 0%, #10193A 100%)' : '#F8FAFC';
  const headingColor = isDark ? '#fff' : '#0A1F44';
  const scriptColor = isDark ? '#FCA5A5' : '#DC2626';
  const bodyColor = isDark ? 'rgba(255,255,255,0.75)' : '#475569';
  const cardBg = isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const cardBorder = isDark ? '1px solid rgba(255,255,255,0.14)' : '1px solid #E2E8F0';
  const cardText = isDark ? '#fff' : '#0A1F44';

  return (
    <section data-testid={testid} aria-labelledby={`${testid}-heading`}
      style={{ position: 'relative', padding: '4rem 1.25rem', background: bg, overflow: 'hidden' }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: "'Caveat', cursive", fontWeight: 700, color: scriptColor, fontSize: '1.6rem' }}>
            explore related programs
          </div>
          <h2 id={`${testid}-heading`}
            style={{
              fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif",
              fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.05,
              fontSize: 'clamp(1.7rem, 4vw, 2.6rem)', color: headingColor, margin: '0.4rem 0 0',
            }}>
            More OLL programs for schools
          </h2>
          <p style={{
            fontFamily: "'Proxima Nova', system-ui, sans-serif", fontWeight: 400, fontSize: '1rem',
            maxWidth: 620, margin: '0.9rem auto 0', color: bodyColor, lineHeight: 1.6,
          }}>
            One partner for every board, every grade — from Grade 1 Robotics to CBSE CT &amp; AI to ICSE Group 3.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {items.map((it) => (
            <a key={it.key} href={it.href} data-testid={`${testid}-card-${it.key}`}
              style={{
                position: 'relative', display: 'block', textDecoration: 'none',
                background: cardBg, border: cardBorder, borderRadius: 20,
                padding: '1.4rem 1.3rem 1.3rem', color: cardText,
                boxShadow: isDark ? '0 12px 28px rgba(0,0,0,0.28)' : '0 8px 24px rgba(10,31,68,0.06)',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = isDark ? '0 22px 44px rgba(0,0,0,0.42)' : '0 18px 40px rgba(10,31,68,0.12)';
                e.currentTarget.style.borderColor = it.color;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = isDark ? '0 12px 28px rgba(0,0,0,0.28)' : '0 8px 24px rgba(10,31,68,0.06)';
                e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.14)' : '#E2E8F0';
              }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 10px', borderRadius: 999,
                  background: `${it.color}1A`, color: it.color, border: `1px solid ${it.color}55`,
                  fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase',
                }}>
                  {it.tag}
                </span>
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: `${it.color}14`, color: it.color,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <ArrowUpRight size={16} />
                </div>
              </div>
              <div style={{
                marginTop: '0.9rem',
                fontFamily: "'Proxima Nova', 'Montserrat', system-ui, sans-serif",
                fontWeight: 600, fontSize: '1.05rem', lineHeight: 1.25,
                letterSpacing: '-0.005em',
              }}>
                {it.title}
              </div>
              <div style={{
                marginTop: '0.5rem', fontSize: '0.85rem', color: bodyColor, lineHeight: 1.55, fontWeight: 400,
              }}>
                {it.body}
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
